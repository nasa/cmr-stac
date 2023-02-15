export class ItemNotFound extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, ItemNotFound.prototype);
  }
}

export class InvalidParameterError extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, InvalidParameterError.prototype);
  }
}

export class ServiceUnavailableError extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}
