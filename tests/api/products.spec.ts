import { test, expect } from '../../src/fixtures/test-fixtures';
import { allure } from 'allure-playwright';
import type { Product } from './types';

/**
 * Pruebas de API del catálogo de productos (TechStore marketplace):
 * shape, búsqueda, filtro por categoría, ofertas y CRUD.
 */
test.describe('Products API (via ApiClient)', () => {
  test.beforeEach(async ({ apiClient }) => {
    await allure.epic('API');
    await allure.feature('Catálogo');
    await apiClient.reset();
  });

  test('GET de un producto devuelve el shape esperado', async ({ apiClient }) => {
    const response = await apiClient.getProduct(1);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const product = (await response.json()) as Product;
    expect(product).toMatchObject({
      id: 1,
      name: expect.any(String),
      description: expect.any(String),
      price: expect.any(Number),
      originalPrice: expect.any(Number),
      category: expect.any(String),
      stock: expect.any(Number),
      rating: expect.any(Number),
      seller: expect.any(String),
      freeShipping: expect.any(Boolean),
    });
  });

  test('GET de un producto inexistente devuelve 404', async ({ apiClient }) => {
    const response = await apiClient.getProduct(9999);
    expect(response.status()).toBe(404);
  });

  test('GET de todos los productos devuelve el catálogo semilla', async ({ apiClient }) => {
    const response = await apiClient.listProducts();

    expect(response.ok()).toBeTruthy();
    const products = (await response.json()) as Product[];
    expect(products).toHaveLength(10);
  });

  test('búsqueda por texto filtra nombre y descripción', async ({ apiClient }) => {
    const response = await apiClient.listProducts({ search: 'smart' });

    const products = (await response.json()) as Product[];
    expect(products).toHaveLength(2);
    const names = products.map((p) => p.name);
    expect(names).toContain('Smartphone X12');
    expect(names).toContain('Smartwatch Fit 3');
  });

  test('búsqueda sin coincidencias devuelve lista vacía', async ({ apiClient }) => {
    const response = await apiClient.listProducts({ search: 'zzz-inexistente' });
    const products = (await response.json()) as Product[];
    expect(products).toHaveLength(0);
  });

  test('filtro por categoría devuelve solo esa categoría', async ({ apiClient }) => {
    const response = await apiClient.listProducts({ category: 'Accesorios' });

    const products = (await response.json()) as Product[];
    expect(products).toHaveLength(3);
    expect(products.every((p) => p.category === 'Accesorios')).toBeTruthy();
  });

  test('GET /products/deals devuelve solo productos en oferta', async ({ apiClient }) => {
    const response = await apiClient.listDeals();

    const products = (await response.json()) as Product[];
    expect(products).toHaveLength(7);
    expect(products.every((p) => p.originalPrice > p.price)).toBeTruthy();
  });

  test('POST crea un nuevo producto', async ({ apiClient }) => {
    const response = await apiClient.createProduct({
      name: 'Dock USB-C',
      description: 'Hub con HDMI, USB 3.0 y lector SD.',
      price: 59.9,
      originalPrice: 79.9,
      category: 'Accesorios',
      stock: 30,
      rating: 4.2,
      seller: 'KeyMasters',
      freeShipping: true,
    });

    expect(response.status()).toBe(201);
    const created = (await response.json()) as Product;
    expect(created.name).toBe('Dock USB-C');
    expect(created.id).toBeGreaterThan(0);
  });

  test('POST sin campos obligatorios devuelve 400', async ({ apiClient }) => {
    const response = await apiClient.createProduct({ name: 'Incompleto' });
    expect(response.status()).toBe(400);
  });

  test('PUT actualiza un producto existente', async ({ apiClient }) => {
    const response = await apiClient.updateProduct(1, { price: 1199.0 });

    expect(response.status()).toBe(200);
    const updated = (await response.json()) as Product;
    expect(updated.price).toBe(1199.0);
  });

  test('DELETE elimina un producto', async ({ apiClient }) => {
    const response = await apiClient.deleteProduct(1);
    expect(response.status()).toBe(204);

    const check = await apiClient.getProduct(1);
    expect(check.status()).toBe(404);
  });
});
