class AddressModel {
  constructor(db) {
    this.db = db;
  }

  async listByUserId(userId, executor = this.db) {
    const query = `
      SELECT *
      FROM user_addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, updated_at DESC, id DESC
    `;

    const { rows } = await executor.query(query, [userId]);
    return rows;
  }

  async findByIdAndUserId(addressId, userId, executor = this.db) {
    const query = `
      SELECT *
      FROM user_addresses
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `;

    const { rows } = await executor.query(query, [addressId, userId]);
    return rows[0] || null;
  }

  async clearDefault(userId, executor = this.db) {
    await executor.query(
      `
        UPDATE user_addresses
        SET is_default = FALSE, updated_at = NOW()
        WHERE user_id = $1
      `,
      [userId]
    );
  }

  async create(userId, payload, executor = this.db) {
    const query = `
      INSERT INTO user_addresses (
        user_id,
        full_name,
        phone,
        pincode,
        address_line1,
        address_line2,
        city,
        state,
        landmark,
        address_type,
        is_default,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      userId,
      payload.full_name,
      payload.phone,
      payload.pincode,
      payload.address_line1,
      payload.address_line2 || null,
      payload.city,
      payload.state,
      payload.landmark || null,
      payload.address_type || "home",
      payload.is_default || false,
    ];

    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async update(addressId, userId, payload, executor = this.db) {
    const query = `
      UPDATE user_addresses
      SET
        full_name = COALESCE($3, full_name),
        phone = COALESCE($4, phone),
        pincode = COALESCE($5, pincode),
        address_line1 = COALESCE($6, address_line1),
        address_line2 = COALESCE($7, address_line2),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        landmark = COALESCE($10, landmark),
        address_type = COALESCE($11, address_type),
        is_default = COALESCE($12, is_default),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const values = [
  addressId,
  userId,
  payload.full_name ?? null,
  payload.phone ?? null,
  payload.pincode ?? null,
  payload.address_line1 ?? null,
  payload.address_line2 ?? null,
  payload.city ?? null,
  payload.state ?? null,
  payload.landmark ?? null,
  payload.address_type ?? null,
  payload.is_default ?? null,
];


    const { rows } = await executor.query(query, values);
    return rows[0] || null;
  }

  async setDefault(addressId, userId, executor = this.db) {
    const query = `
      UPDATE user_addresses
      SET is_default = TRUE, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rows } = await executor.query(query, [addressId, userId]);
    return rows[0] || null;
  }

  async delete(addressId, userId, executor = this.db) {
    const query = `
      DELETE FROM user_addresses
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rows } = await executor.query(query, [addressId, userId]);
    return rows[0] || null;
  }
}

module.exports = AddressModel;
