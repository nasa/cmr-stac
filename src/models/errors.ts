export class InvalidParameterError extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, InvalidParameterError.prototype);
  }
}
