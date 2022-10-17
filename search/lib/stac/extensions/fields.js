const _ = require('lodash');
const { logger } = require('../../util');

/**
 * Return an object without a 'fields' property.
 */
function prepare (request) {
  return _.omit(request, ['fields']);
}

function format (result, fields) {
  logger.debug(`Formatting ${fields}`);
  if (_.isUndefined(fields) || _.isNull(fields)) return result;

  const { _sourceIncludes, _sourceExcludes } = buildFieldsFilter(fields);

  result.features = result.features.map(feature => {
    const featureWithIncludes = _.pick(feature, _sourceIncludes);
    const featureWithoutExcludes = _.omit(featureWithIncludes, _sourceExcludes);
    return featureWithoutExcludes;
  });

  return result;
}

module.exports = { format, prepare };

// Private
function fieldsStringToObject (fieldsQuery) {
  const fieldsArray = fieldsQuery.split(',');
  const include = fieldsArray.filter(field => field.startsWith('-') === false).map(field => field.replace(/^\+/, ''));
  const exclude = fieldsArray.filter(field => field.startsWith('-') === true).map(field => field.replace(/^-/, ''));
  return { include, exclude };
}

function buildFieldsFilter (fields) {
  const fieldsObject = _.isString(fields) ? fieldsStringToObject(fields) : fields;
  const { include, exclude } = fieldsObject;
  let _sourceIncludes = [
    'id',
    'type',
    'geometry',
    'bbox',
    'links',
    'assets',
    'collection',
    'properties.datetime'
  ];
  let _sourceExcludes = [];
  // Add include fields to the source include list if they're not already in it
  if (include && include.length > 0) {
    include.forEach((field) => {
      if (_sourceIncludes.indexOf(field) < 0) {
        _sourceIncludes.push(field);
      }
    });
  }
  // Remove exclude fields from the default include list and add them to the source exclude list
  if (exclude && exclude.length > 0) {
    _sourceIncludes = _sourceIncludes.filter((field) => !exclude.includes(field));
    _sourceExcludes = exclude;
  }
  return { _sourceIncludes, _sourceExcludes };
}
