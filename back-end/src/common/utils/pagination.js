function parsePagination(query = {}, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const pageNum = Number(query.page || defaults.page);
  const limitNum = Number(query.limit || defaults.limit);

  const page = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : defaults.page;
  let limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : defaults.limit;
  if (limit > defaults.maxLimit) limit = defaults.maxLimit;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function buildPaginationMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
