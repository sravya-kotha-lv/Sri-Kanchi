const AppError = require("../common/errors/app-error");
const TransactionalService = require("../common/services/transactional-service");
const { sendOrderConfirmationMail } = require("../common/utils/order-mail");

class OrderService extends TransactionalService {
  constructor({ model, db }) {
    super(db);
    this.model = model;
    this.db = db;
  }

  generateOrderNumber(userId) {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${userId}-${timestamp}-${random}`;
  }

  mapOrderItem(item) {
    return {
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
      created_at: item.created_at,
    };
  }

  buildOrderResponse(order, items = []) {
    return {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      subtotal: Number(order.subtotal),
      delivery_charge: Number(order.delivery_charge),
      total_amount: Number(order.total_amount),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      items: items.map((item) => this.mapOrderItem(item)),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }

  async placeOrder(actor, payload) {
    let orderForMail = null;

    const orderData = await this.withTransaction(async (executor) => {
      const user = await this.model.findUserById(actor.userId, executor);

      if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }

      const cart = await this.model.getOrCreateCart(actor, executor);
      const cartItems = await this.model.listCartItems(cart.id, executor);

      if (!cartItems.length) {
        throw new AppError("Cart is empty", 400, "CART_EMPTY");
      }

      for (const item of cartItems) {
        if (item.status !== "active") {
          throw new AppError(
            `${item.product_name} is not available for order`,
            400,
            "PRODUCT_NOT_ACTIVE"
          );
        }

        if (!item.category_is_active) {
          throw new AppError(
            `${item.product_name} category is not available for order`,
            400,
            "CATEGORY_NOT_ACTIVE"
          );
        }

        if (Number(item.stock) < Number(item.quantity)) {
          throw new AppError(
            `${item.product_name} does not have enough stock`,
            400,
            "INSUFFICIENT_STOCK"
          );
        }
      }

      const subtotal = cartItems.reduce(
        (sum, item) => sum + Number(item.line_total || 0),
        0
      );

      const deliveryCharge = 0;
      const totalAmount = subtotal + deliveryCharge;

      const order = await this.model.createOrder(
        {
          order_number: this.generateOrderNumber(actor.userId),
          user_id: actor.userId,
          customer_name: payload.customer_name,
          customer_email: user.email,
          customer_phone: payload.customer_phone || user.phone || null,
          shipping_address: payload.shipping_address,
          subtotal: subtotal.toFixed(2),
          delivery_charge: deliveryCharge.toFixed(2),
          total_amount: totalAmount.toFixed(2),
          payment_method: "cash_on_delivery",
          payment_status: "pending",
          order_status: "placed",
        },
        executor
      );

      const orderItemsPayload = cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price).toFixed(2),
        line_total: Number(item.line_total).toFixed(2),
      }));

      const orderItems = await this.model.createOrderItems(
        order.id,
        orderItemsPayload,
        executor
      );

      for (const item of cartItems) {
        const updatedProduct = await this.model.reduceProductStock(
          item.product_id,
          item.quantity,
          executor
        );

        if (!updatedProduct) {
          throw new AppError(
            `${item.product_name} does not have enough stock`,
            400,
            "INSUFFICIENT_STOCK"
          );
        }

        await this.model.syncInventoryStock(
          item.product_id,
          Number(updatedProduct.stock),
          executor
        );
      }

      await this.model.clearCart(cart.id, executor);

      orderForMail = this.buildOrderResponse(order, orderItems);
      return orderForMail;
    });

    try {
      await sendOrderConfirmationMail({
        to: orderData.customer_email,
        order: orderData,
      });
    } catch (error) {
      // Email failure should not fail the order creation
      console.error("Order confirmation email failed:", error.message);
    }

    return orderData;
  }

  async getOrders(userId) {
    const orders = await this.model.listOrdersByUserId(userId, this.db);

    if (!orders.length) {
      return [];
    }

    const orderIds = orders.map((order) => order.id);
    const items = await this.model.listOrderItemsByOrderIds(orderIds, this.db);

    const itemsMap = items.reduce((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    return orders.map((order) =>
      this.buildOrderResponse(order, itemsMap[order.id] || [])
    );
  }

  async getOrderById(userId, orderId) {
    const order = await this.model.findOrderByIdAndUserId(orderId, userId, this.db);

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    const items = await this.model.listOrderItems(order.id, this.db);
    return this.buildOrderResponse(order, items);
  }


  async cancelOrder(userId, orderId) {
    return this.withTransaction(async (executor) => {
      const order = await this.model.findOrderByIdAndUserId(
        orderId,
        userId,
        executor
      );

      if (!order) {
        throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
      }

      if (order.order_status === "cancelled") {
        throw new AppError(
          "Order is already cancelled",
          400,
          "ORDER_ALREADY_CANCELLED"
        );
      }

      const cancellableStatuses = ["placed", "pending", "processing"];

      if (!cancellableStatuses.includes(order.order_status)) {
        throw new AppError(
          "This order cannot be cancelled now",
          400,
          "ORDER_NOT_CANCELLABLE"
        );
      }

      const items = await this.model.listOrderItems(order.id, executor);

      for (const item of items) {
        const updatedProduct = await this.model.increaseProductStock(
          item.product_id,
          item.quantity,
          executor
        );

        if (updatedProduct) {
          await this.model.syncInventoryStock(
            item.product_id,
            Number(updatedProduct.stock),
            executor
          );
        }
      }

      const updatedOrder = await this.model.updateOrderStatus(
        order.id,
        "cancelled",
        executor
      );

      return this.buildOrderResponse(updatedOrder, items);
    });
  }




  async getAdminOrders(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    status: query.status,
    paymentStatus: query.payment_status,
    search: query.search,
    limit,
    offset,
  };

  const orders = await this.model.listAdminOrders(filters, this.db);
  const total = await this.model.countAdminOrders(filters, this.db);

  const orderIds = orders.map((order) => order.id);
  const items = await this.model.listOrderItemsByOrderIds(orderIds, this.db);

  const itemsMap = items.reduce((acc, item) => {
    if (!acc[item.order_id]) acc[item.order_id] = [];
    acc[item.order_id].push(item);
    return acc;
  }, {});

  return {
    orders: orders.map((order) =>
      this.buildOrderResponse(order, itemsMap[order.id] || [])
    ),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

async getAdminOrderSummary() {
  const summary = await this.model.getAdminOrderSummary(this.db);

  return {
    total_orders: Number(summary.total_orders || 0),
    placed_orders: Number(summary.placed_orders || 0),
    processing_orders: Number(summary.processing_orders || 0),
    shipped_orders: Number(summary.shipped_orders || 0),
    delivered_orders: Number(summary.delivered_orders || 0),
    cancelled_orders: Number(summary.cancelled_orders || 0),
    total_revenue: Number(summary.total_revenue || 0),
  };
}

async getAdminOrderById(orderId) {
  const order = await this.model.findOrderByIdForAdmin(orderId, this.db);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  const items = await this.model.listOrderItems(order.id, this.db);
  return this.buildOrderResponse(order, items);
}


}

module.exports = {
  OrderService,
};
