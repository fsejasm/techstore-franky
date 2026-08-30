import { Router, type Request, type Response } from 'express';
import { store } from '../store';
import { requireRole } from '../middleware/authorize';
import type { CreateProductInput, ProductQuery, UpdateProductInput } from '../types';

export const productsRouter = Router();

/**
 * GET /api/products
 * Soporta filtros por query string:
 *  - ?search=texto   busca en nombre y descripción
 *  - ?category=nombre  filtra por categoría exacta
 *  - ?deals=true     solo productos en oferta
 */
productsRouter.get('/', (req: Request, res: Response) => {
  const query: ProductQuery = {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    category: typeof req.query.category === 'string' ? req.query.category : undefined,
    onlyDeals: req.query.deals === 'true',
  };
  res.json(store.listProducts(query));
});

/** GET /api/products/deals — atajo para productos en oferta. */
productsRouter.get('/deals', (_req: Request, res: Response) => {
  res.json(store.listDeals());
});

/** GET /api/products/:id */
productsRouter.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const product = store.getProduct(id);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(product);
});

/** POST /api/products — solo admin o manager. */
productsRouter.post('/', requireRole('admin', 'manager'), (req: Request, res: Response) => {
  const body = req.body as Partial<CreateProductInput>;
  const { name, description, price, category, stock } = body;
  if (!name || !description || price === undefined || !category || stock === undefined) {
    return res
      .status(400)
      .json({ error: 'name, description, price, category y stock son obligatorios' });
  }
  const created = store.createProduct({
    name,
    description,
    price,
    originalPrice: body.originalPrice ?? price,
    category,
    stock,
    rating: body.rating ?? 0,
    seller: body.seller ?? 'TechStore',
    freeShipping: body.freeShipping ?? false,
    image: body.image,
  });
  res.status(201).json(created);
});

/** PUT /api/products/:id — solo admin o manager. */
productsRouter.put('/:id', requireRole('admin', 'manager'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updated = store.updateProduct(id, req.body as UpdateProductInput);
  if (!updated) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(updated);
});

/** DELETE /api/products/:id — solo admin. */
productsRouter.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ok = store.deleteProduct(id);
  if (!ok) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.status(204).send();
});
