import { Router, type Request, type Response } from 'express';
import { store } from '../store';

export const favoritesRouter = Router();

/** GET /api/favorites — productos marcados como favoritos. */
favoritesRouter.get('/', (_req: Request, res: Response) => {
  res.json(store.listFavorites());
});

/** POST /api/favorites — agrega un producto a favoritos. */
favoritesRouter.post('/', (req: Request, res: Response) => {
  const { productId } = req.body as { productId?: number };
  if (productId === undefined) {
    return res.status(400).json({ error: 'productId es obligatorio' });
  }
  const ok = store.addFavorite(productId);
  if (!ok) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.status(201).json(store.listFavorites());
});

/** DELETE /api/favorites/:productId — quita un producto de favoritos. */
favoritesRouter.delete('/:productId', (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  const removed = store.removeFavorite(productId);
  if (!removed) {
    return res.status(404).json({ error: 'El producto no está en favoritos' });
  }
  res.json(store.listFavorites());
});
