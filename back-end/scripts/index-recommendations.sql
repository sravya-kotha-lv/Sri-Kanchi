-- Production index recommendations for ecommerce workload
-- Apply through your migration system after validating existing indexes.

-- Products: search, listing, public filters
CREATE INDEX IF NOT EXISTS idx_products_status_created_at ON products (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products (category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products (is_new_arrival);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (selling_price);
CREATE INDEX IF NOT EXISTS idx_products_slug_unique ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_sku_unique ON products (sku);

-- Optional text search acceleration (ILIKE patterns)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_slug_trgm ON products USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);

-- Product images
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON product_images (product_id, is_primary DESC, sort_order ASC);

-- Discounts: code lookup and active-offer filtering
CREATE INDEX IF NOT EXISTS idx_discounts_code_unique ON discounts (code);
CREATE INDEX IF NOT EXISTS idx_discounts_active_window ON discounts (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_discounts_scope ON discounts (applies_to, product_id, category_id);

-- Inventory: dashboard and low-stock checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product_unique ON inventory (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory (stock_status);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory (available_stock, low_stock_threshold);
