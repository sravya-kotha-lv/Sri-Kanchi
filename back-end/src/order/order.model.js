class OrderModel {
  constructor(db) {
    this.db = db;
  }

  async findUserById(userId, executor = this.db) {
    const query = `
      SELECT id, name, email, phone
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [userId]);
    return rows[0] || null;
  }

  async findCartByUserId(userId, executor = this.db) {
    const query = `
      SELECT id, user_id, guest_token, created_at, updated_at
      FROM carts
      WHERE user_id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [userId]);
    return rows[0] || null;
  }

  async findCartByGuestToken(guestToken, executor = this.db) {
    if (!guestToken) {
      return null;
    }

    const query = `
      SELECT id, user_id, guest_token, created_at, updated_at
      FROM carts
      WHERE guest_token = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [guestToken]);
    return rows[0] || null;
  }

  async createCart(actor, executor = this.db) {
    const query = `
      INSERT INTO carts (user_id, guest_token, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id, user_id, guest_token, created_at, updated_at
    `;
    const { rows } = await executor.query(query, [actor.userId, null]);
    return rows[0];
  }

  async getCartById(cartId, executor = this.db) {
    const query = `
      SELECT id, user_id, guest_token, created_at, updated_at
      FROM carts
      WHERE id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [cartId]);
    return rows[0] || null;
  }

  async attachGuestCartToUser(cartId, userId, executor = this.db) {
    const query = `
      UPDATE carts
      SET user_id = $2, guest_token = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, guest_token, created_at, updated_at
    `;
    const { rows } = await executor.query(query, [cartId, userId]);
    return rows[0] || null;
  }

  async mergeCartItems(targetCartId, sourceCartId, executor = this.db) {
    const query = `
      INSERT INTO cart_items (cart_id, product_id, quantity, unit_price, created_at, updated_at)
      SELECT $1, product_id, quantity, unit_price, NOW(), NOW()
      FROM cart_items
      WHERE cart_id = $2
      ON CONFLICT (cart_id, product_id)
      DO UPDATE SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        updated_at = NOW()
    `;
    await executor.query(query, [targetCartId, sourceCartId]);
  }

  async deleteCart(cartId, executor = this.db) {
    await executor.query(`DELETE FROM carts WHERE id = $1`, [cartId]);
  }

  async getOrCreateCart(actor, executor = this.db) {
    let userCart = await this.findCartByUserId(actor.userId, executor);
    const guestCart = await this.findCartByGuestToken(actor.guestToken, executor);

    if (guestCart && guestCart.id !== userCart?.id) {
      if (!userCart) {
        return this.attachGuestCartToUser(guestCart.id, actor.userId, executor);
      }

      await this.mergeCartItems(userCart.id, guestCart.id, executor);
      await this.deleteCart(guestCart.id, executor);
      userCart = await this.getCartById(userCart.id, executor);
    }

    if (userCart) {
      return userCart;
    }

    return this.createCart(actor, executor);
  }

  async listCartItems(cartId, executor = this.db) {
    const query = `
      SELECT
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.unit_price,
        (ci.quantity * ci.unit_price)::numeric(10, 2) AS line_total,
        p.name AS product_name,
        p.slug,
        p.sku AS product_sku,
        p.stock,
        p.status,
        c.is_active AS category_is_active
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE ci.cart_id = $1
      ORDER BY ci.updated_at DESC, ci.id DESC
    `;
    const { rows } = await executor.query(query, [cartId]);
    return rows;
  }

  async createOrder(payload, executor = this.db) {
    const query = `
      INSERT INTO orders (
        order_number,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        subtotal,
        delivery_charge,
        total_amount,
        payment_method,
        payment_status,
        order_status,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      )
      RETURNING *
    `;
    const values = [
      payload.order_number,
      payload.user_id,
      payload.customer_name,
      payload.customer_email,
      payload.customer_phone,
      payload.shipping_address,
      payload.subtotal,
      payload.delivery_charge,
      payload.total_amount,
      payload.payment_method,
      payload.payment_status,
      payload.order_status,
    ];
    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async createOrderItems(orderId, items, executor = this.db) {
    if (!items.length) return [];

    const valueParts = [];
    const values = [];

    items.forEach((item, index) => {
      const base = index * 7;
      valueParts.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, NOW())`
      );
      values.push(
        orderId,
        item.product_id,
        item.product_name,
        item.product_sku,
        item.quantity,
        item.unit_price,
        item.line_total
      );
    });

    const query = `
      INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        line_total,
        created_at
      )
      VALUES ${valueParts.join(", ")}
      RETURNING *
    `;

    const { rows } = await executor.query(query, values);
    return rows;
  }

  async reduceProductStock(productId, quantity, executor = this.db) {
    const query = `
      UPDATE products
      SET stock = stock - $2, updated_at = NOW()
      WHERE id = $1 AND stock >= $2
      RETURNING id, stock
    `;
    const { rows } = await executor.query(query, [productId, quantity]);
    return rows[0] || null;
  }

  async increaseProductStock(productId, quantity, executor = this.db) {
    const query = `
      UPDATE products
      SET stock = stock + $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, stock
    `;

    const { rows } = await executor.query(query, [productId, quantity]);
    return rows[0] || null;
  }

  async syncInventoryStock(productId, availableStock, executor = this.db) {
    const query = `
      INSERT INTO inventory (
        product_id,
        available_stock,
        reserved_stock,
        low_stock_threshold,
        stock_status
      )
      VALUES (
        $1,
        $2,
        0,
        5,
        CASE
          WHEN $2 <= 0 THEN 'out_of_stock'
          WHEN $2 <= 5 THEN 'low_stock'
          ELSE 'in_stock'
        END
      )
      ON CONFLICT (product_id)
      DO UPDATE SET
        available_stock = EXCLUDED.available_stock,
        reserved_stock = LEAST(inventory.reserved_stock, EXCLUDED.available_stock),
        stock_status = CASE
          WHEN EXCLUDED.available_stock <= 0 THEN 'out_of_stock'
          WHEN EXCLUDED.available_stock <= inventory.low_stock_threshold THEN 'low_stock'
          ELSE 'in_stock'
        END,
        updated_at = NOW()
      RETURNING *
    `;
    const { rows } = await executor.query(query, [productId, availableStock]);
    return rows[0] || null;
  }

  async clearCart(cartId, executor = this.db) {
    await executor.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
  }

  async listOrdersByUserId(userId, executor = this.db) {
    const query = `
      SELECT
        id,
        order_number,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        subtotal,
        delivery_charge,
        total_amount,
        payment_method,
        payment_status,
        order_status,
        created_at,
        updated_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
    `;
    const { rows } = await executor.query(query, [userId]);
    return rows;
  }

  async findOrderByIdAndUserId(orderId, userId, executor = this.db) {
    const query = `
      SELECT
        id,
        order_number,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        subtotal,
        delivery_charge,
        total_amount,
        payment_method,
        payment_status,
        order_status,
        created_at,
        updated_at
      FROM orders
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [orderId, userId]);
    return rows[0] || null;
  }

  async listOrderItemsByOrderIds(orderIds, executor = this.db) {
    if (!orderIds.length) return [];

    const placeholders = orderIds.map((_, index) => `$${index + 1}`).join(", ");
    const query = `
      SELECT
        id,
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        line_total,
        created_at
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY id ASC
    `;
    const { rows } = await executor.query(query, orderIds);
    return rows;
  }

  async listOrderItems(orderId, executor = this.db) {
    const query = `
      SELECT
        id,
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        line_total,
        created_at
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
    `;
    const { rows } = await executor.query(query, [orderId]);
    return rows;
  }

  async updateOrderStatus(orderId, status, executor = this.db) {
  const query = `
    UPDATE orders
    SET order_status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      order_number,
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      subtotal,
      delivery_charge,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      created_at,
      updated_at
  `;

  const { rows } = await executor.query(query, [orderId, status]);
  return rows[0] || null;
}


