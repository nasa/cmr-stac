/**
 * Extend the Express Request object to allow for re-use of query results.
 */
declare namespace Express {
  export interface Request {
    provider?: any;
    collection?: any;
  }
}
