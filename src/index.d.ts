import { WarmCache } from "./domains/cache";
import { Provider } from "./models/CmrModels";

/**
 * Extend the Express Request object to allow for re-use of query results.
 */
declare global {
  namespace Express {
    export interface Request {
      cache?: {
        providers: WarmCache<Provider>;
        cloudProviders: WarmCache<Provider>;
      };
      provider?: Provider;
      collection?: any;
    }
  }
}
