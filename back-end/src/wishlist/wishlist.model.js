class WishlistModel {
  constructor(db) {
    this.db = db;
  }

  async findProductById(productId, executor = this.db) {
    const query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.selling_price,
        p.mrp,
        p.stock,
        p.status,
        c.is_active AS category_is_active
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1
      LIMIT 1
    `;
    const { rows } = await executor.query(query, [productId]);
    return rows[0] || null;
  }

  async addItem(actor, productId, executor = this.db) {
    const isUser = actor?.type === 'user';
    const conflictClause = isUser
      ? '(user_id, product_id)'
      : '(guest_token, product_id) WHERE guest_token IS NOT NULL';
    const query = `
      INSERT INTO wishlist_items (user_id, guest_token, product_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT ${conflictClause}
      DO UPDATE SET updated_at = NOW()
      RETURNING id, user_id, guest_token, product_id, created_at, updated_at
    `;
    const { rows } = await executor.query(query, [actor.userId, actor.guestToken, productId]);
    return rows[0];
  }

  async deleteItem(actor, itemId, executor = this.db) {
    const isUser = actor?.type === 'user';
    const { rowCount } = await executor.query(
      `DELETE FROM wishlist_items WHERE ${isUser ? 'user_id' : 'guest_token'} = $1 AND id = $2`,
      [isUser ? actor.userId : actor.guestToken, itemId]
    );
    return rowCount > 0;
  }

  async clearWishlist(actor, executor = this.db) {
    const isUser = actor?.type === 'user';
    await executor.query(
      `DELETE FROM wishlist_items WHERE ${isUser ? 'user_id' : 'guest_token'} = $1`,
      [isUser ? actor.userId : actor.guestToken]
    );
  }

  async listItems(actor, executor = this.db) {
    const isUser = actor?.type === 'user';
    const query = `
      SELECT
        wi.id,
        wi.user_id,
        wi.guest_token,
        wi.product_id,
        wi.created_at,
        wi.updated_at,
        p.name,
        p.slug,
        p.sku,
        p.mrp,
        p.selling_price,
        p.stock,
        p.status,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS image_url
      FROM wishlist_items wi
      INNER JOIN products p ON p.id = wi.product_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE wi.${isUser ? 'user_id' : 'guest_token'} = $1
        AND p.status = 'active'
        AND c.is_active = TRUE
      ORDER BY wi.updated_at DESC, wi.id DESC
    `;
    const { rows } = await executor.query(query, [isUser ? actor.userId : actor.guestToken]);
    return rows;
  }
}

module.exports = WishlistModel;
