class DashboardService {
  constructor({ model }) {
    this.model = model;
  }

  normalizePublicProduct(product) {
    if (!product) return null;

    return {
      ...product,
      mrp: Number(product.mrp || 0),
      selling_price: Number(product.selling_price || 0),
      stock: Number(product.stock || 0),
      discount_value: Number(product.discount_value || 0),
      discount_amount: Number(product.discount_amount || 0),
      final_price: Number(product.final_price || product.selling_price || 0),
      rating: Number(product.rating || product.average_rating || 0),
      reviewsCount: Number(product.reviewsCount || product.total_reviews || 0),
      average_rating: Number(product.average_rating || product.rating || 0),
      total_reviews: Number(product.total_reviews || product.reviewsCount || 0),
      is_in_stock: Number(product.stock || 0) > 0,
    };
  }

  normalizeSummary(summary) {
    return {
      total_products: Number(summary.total_products || 0),
      active_products: Number(summary.active_products || 0),
      inactive_products: Number(summary.inactive_products || 0),
      new_arrival_products: Number(summary.new_arrival_products || 0),
      category_count: Number(summary.category_count || 0),
      active_discounts: Number(summary.active_discounts || 0),
      low_stock_count: Number(summary.low_stock_count || 0),
    };
  }

  normalizePublicSummary(summary) {
    return {
      total_products: Number(summary.total_products || 0),
      in_stock_products: Number(summary.in_stock_products || 0),
      new_arrivals: Number(summary.new_arrivals || 0),
      total_categories: Number(summary.total_categories || 0),
      active_offers: Number(summary.active_offers || 0),
    };
  }

  async getSummary() {
    const summary = await this.model.getSummary();
    return this.normalizeSummary(summary);
  }

  async getTopProducts(query) {
    return this.model.getTopProducts(query.limit);
  }

  async getLowStockProducts(query) {
    return this.model.getLowStockProducts(query.limit);
  }

  async getCategorySummary(query) {
    return this.model.getCategorySummary(query.limit);
  }

  async getPublicHome(query) {
    const [summary, hero_banners, featured_categories, top_deals, trending_products] = await Promise.all([
      this.model.getPublicSummary(),
      this.model.getPublicHeroBanners(query.hero_limit),
      this.model.getPublicFeaturedCategories(query.category_limit),
      this.model.getPublicTopDeals(query.deal_limit),
      this.model.getPublicTrendingProducts(query.product_limit),
    ]);

    return {
      summary: this.normalizePublicSummary(summary),
      hero_banners: hero_banners.map((item) => this.normalizePublicProduct(item)),
      featured_categories,
      top_deals: top_deals.map((item) => this.normalizePublicProduct(item)),
      trending_products: trending_products.map((item) => this.normalizePublicProduct(item)),
    };
  }

  async getPublicHeroBanners(query) {
    const items = await this.model.getPublicHeroBanners(query.limit);
    return items.map((item) => this.normalizePublicProduct(item));
  }

  async getPublicFeaturedCategories(query) {
    return this.model.getPublicFeaturedCategories(query.limit);
  }

  async getPublicTopDeals(query) {
    const items = await this.model.getPublicTopDeals(query.limit);
    return items.map((item) => this.normalizePublicProduct(item));
  }

  async getPublicTrendingProducts(query) {
    const items = await this.model.getPublicTrendingProducts(query.limit);
    return items.map((item) => this.normalizePublicProduct(item));
  }
}

module.exports = {
  DashboardService,
};
