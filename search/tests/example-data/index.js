const fs = require('fs');
const path = require('path');

const contents = fs.readdirSync(__dirname);
const jsonFiles = contents.filter((f) => f.endsWith('.json'));
const fileToContents = jsonFiles.map((f) =>
  [f.replace('.json', ''), JSON.parse(fs.readFileSync(path.join(__dirname, f)).toString())]);

const cmrColls = fileToContents
  .filter(([name]) => name.endsWith('cmr_coll'))
  .map(([, contents]) => contents);

const stacColls = fileToContents
  .filter(([name]) => name.endsWith('stac_coll'))
  .map(([, contents]) => contents);

const cloudstacColls = fileToContents
  .filter(([name]) => name.endsWith('cloud_coll'))
  .map(([, contents]) => contents);

const cmrGrans = fileToContents
  .filter(([name]) => name.endsWith('cmr_gran'))
  .map(([, contents]) => contents);

const stacGrans = fileToContents
  .filter(([name]) => name.endsWith('stac_gran'))
  .map(([, contents]) => contents);

const cloudstacGrans = fileToContents
  .filter(([name]) => name.endsWith('cloud_gran'))
  .map(([, contents]) => contents);

const nameToCamel = (str) => str.replace(
  /([-_][a-z])/g,
  (group) => group.toUpperCase()
    .replace('-', '')
    .replace('_', '')
);

const examplesByName = fileToContents.reduce((m, [name, contents]) => {
  m[nameToCamel(name)] = contents;
  return m;
}, {});

module.exports = {
  cmrColls,
  stacColls,
  cloudstacColls,
  cmrGrans,
  stacGrans,
  cloudstacGrans,
  examplesByName
};
