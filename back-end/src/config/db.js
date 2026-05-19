const { Sequelize } = require("sequelize");
const logger = require("../common/utils/logger");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
    timezone: "+00:00",
  }
);

const ensureCoreTables = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_otp VARCHAR(6),
      email_verification_otp_expires_at TIMESTAMP WITH TIME ZONE,
      password_reset_otp VARCHAR(6),
      password_reset_otp_expires_at TIMESTAMP WITH TIME ZONE,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verification_otp VARCHAR(6),
    ADD COLUMN IF NOT EXISTS email_verification_otp_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS password_reset_otp VARCHAR(6),
    ADD COLUMN IF NOT EXISTS password_reset_otp_expires_at TIMESTAMP WITH TIME ZONE;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      slug VARCHAR(150) NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS categories_normalized_name_unique_idx
    ON categories (
      LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(name, '[''’]', '', 'g'), '[^a-zA-Z0-9]+', ' ', 'g'), '\\s+', ' ', 'g')))
    );
  `);

  await sequelize.query(`
    ALTER TABLE categories
    DROP COLUMN IF EXISTS parent_id,
    DROP COLUMN IF EXISTS sort_order;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      sku VARCHAR(100) NOT NULL UNIQUE,
      short_description TEXT,
      description TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      fabric VARCHAR(100),
      occasion VARCHAR(100),
      pattern VARCHAR(100),
      color VARCHAR(100),
      blouse_included BOOLEAN NOT NULL DEFAULT FALSE,
      blouse_type VARCHAR(100),
      mrp NUMERIC(10, 2) NOT NULL,
      selling_price NUMERIC(10, 2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      is_new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS type,
    DROP COLUMN IF EXISTS weave,
    DROP COLUMN IF EXISTS is_featured,
    DROP COLUMN IF EXISTS is_best_seller,
    DROP COLUMN IF EXISTS border_style,
    DROP COLUMN IF EXISTS pallu_style,
    DROP COLUMN IF EXISTS length,
    DROP COLUMN IF EXISTS width,
    DROP COLUMN IF EXISTS weight,
    DROP COLUMN IF EXISTS care_instructions,
    DROP COLUMN IF EXISTS secondary_color,
    DROP COLUMN IF EXISTS size;
  `);

  await sequelize.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS occasion VARCHAR(100);
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      alt_text VARCHAR(255),
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id SERIAL PRIMARY KEY,
      asset_id VARCHAR(255) NOT NULL,
      public_id VARCHAR(255) NOT NULL UNIQUE,
      secure_url TEXT NOT NULL,
      optimized_url TEXT,
      url TEXT,
      folder VARCHAR(255),
      format VARCHAR(50),
      resource_type VARCHAR(50),
      bytes INTEGER,
      width INTEGER,
      height INTEGER,
      original_filename VARCHAR(255),
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS discounts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      type VARCHAR(50) NOT NULL,
      value NUMERIC(10, 2) NOT NULL,
      applies_to VARCHAR(50) NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      min_order_amount NUMERIC(10, 2),
      min_order_value NUMERIC(10, 2),
      max_discount_amount NUMERIC(10, 2),
      usage_limit INTEGER,
      per_user_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    ALTER TABLE discounts
    ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS per_user_limit INTEGER;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
      available_stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      stock_status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    ALTER TABLE carts
    ALTER COLUMN user_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS guest_token VARCHAR(100);
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS carts_guest_token_key
    ON carts (guest_token)
    WHERE guest_token IS NOT NULL;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE (cart_id, product_id)
    );
  `);


    await sequelize.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_name VARCHAR(150) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(20),
      shipping_address TEXT NOT NULL,
      subtotal NUMERIC(10, 2) NOT NULL,
      delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(10, 2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cash_on_delivery',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      order_status VARCHAR(50) NOT NULL DEFAULT 'placed',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255) NOT NULL,
      product_sku VARCHAR(100),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(10, 2) NOT NULL,
      line_total NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);


  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, product_id)
    );
  `);

  await sequelize.query(`
    ALTER TABLE wishlist_items
    ALTER COLUMN user_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS guest_token VARCHAR(100);
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_guest_token_product_id_key
    ON wishlist_items (guest_token, product_id)
    WHERE guest_token IS NOT NULL;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(150),
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE (product_id, user_id)
    );
  `);

  await sequelize.query(`
    ALTER TABLE product_reviews
    DROP COLUMN IF EXISTS is_approved;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'users_email_lower_unique_idx'
      ) AND NOT EXISTS (
        SELECT 1
        FROM users
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      ) THEN
        CREATE UNIQUE INDEX users_email_lower_unique_idx ON users (LOWER(email));
      END IF;
    END $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'users_phone_unique_idx'
      ) AND NOT EXISTS (
        SELECT 1
        FROM users
        WHERE phone IS NOT NULL AND BTRIM(phone) <> ''
        GROUP BY phone
        HAVING COUNT(*) > 1
      ) THEN
        CREATE UNIQUE INDEX users_phone_unique_idx
        ON users (phone)
        WHERE phone IS NOT NULL AND BTRIM(phone) <> '';
      END IF;
    END $$;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items (cart_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS cart_items_product_id_idx ON cart_items (product_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx ON wishlist_items (user_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS wishlist_items_product_id_idx ON wishlist_items (product_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS product_reviews_product_id_idx ON product_reviews (product_id);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS product_reviews_user_id_idx ON product_reviews (user_id);
  `);


    await sequelize.query(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      pincode VARCHAR(10) NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      landmark VARCHAR(150),
      address_type VARCHAR(20) DEFAULT 'home',
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id
    ON user_addresses(user_id);
  `);


};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.query("SET TIME ZONE 'UTC'");
    logger.log("PostgreSQL connected successfully");

    await sequelize.sync();
    logger.log("Tables synced");

    await ensureCoreTables();
    logger.log("Core tables ensured");
  } catch (error) {
    logger.error("DB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
