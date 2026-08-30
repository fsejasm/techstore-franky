import { test, expect } from '../../src/fixtures/test-fixtures';
import { allure } from 'allure-playwright';
import type { Cart } from './types';

/**
 * Pruebas de API del carrito de TechStore usando el fixture ApiClient.
 * El carrito vive en el store en memoria compartido, por lo que estos
 * tests se ejecutan en serie y resetean el estado antes de cada uno.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Cart API (via ApiClient)', () => {
  test.beforeEach(async ({ apiClient }) => {
    await allure.epic('API');
    await allure.feature('Carrito');
    await apiClient.reset();
    await apiClient.clearCart();
  });

  test('el carrito arranca vacío', async ({ apiClient }) => {
    const response = await apiClient.getCart();
    expect(response.ok()).toBeTruthy();

    const cart = (await response.json()) as Cart;
    expect(cart.items).toHaveLength(0);
    expect(cart.totalItems).toBe(0);
    expect(cart.totalPrice).toBe(0);
  });

  test('agrega un producto y calcula los totales', async ({ apiClient }) => {
    const response = await apiClient.addToCart(1, 2);
    expect(response.status()).toBe(201);

    const cart = (await response.json()) as Cart;
    expect(cart.items).toHaveLength(1);
    expect(cart.totalItems).toBe(2);
    expect(cart.totalPrice).toBe(2598.0);
  });

  test('agregar el mismo producto acumula la cantidad', async ({ apiClient }) => {
    await apiClient.addToCart(3, 1);
    const response = await apiClient.addToCart(3, 2);

    const cart = (await response.json()) as Cart;
    expect(cart.items).toHaveLength(1);
    expect(cart.totalItems).toBe(3);
    expect(cart.totalPrice).toBe(268.5);
  });

  test('agregar un producto inexistente devuelve 404', async ({ apiClient }) => {
    const response = await apiClient.addToCart(9999, 1);
    expect(response.status()).toBe(404);
  });

  test('agregar con quantity inválida devuelve 400', async ({ apiClient }) => {
    const response = await apiClient.addToCart(1, 0);
    expect(response.status()).toBe(400);
  });

  test('quita un producto del carrito', async ({ apiClient }) => {
    await apiClient.addToCart(1, 1);
    const response = await apiClient.removeFromCart(1);

    expect(response.status()).toBe(200);
    const cart = (await response.json()) as Cart;
    expect(cart.items).toHaveLength(0);
  });

  test('quitar un producto que no está en el carrito devuelve 404', async ({ apiClient }) => {
    const response = await apiClient.removeFromCart(2);
    expect(response.status()).toBe(404);
  });
});
