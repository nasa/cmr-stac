
function validateStac (featureCollection) {
  if (!featureCollection) throw new Error('Missing Feature Collection');
  try {
    for (const stacItem of featureCollection.features) {
      if (!stacItem.stac_version || !stacItem.id || !stacItem.links) {
        console.error('Missing required fields');
        throw Error('Missing required fields');
      }
    }
  } catch (e) {
    return false;
  }

  return true;
}

module.exports = {
  validateStac
};
