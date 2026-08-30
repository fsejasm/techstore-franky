import { Router, type Request, type Response } from 'express';
import { store } from '../store';

export const ordersRouter = Router();

/** POST /api/orders — checkout: crea un pedido con el carrito actual. */
ordersRouter.post('/', (req: Request, res: Response) => {
  const { customer } = req.body as { customer?: string };
  const buyer = customer && customer.trim() ? customer.trim() : 'invitado';

  const order = store.checkout(buyer);
  if (!order) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }
  res.status(201).json(order);
});

/** GET /api/orders — lista los pedidos realizados. */
ordersRouter.get('/', (_req: Request, res: Response) => {
  res.json(store.listOrders());
});

/** GET /api/orders/:id */
ordersRouter.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = store.getOrder(id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  res.json(order);
});
