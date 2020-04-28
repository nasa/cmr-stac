function createStacValidator (stacItem) {
  if (!stacItem.stac_version || !stacItem.id || !stacItem.description || !stacItem.links) throw Error('Missing required fields');
}

function validateStac (stacItem) {
  if (!stacItem) throw new Error('Missing stacItem');
  try {
    createStacValidator(stacItem);
  } catch (e) {
    return false;
  }

  return true;
}

module.exports = {
  createStacValidator,
  validateStac
};
