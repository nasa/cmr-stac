const fs = require('fs');
const yaml = require('js-yaml');
const axios = require('axios');

const STACYamlUrl = 'https://raw.githubusercontent.com/radiantearth/stac-spec/master/api-spec/STAC.yaml';
const WFS3YamlUrl = 'https://raw.githubusercontent.com/radiantearth/stac-spec/master/api-spec/openapi/OAFeat.yaml';

async function retrieveYaml (yamlUrl) {
  if (!yamlUrl) throw new Error('Missing yaml url');
  const yamlData = await axios.get(yamlUrl);
  return yaml.safeLoad(yamlData.data);
}

function mergeObjects (firstObj, secondObj) {
  if (!firstObj || !secondObj) throw new Error('Must have two objects as parameters');
  return Object.assign({}, secondObj, firstObj);
}

async function loadAndMergeYamlFiles (firstUrl, secondUrl) {
  if (!firstUrl || !secondUrl) throw new Error('Must pass two yaml urls');
  const firstObject = await retrieveYaml(firstUrl);
  const secondObject = await retrieveYaml(secondUrl);
  const mergedObject = mergeObjects(firstObject, secondObject);
  return yaml.safeDump(mergedObject);
}

function writeToYaml (yamlString, pathString) {
  if (!yamlString || !pathString) throw new Error('Must pass a yaml string and a path string');
  fs.writeFileSync(pathString, yamlString);
}

async function updateYaml (yamlUrl1, yamlUrl2, pathString) {
  if (!yamlUrl1 || !yamlUrl2 || !pathString) throw new Error('Missing at least one parameter, check parameters and try again');

  const yamlString = await loadAndMergeYamlFiles(yamlUrl1, yamlUrl2);
  writeToYaml(yamlString, pathString);
}

module.exports = {
  STACYamlUrl,
  WFS3YamlUrl,
  retrieveYaml,
  mergeObjects,
  loadAndMergeYamlFiles,
  writeToYaml,
  updateYaml
};
