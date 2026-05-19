class CartModel {
  constructor(db) {
    this.db = db;
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
    const isUser = actor?.type === 'user';
    const conflictClause = isUser ? '(user_id)' : '(guest_token) WHERE guest_token IS NOT NULL';
    const query = `
      INSERT INTO carts (user_id, guest_token, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT ${conflictClause}
      DO UPDATE SET updated_at = NOW()
      RETURNING id, user_id, guest_token, created_at, updated_at
    `;
    const { rows } = await executor.query(query, [
      isUser ? actor.userId : null,
      isUser ? null : actor.guestToken,
    ]);
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
    await executor.query('DELETE FROM carts WHERE id = $1', [cartId]);
  }

  async getOrCreateCart(actor, executor = this.db) {
    if (actor?.type === 'user') {
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

      return this.createCart(
        { type: 'user', userId: actor.userId, guestToken: null },
        executor
      );
    }

    const guestCart = await this.findCartByGuestToken(actor?.guestToken, executor);
    if (guestCart) {
      return guestCart;
    }

    return this.createCart(actor, executor);
  }

  async findProductById(productId, executor = this.db) {
    const query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.selling_price,
        p.stock,
        p.status,
        c.is_active AS category_is_active
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [productId]);
    return rows[0] || null;
  }

  async findCartItemById(cartId, itemId, executor = this.db) {
    const query = `
      SELECT id, cart_id, product_id, quantity, unit_price, created_at, updated_at
      FROM cart_items
      WHERE cart_id = $1 AND id = $2
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [cartId, itemId]);
    return rows[0] || null;
  }

  async findCartItemByProductId(cartId, productId, executor = this.db) {
    const query = `
      SELECT id, cart_id, product_id, quantity, unit_price, created_at, updated_at
      FROM cart_items
      WHERE cart_id = $1 AND product_id = $2
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [cartId, productId]);
    return rows[0] || null;
  }

  async addOrIncrementCartItem(cartId, productId, quantity, unitPrice, executor = this.db) {
    const query = `
      INSERT INTO cart_items (cart_id, product_id, quantity, unit_price, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (cart_id, product_id)
      DO UPDATE
      SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        updated_at = NOW()
      RETURNING id, cart_id, product_id, quantity, unit_price, created_at, updated_at
    `;
    const { rows } = await executor.query(query, [cartId, productId, quantity, unitPrice]);
    return rows[0];
  }

  async updateCartItemQuantity(cartId, itemId, quantity, unitPrice, executor = this.db) {
    const query = `
      UPDATE cart_items
      SET quantity = $3, unit_price = $4, updated_at = NOW()
      WHERE cart_id = $1 AND id = $2
      RETURNING id, cart_id, product_id, quantity, unit_price, created_at, updated_at
    `;
    const { rows } = await executor.query(query, [cartId, itemId, quantity, unitPrice]);
    return rows[0] || null;
  }

  async deleteCartItem(cartId, itemId, executor = this.db) {
    const { rowCount } = await executor.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND id = $2',
      [cartId, itemId]
    );
    return rowCount > 0;
  }

  async clearCart(cartId, executor = this.db) {
    await executor.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  }

  async listCartItems(cartId, executor = this.db) {
    const query = `
      SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.unit_price,
        (ci.quantity * ci.unit_price)::numeric(10, 2) AS line_total,
        p.name,
        p.slug,
        p.sku,
        p.stock,
        p.status,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS image_url
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      ORDER BY ci.updated_at DESC, ci.id DESC
    `;
    const { rows } = await executor.query(query, [cartId]);
    return rows;
  }
}

module.exports = CartModel;
