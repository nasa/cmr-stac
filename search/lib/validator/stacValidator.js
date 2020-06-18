
function validateStac (stacItem) {
  if (!stacItem) throw new Error('Missing stacItem');
  // TODO we should be able to beef this up to use AJV
  try {
    if (!stacItem.stac_version || !stacItem.id || !stacItem.description || !stacItem.links) {
      throw Error('Missing required fields');
    }
  } catch (e) {
    return false;
  }

  return true;
}

module.exports = {
  validateStac
};
