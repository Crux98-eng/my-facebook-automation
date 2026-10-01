function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function formatPaginatedResponse(data, totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    items: data,
    pagination: {
      total: parseInt(totalCount, 10),
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

module.exports = {
  getPaginationParams,
  formatPaginatedResponse
};
