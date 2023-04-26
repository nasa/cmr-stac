import { Request, Response, NextFunction } from "express";

/**
 * Mixin helper
 * see https://www.digitalocean.com/community/tutorials/typescript-mixins
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyMixins = (derivedCtor: any, constructors: any[]) => {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
      );
    });
  });
};

export abstract class ErrorHandler {
  abstract handle(err: Error, req: Request, res: Response, next: NextFunction): void;
}

export class ItemNotFound extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, ItemNotFound.prototype);
  }
}

class ItemNotFoundHandler extends ErrorHandler {
  handle(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({ errors: [err.message] });
  }
}

export class InvalidParameterError extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, InvalidParameterError.prototype);
  }
}

class InvalidParameterErrorHandler extends ErrorHandler {
  handle(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    res.status(400).json({ errors: [err.message] });
  }
}

export class ServiceUnavailableError extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

class ServiceUnavailableErrorHandler extends ErrorHandler {
  handle(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    res.status(503).json({ errors: [err.message] });
  }
}

applyMixins(ItemNotFound, [ItemNotFoundHandler]);
applyMixins(InvalidParameterError, [InvalidParameterErrorHandler]);
applyMixins(ServiceUnavailableError, [ServiceUnavailableErrorHandler]);
