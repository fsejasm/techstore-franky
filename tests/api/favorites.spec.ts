import { test, expect } from '../../src/fixtures/test-fixtures';
import { allure } from 'allure-playwright';
import type { Product } from './types';

/**
 * Pruebas de API de favoritos (wishlist) de TechStore. Los favoritos
 * viven en el store en memoria compartido: se ejecutan en serie y se
 * resetea el estado antes de cada test.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Favorites API (via ApiClient)', () => {
  test.beforeEach(async ({ apiClient }) => {
    await allure.epic('API');
    await allure.feature('Favoritos');
    await apiClient.reset();
  });

  test('la lista de favoritos arranca vacía', async ({ apiClient }) => {
    const response = await apiClient.listFavorites();
    expect(response.ok()).toBeTruthy();
    const favorites = (await response.json()) as Product[];
    expect(favorites).toHaveLength(0);
  });

  test('agrega un producto a favoritos', async ({ apiClient }) => {
    const response = await apiClient.addFavorite(1);
    expect(response.status()).toBe(201);

    const favorites = (await response.json()) as Product[];
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe(1);
  });

  test('agregar el mismo favorito dos veces no lo duplica', async ({ apiClient }) => {
    await apiClient.addFavorite(2);
    const response = await apiClient.addFavorite(2);

    const favorites = (await response.json()) as Product[];
    expect(favorites).toHaveLength(1);
  });

  test('agregar un producto inexistente a favoritos devuelve 404', async ({ apiClient }) => {
    const response = await apiClient.addFavorite(9999);
    expect(response.status()).toBe(404);
  });

  test('agregar sin productId devuelve 400', async ({ request }) => {
    const response = await request.post('/api/favorites', { data: {} });
    expect(response.status()).toBe(400);
  });

  test('quita un producto de favoritos', async ({ apiClient }) => {
    await apiClient.addFavorite(3);
    const response = await apiClient.removeFavorite(3);

    expect(response.status()).toBe(200);
    const favorites = (await response.json()) as Product[];
    expect(favorites).toHaveLength(0);
  });

  test('quitar un favorito que no está devuelve 404', async ({ apiClient }) => {
    const response = await apiClient.removeFavorite(5);
    expect(response.status()).toBe(404);
  });
});
