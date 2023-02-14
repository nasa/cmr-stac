import { WarmProviderCache } from "./domains/cache";
import { Provider } from "./models/CmrModels";

/**
 * Extend the Express Request object to allow for re-use of query results.
 */
declare global {
  namespace Express {
    export interface Request {
      cache?: {
        providers: WarmProviderCache;
        cloudProviders: WarmProviderCache;
      };
      provider?: Provider;
      collection?: any;
    }
  }
}
