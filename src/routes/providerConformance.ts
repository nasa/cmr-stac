import { Request, Response } from "express";
import { ALL_PROVIDER, conformance, conformanceAll } from "../domains/providers";

export const providerConformanceHandler = async (_req: Request, res: Response): Promise<void> => {
  const {
    params: { providerId: provider },
  } = _req;
  res.json({ conformsTo: provider === ALL_PROVIDER ? conformanceAll : conformance });
};
