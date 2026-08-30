import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CreateProductInput } from '../types';

/**
 * Wrapper delgado sobre el APIRequestContext nativo de Playwright (`request`).
 * Agrupa las llamadas a endpoints de TechStore para que los specs queden
 * legibles. baseURL (http://localhost:PORT) y headers vienen del proyecto
 * `api`. Cada ruta incluye el prefijo /api.
 */
/** Tokens semilla por rol (coinciden con app/src/store.ts). */
export const ROLE_TOKENS = {
  admin: 'token-admin-123',
  manager: 'token-manager-123',
  customer: 'token-customer-123',
} as const;

export type RoleName = keyof typeof ROLE_TOKENS;

export class ApiClient {
  /**
   * Token usado en operaciones protegidas (crear/editar/eliminar productos).
   * Por defecto usa admin para que las pruebas funcionales existentes pasen;
   * las pruebas de autorización lo cambian con `authAs`.
   */
  private token: string | undefined = ROLE_TOKENS.admin;

  constructor(private readonly request: APIRequestContext) {}

  /** Cambia el rol/token usado en las peticiones protegidas. */
  authAs(role: RoleName | null): this {
    this.token = role ? ROLE_TOKENS[role] : undefined;
    return this;
  }

  /** Cabeceras con el token actual (si hay). */
  private authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // ---- Auth ----
  /** POST /api/auth/login */
  login(username: string, password: string): Promise<APIResponse> {
    return this.request.post('/api/auth/login', { data: { username, password } });
  }

  // ---- Products ----
  /** GET /api/products/:id */
  getProduct(id: number): Promise<APIResponse> {
    return this.request.get(`/api/products/${id}`);
  }

  /**
   * GET /api/products con filtros opcionales (search, category, deals).
   */
  listProducts(
    query: { search?: string; category?: string; deals?: boolean } = {},
  ): Promise<APIResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.category) params.set('category', query.category);
    if (query.deals) params.set('deals', 'true');
    const qs = params.toString();
    return this.request.get(`/api/products${qs ? `?${qs}` : ''}`);
  }

  /** GET /api/products/deals */
  listDeals(): Promise<APIResponse> {
    return this.request.get('/api/products/deals');
  }

  /** GET /api/categories */
  listCategories(): Promise<APIResponse> {
    return this.request.get('/api/categories');
  }

  // ---- Favorites ----
  /** GET /api/favorites */
  listFavorites(): Promise<APIResponse> {
    return this.request.get('/api/favorites');
  }

  /** POST /api/favorites */
  addFavorite(productId: number): Promise<APIResponse> {
    return this.request.post('/api/favorites', { data: { productId } });
  }

  /** DELETE /api/favorites/:productId */
  removeFavorite(productId: number): Promise<APIResponse> {
    return this.request.delete(`/api/favorites/${productId}`);
  }

  /** POST /api/products (protegido; acepta datos parciales para validación). */
  createProduct(data: Partial<CreateProductInput>): Promise<APIResponse> {
    return this.request.post('/api/products', { data, headers: this.authHeaders() });
  }

  /** PUT /api/products/:id (protegido). */
  updateProduct(id: number, data: Partial<CreateProductInput>): Promise<APIResponse> {
    return this.request.put(`/api/products/${id}`, { data, headers: this.authHeaders() });
  }

  /** DELETE /api/products/:id (protegido). */
  deleteProduct(id: number): Promise<APIResponse> {
    return this.request.delete(`/api/products/${id}`, { headers: this.authHeaders() });
  }

  // ---- Cart ----
  /** GET /api/cart */
  getCart(): Promise<APIResponse> {
    return this.request.get('/api/cart');
  }

  /** POST /api/cart/items */
  addToCart(productId: number, quantity?: number): Promise<APIResponse> {
    return this.request.post('/api/cart/items', { data: { productId, quantity } });
  }

  /** DELETE /api/cart/items/:productId */
  removeFromCart(productId: number): Promise<APIResponse> {
    return this.request.delete(`/api/cart/items/${productId}`);
  }

  /** DELETE /api/cart */
  clearCart(): Promise<APIResponse> {
    return this.request.delete('/api/cart');
  }

  // ---- Orders (checkout) ----
  /** POST /api/orders */
  checkout(customer?: string): Promise<APIResponse> {
    return this.request.post('/api/orders', { data: { customer } });
  }

  /** GET /api/orders */
  listOrders(): Promise<APIResponse> {
    return this.request.get('/api/orders');
  }

  /** GET /api/orders/:id */
  getOrder(id: number): Promise<APIResponse> {
    return this.request.get(`/api/orders/${id}`);
  }

  /** POST /api/test/reset — reinicia el store en memoria. */
  reset(): Promise<APIResponse> {
    return this.request.post('/api/test/reset');
  }
}
