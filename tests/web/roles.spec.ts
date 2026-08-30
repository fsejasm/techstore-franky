import { test, expect } from '../../src/fixtures/test-fixtures';
import { env } from '../../src/config/env';
import { allure } from 'allure-playwright';

/**
 * Pruebas funcionales de Web UI de roles/privilegios (TechStore).
 * Verifican que la interfaz refleja el rol del usuario:
 *  - muestra el rol en la cabecera;
 *  - la sección "Gestión" solo aparece para roles con permiso;
 *  - el botón de eliminar producto solo aparece para admin.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Roles y privilegios (Web UI)', () => {
  test.beforeEach(async ({ request }) => {
    await allure.epic('Web UI');
    await allure.feature('Roles y privilegios');
    await request.post(`${env.apiBaseURL}/api/test/reset`);
  });

  test('admin ve su rol y la sección de Gestión con opción de eliminar', async ({
    loginPage,
    shopPage,
  }) => {
    await loginPage.open();
    await loginPage.login(env.users.admin.username, env.users.admin.password);

    await expect(shopPage.currentRole).toHaveText('admin');
    await expect(shopPage.navManage).toBeVisible();

    await shopPage.goToView('manage');
    await expect(shopPage.manageView).toBeVisible();
    // Producto semilla 1 con botón de eliminar (admin puede borrar).
    await expect(shopPage.manageDeleteButton(1)).toBeVisible();
  });

  test('manager ve Gestión pero SIN opción de eliminar', async ({ loginPage, shopPage }) => {
    await loginPage.open();
    await loginPage.login(env.users.manager.username, env.users.manager.password);

    await expect(shopPage.currentRole).toHaveText('manager');
    await expect(shopPage.navManage).toBeVisible();

    await shopPage.goToView('manage');
    await expect(shopPage.manageView).toBeVisible();
    // El manager no puede eliminar: el botón no debe existir.
    await expect(shopPage.manageDeleteButton(1)).toHaveCount(0);
  });

  test('customer NO ve la sección de Gestión', async ({ loginPage, shopPage }) => {
    await loginPage.open();
    await loginPage.login(env.users.customer.username, env.users.customer.password);

    await expect(shopPage.currentRole).toHaveText('customer');
    await expect(shopPage.navManage).toBeHidden();
  });

  test('un customer no puede crear productos (403) ni escalar privilegios', async ({
    request,
  }) => {
    // La sesión del customer no debe poder ejecutar acciones de gestión:
    // el backend debe rechazar la creación de productos con 403.
    const res = await request.post(`${env.apiBaseURL}/api/products`, {
      headers: { Authorization: 'Bearer token-customer-123' },
      data: {
        name: 'Intento del customer',
        description: 'No autorizado',
        price: 10,
        originalPrice: 10,
        category: 'Accesorios',
        stock: 1,
        rating: 0,
        seller: 'customer',
        freeShipping: false,
      },
    });
    expect(res.status()).toBe(403);
  });

  test('sin token no se permite crear productos (401)', async ({ request }) => {
    // Sin autenticación, la creación de productos debe devolver 401.
    const res = await request.post(`${env.apiBaseURL}/api/products`, {
      data: {
        name: 'Sin token',
        description: 'Anónimo',
        price: 10,
        originalPrice: 10,
        category: 'Accesorios',
        stock: 1,
        rating: 0,
        seller: 'anon',
        freeShipping: false,
      },
    });
    expect(res.status()).toBe(401);
  });

  test('admin crea un producto desde la UI de Gestión', async ({ loginPage, shopPage }) => {
    await loginPage.open();
    await loginPage.login(env.users.admin.username, env.users.admin.password);

    await shopPage.goToView('manage');
    await shopPage.createProductViaUI('Cargador rápido', 'Accesorios', 24.99);

    await expect(shopPage.manageFeedback).toContainText('creado correctamente');
  });
});
