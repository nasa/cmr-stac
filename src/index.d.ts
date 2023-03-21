import { WarmProviderCache } from "./domains/cache";
import { Provider } from "./models/CmrModels";
import { STACCollection } from "./@types/StacCollection";

/**
 * Extend the Express Request object to allow for re-use of query results.
 */
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    export interface Request {
      cache?: {
        providers: WarmProviderCache;
        cloudProviders: WarmProviderCache;
      };
      provider?: Provider;
      collection?: STACCollection;
    }
  }
}
