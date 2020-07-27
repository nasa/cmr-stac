
const _ = require('lodash');

function convertStacFieldsQueryToObject (fieldsQuery) {
  const fieldsArray = fieldsQuery.split(',');
  const include = fieldsArray.filter(field => field.startsWith('-') === false).map(field => field.replace(/^\+/, ''));
  const exclude = fieldsArray.filter(field => field.startsWith('-') === true).map(field => field.replace(/^-/, ''));
  return { include, exclude };
}

function applyStacFieldsExtension (fields, result) {
  const { _sourceIncludes, _sourceExcludes } = buildFieldsFilter(fields);

  result.features = result.features.map(feature => {
    const featureWithIncludes = _.pick(feature, _sourceIncludes);
    const featureWithoutExcludes = _.omit(featureWithIncludes, _sourceExcludes);
    return featureWithoutExcludes;
  });

  return result;
}

module.exports = {
  convertStacFieldsQueryToObject,
  applyStacFieldsExtension
};

// Private

function buildFieldsFilter (fields) {
  const { include, exclude } = fields;
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
