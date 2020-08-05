function apply ({ query, searchResult }, result) {
  return {
    ...result,
    context: {
      returned: searchResult.granules.length,
      limit: query.limit || null,
      matched: searchResult.totalHits
    }
  };
}

module.exports = { apply };
