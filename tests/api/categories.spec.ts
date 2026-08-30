import { test, expect } from '../../src/fixtures/test-fixtures';
import { allure } from 'allure-playwright';

/**
 * Pruebas de API del endpoint de categorías (TechStore marketplace).
 */
test.describe('Categories API (via ApiClient)', () => {
  test.beforeEach(async ({ apiClient }) => {
    await allure.epic('API');
    await allure.feature('Categorías');
    await apiClient.reset();
  });

  test('GET /categories devuelve categorías únicas y ordenadas', async ({ apiClient }) => {
    const response = await apiClient.listCategories();

    expect(response.ok()).toBeTruthy();
    const categories = (await response.json()) as string[];

    // Categorías semilla esperadas.
    expect(categories).toEqual([
      'Accesorios',
      'Audio',
      'Celulares',
      'Computadoras',
      'Monitores',
      'Wearables',
    ]);

    // Sin duplicados.
    expect(new Set(categories).size).toBe(categories.length);
  });

  // Título sin tilde ("categoria") para que el filtro del QA Runner
  // coincida escribas o no el acento. Con Bug Hunting ON el endpoint
  // devuelve duplicados y este test falla.
  test('GET /categories sin categoria duplicada', async ({ apiClient }) => {
    const response = await apiClient.listCategories();
    const categories = (await response.json()) as string[];

    expect(categories).toHaveLength(6);
    expect(new Set(categories).size).toBe(categories.length);
  });
});
