import { Router, type Request, type Response } from 'express';
import { store } from '../store';

export const categoriesRouter = Router();

/** GET /api/categories — lista de categorías únicas del catálogo. */
categoriesRouter.get('/', (_req: Request, res: Response) => {
  res.json(store.listCategories());
});
