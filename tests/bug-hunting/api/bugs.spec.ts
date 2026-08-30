import { test, expect } from '@playwright/test';
import type { Cart } from '../../api/types';

/**
 * Suite "bug-hunting" (didáctica) — API.
 *
 * Estos tests detectan bugs plantados A PROPÓSITO en el backend
 * (ver app/src/bugs.ts). Activan el modo Bug Hunting vía API en el
 * beforeEach (el mismo que usa el switch de la UI), por lo que FALLAN a
 * propósito demostrando que un test bien escrito atrapa el defecto. El
 * afterEach vuelve a apagar el modo para no afectar a otras suites.
 *
 * Cómo correrlas (PowerShell):
 *   npm run test:bugs
 *
 * No se usa modo serial: cada test resetea el estado en su beforeEach para
 * que cada bug se evidencie de forma independiente (aunque otro falle).
 */
test.describe('Bug-hunting API', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/test/reset');
    await request.delete('/api/cart');
    // Enciende el modo Bug Hunting (igual que el switch de la UI).
    await request.post('/api/config/bugs', { data: { enabled: true } });
  });

  test.afterEach(async ({ request }) => {
    // Apaga el modo para dejar el servidor limpio para otras suites.
    await request.post('/api/config/bugs', { data: { enabled: false } });
  });

  // BUG(1): total del carrito ignora la cantidad.
  test('BUG 1: el total del carrito respeta la cantidad', async ({ request }) => {
    await request.post('/api/cart/items', { data: { productId: 3, quantity: 2 } });
    // Producto 3 (Teclado) cuesta 89.50 → 2 unidades = 179.00.
    const res = await request.get('/api/cart');
    const cart = (await res.json()) as Cart;

    expect(cart.totalItems).toBe(2);
    // Con BUGS=on el backend devuelve 89.50 (ignora la cantidad) y esto falla.
    expect(cart.totalPrice).toBe(179.0);
  });

  // BUG(2): categorías duplicadas.
  test('BUG 2: /categories no devuelve categorías duplicadas', async ({ request }) => {
    const res = await request.get('/api/categories');
    const categories = (await res.json()) as string[];

    // Con BUGS=on se repiten (una por producto) y el set es más chico.
    expect(new Set(categories).size).toBe(categories.length);
  });

  // BUG(3): validación de existencia omitida al agregar favorito.
  test('BUG 3: marcar un producto inexistente como favorito devuelve 404', async ({
    request,
  }) => {
    const res = await request.post('/api/favorites', { data: { productId: 9999 } });
    // Con BUGS=on responde 201 en vez de 404 y esto falla.
    expect(res.status()).toBe(404);
  });

  // BUG(5): control de acceso desactivado (escalada de privilegios).
  test('BUG 5: un customer NO puede crear productos (debería ser 403)', async ({ request }) => {
    const res = await request.post('/api/products', {
      headers: { Authorization: 'Bearer token-customer-123' },
      data: {
        name: 'Producto no autorizado',
        description: 'Creado por un customer',
        price: 10,
        originalPrice: 10,
        category: 'Accesorios',
        stock: 1,
        rating: 0,
        seller: 'customer',
        freeShipping: false,
      },
    });
    // Con BUGS=on la autorización se omite y responde 201 en vez de 403.
    expect(res.status()).toBe(403);
  });

  // BUG(6): el login no valida la contraseña.
  test('BUG 6: login con contraseña incorrecta debe fallar (401)', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'contraseña-incorrecta' },
    });
    // Con BUGS=on acepta cualquier contraseña y responde 200 en vez de 401.
    expect(res.status()).toBe(401);
  });
});
