function NotFound(message) {
  this.name = 'NotFound';
  this.message = message;
  this.stack = (new Error()).stack;
}

NotFound.prototype = new Error;

module.exports = {
  errors: {
    NotFound
  }
};
