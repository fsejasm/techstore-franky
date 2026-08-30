import { test, expect } from '@playwright/test';
import type { Cart, Order } from './types';

/**
 * Pruebas de API del checkout de TechStore usando el fixture nativo
 * `request`. baseURL y headers se heredan del proyecto `api`.
 * El carrito/pedidos viven en el store en memoria: se ejecutan en serie
 * y se resetea el estado antes de cada test.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Orders API (checkout, request nativo)', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/test/reset');
  });

  test('checkout con carrito vacío devuelve 400', async ({ request }) => {
    const response = await request.post('/api/orders', { data: { customer: 'admin' } });
    expect(response.status()).toBe(400);
  });

  test('checkout crea un pedido y vacía el carrito', async ({ request }) => {
    // Prepara el carrito.
    await request.post('/api/cart/items', { data: { productId: 1, quantity: 1 } });
    await request.post('/api/cart/items', { data: { productId: 4, quantity: 2 } });

    const response = await request.post('/api/orders', { data: { customer: 'admin' } });
    expect(response.status()).toBe(201);

    const order = (await response.json()) as Order;
    expect(order.id).toBe(1);
    expect(order.customer).toBe('admin');
    expect(order.items).toHaveLength(2);
    // 1299.00 + (449.00 * 2) = 2197.00
    expect(order.totalPrice).toBe(2197.0);
    expect(order.createdAt).toBeTruthy();

    // El carrito quedó vacío tras el checkout.
    const cartRes = await request.get('/api/cart');
    const cart = (await cartRes.json()) as Cart;
    expect(cart.items).toHaveLength(0);
  });

  test('GET /orders/:id devuelve el pedido creado', async ({ request }) => {
    await request.post('/api/cart/items', { data: { productId: 2, quantity: 1 } });
    await request.post('/api/orders', { data: { customer: 'admin' } });

    const response = await request.get('/api/orders/1');
    expect(response.ok()).toBeTruthy();
    const order = (await response.json()) as Order;
    expect(order.id).toBe(1);
    expect(order.totalPrice).toBe(199.99);
  });

  test('GET /orders/:id inexistente devuelve 404', async ({ request }) => {
    const response = await request.get('/api/orders/9999');
    expect(response.status()).toBe(404);
  });

  test('checkout sin customer usa "invitado" por defecto', async ({ request }) => {
    await request.post('/api/cart/items', { data: { productId: 3, quantity: 1 } });
    const response = await request.post('/api/orders', { data: {} });

    expect(response.status()).toBe(201);
    const order = (await response.json()) as Order;
    expect(order.customer).toBe('invitado');
  });
});
