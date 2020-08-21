function format (result, { query, searchResult }) {
  return {
    ...result,
    context: {
      returned: searchResult.granules.length,
      limit: query.limit || null,
      matched: searchResult.totalHits
    }
  };
}

module.exports = { format };
