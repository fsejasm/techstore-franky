import { Router, type Request, type Response } from 'express';
import { store } from '../store';
import type { AddToCartInput } from '../types';

export const cartRouter = Router();

/** GET /api/cart — estado actual del carrito con totales. */
cartRouter.get('/', (_req: Request, res: Response) => {
  res.json(store.getCart());
});

/** POST /api/cart/items — agrega un producto al carrito. */
cartRouter.post('/items', (req: Request, res: Response) => {
  const { productId, quantity } = req.body as Partial<AddToCartInput>;
  if (productId === undefined) {
    return res.status(400).json({ error: 'productId es obligatorio' });
  }
  if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 1)) {
    return res.status(400).json({ error: 'quantity debe ser un número mayor o igual a 1' });
  }
  const cart = store.addToCart({ productId, quantity });
  if (!cart) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.status(201).json(cart);
});

/** DELETE /api/cart/items/:productId — quita un producto del carrito. */
cartRouter.delete('/items/:productId', (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  const removed = store.removeFromCart(productId);
  if (!removed) {
    return res.status(404).json({ error: 'El producto no está en el carrito' });
  }
  res.json(store.getCart());
});

/** DELETE /api/cart — vacía el carrito. */
cartRouter.delete('/', (_req: Request, res: Response) => {
  store.clearCart();
  res.json(store.getCart());
});