async listAdminOrders(filters = {}, executor = this.db) {
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`order_status = $${values.length}`);
  }

  if (filters.paymentStatus) {
    values.push(filters.paymentStatus);
    conditions.push(`payment_status = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(
      order_number ILIKE $${values.length}
      OR customer_name ILIKE $${values.length}
      OR customer_phone ILIKE $${values.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  values.push(filters.limit);
  const limitIndex = values.length;

  values.push(filters.offset);
  const offsetIndex = values.length;

  const query = `
    SELECT
      id,
      order_number,
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      subtotal,
      delivery_charge,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      created_at,
      updated_at
    FROM orders
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;

  const { rows } = await executor.query(query, values);
  return rows;
}

async countAdminOrders(filters = {}, executor = this.db) {
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`order_status = $${values.length}`);
  }

  if (filters.paymentStatus) {
    values.push(filters.paymentStatus);
    conditions.push(`payment_status = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(
      order_number ILIKE $${values.length}
      OR customer_name ILIKE $${values.length}
      OR customer_phone ILIKE $${values.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT COUNT(*)::int AS total
    FROM orders
    ${whereClause}
  `;

  const { rows } = await executor.query(query, values);
  return rows[0]?.total || 0;
}

async getAdminOrderSummary(executor = this.db) {
  const query = `
    SELECT
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE order_status = 'placed')::int AS placed_orders,
      COUNT(*) FILTER (WHERE order_status = 'processing')::int AS processing_orders,
      COUNT(*) FILTER (WHERE order_status = 'shipped')::int AS shipped_orders,
      COUNT(*) FILTER (WHERE order_status = 'delivered')::int AS delivered_orders,
      COUNT(*) FILTER (WHERE order_status = 'cancelled')::int AS cancelled_orders,
      COALESCE(SUM(total_amount), 0)::numeric(10, 2) AS total_revenue
    FROM orders
  `;

  const { rows } = await executor.query(query);
  return rows[0];
}

async findOrderByIdForAdmin(orderId, executor = this.db) {
  const query = `
    SELECT
      id,
      order_number,
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      subtotal,
      delivery_charge,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      created_at,
      updated_at
    FROM orders
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [orderId]);
  return rows[0] || null;
}


}

module.exports = OrderModel;
