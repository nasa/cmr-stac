import { Request, Response, NextFunction } from "express";
import { applyMixins } from "../utils";

export class ItemNotFound extends Error {
  __proto__ = Error;

  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, ItemNotFound.prototype);
  }
}

class ItemNotFoundHandler {
  handle(err: any, _req: Request, res: Response, _next: NextFunction): void {
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

class InvalidParameterErrorHandler {
  handle(err: any, _req: Request, res: Response, _next: NextFunction): void {
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

class ServiceUnavailableErrorHandler {
  handle(err: any, _req: Request, res: Response, _next: NextFunction): void {
    res.status(503).json({ errors: [err.message] });
  }
}

// using mixins to get around typescript limitation on single inheritence
applyMixins(ItemNotFound, [ItemNotFoundHandler]);
applyMixins(InvalidParameterError, [InvalidParameterErrorHandler]);
applyMixins(ServiceUnavailableError, [ServiceUnavailableErrorHandler]);
