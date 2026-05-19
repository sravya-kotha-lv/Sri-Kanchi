const ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
};

const INVENTORY_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
};

const DISCOUNT_TYPE = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
};

const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
};

module.exports = {
  ROLES,
  PRODUCT_STATUS,
  INVENTORY_STATUS,
  DISCOUNT_TYPE,
  SORT_ORDER,
};
