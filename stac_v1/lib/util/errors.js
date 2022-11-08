function NotFound(message) {
  this.name = 'NotFound';
  this.message = message;
  this.stack = (new Error()).stack;
}
NotFound.prototype = new Error;

function HttpError(message, status, body) {
  this.name = 'NotFound';
  this.message = message;
  this.body = body;
  this.status = status;
  this.stack = (new Error()).stack;
}
HttpError.prototype = new Error;

module.exports = {
  errors: {
    HttpError,
    NotFound
  }
};
