const _ = require('lodash');
const CMR_DEFAULT_LIMIT = 1000000;

function apply (result, { query, searchResult }) {
  const returned = searchResult.granules.length;
  const matched = _.toInteger(searchResult.totalHits);
  const limit = query.limit ? _.toInteger(query.limit) : CMR_DEFAULT_LIMIT;

  return {
    ...result,
    context: { returned, limit, matched }
  };
}

module.exports = { apply };
