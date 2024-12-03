import { Request, Response } from "express";
import * as path from 'path';

export const documentationHandler = async (_req: Request, res: Response) => {
  res.sendFile(path.resolve('docs/index/index.html'));
};
