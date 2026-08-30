import { test, expect } from '../../src/fixtures/test-fixtures';
import { env } from '../../src/config/env';
import { allure } from 'allure-playwright';
import { ROLE_TOKENS } from './clients/ApiClient';
import type { LoginResponse, Product } from './types';

/**
 * Pruebas funcionales de API de roles y control de acceso (TechStore).
 * Verifican que:
 *  - el login devuelve el rol y los permisos correctos por usuario;
 *  - las rutas protegidas de productos respetan los permisos por rol;
 *  - sin token válido se responde 401 y con rol insuficiente 403.
 *
 * Se ejecutan en serie porque comparten el store en memoria del servidor.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Roles y autorización (API)', () => {
  test.beforeEach(async ({ apiClient }) => {
    await allure.epic('API');
    await allure.feature('Roles y autorización');
    await apiClient.reset();
  });

  test('login de cada rol devuelve rol y permisos correctos', async ({ apiClient }) => {
    const admin = (await (await apiClient.login('admin', 'admin123')).json()) as LoginResponse;
    expect(admin.user.role).toBe('admin');
    expect(admin.user.permissions).toMatchObject({
      manageProducts: true,
      deleteProducts: true,
      viewAllOrders: true,
    });

    const manager = (await (
      await apiClient.login('manager', 'manager123')
    ).json()) as LoginResponse;
    expect(manager.user.role).toBe('manager');
    expect(manager.user.permissions).toMatchObject({
      manageProducts: true,
      deleteProducts: false,
    });

    const customer = (await (
      await apiClient.login('customer', 'customer123')
    ).json()) as LoginResponse;
    expect(customer.user.role).toBe('customer');
    expect(customer.user.permissions).toMatchObject({
      manageProducts: false,
      deleteProducts: false,
    });
  });

  test('admin puede crear un producto', async ({ apiClient }) => {
    apiClient.authAs('admin');
    const res = await apiClient.createProduct(sampleProduct('Producto admin'));
    expect(res.status()).toBe(201);
  });

  test('manager puede crear pero NO eliminar productos', async ({ apiClient }) => {
    apiClient.authAs('manager');

    const create = await apiClient.createProduct(sampleProduct('Producto manager'));
    expect(create.status()).toBe(201);

    const del = await apiClient.deleteProduct(1);
    expect(del.status()).toBe(403);
  });

  test('customer NO puede crear ni eliminar productos', async ({ apiClient }) => {
    apiClient.authAs('customer');

    const create = await apiClient.createProduct(sampleProduct('Producto customer'));
    expect(create.status()).toBe(403);

    const del = await apiClient.deleteProduct(1);
    expect(del.status()).toBe(403);
  });

  test('sin token no se permite crear productos (401)', async ({ apiClient }) => {
    apiClient.authAs(null);
    const res = await apiClient.createProduct(sampleProduct('Sin token'));
    expect(res.status()).toBe(401);
  });

  test('cualquiera puede leer el catálogo (GET público)', async ({ apiClient }) => {
    apiClient.authAs(null);
    const res = await apiClient.listProducts();
    expect(res.ok()).toBeTruthy();
    const products = (await res.json()) as Product[];
    expect(products.length).toBeGreaterThan(0);
  });

  test('los tokens semilla por rol son distintos', () => {
    const tokens = Object.values(ROLE_TOKENS);
    expect(new Set(tokens).size).toBe(tokens.length);
    // Coinciden con las credenciales declaradas en env.
    expect(env.users.admin.role).toBe('admin');
    expect(env.users.manager.role).toBe('manager');
    expect(env.users.customer.role).toBe('customer');
  });
});

function sampleProduct(name: string) {
  return {
    name,
    description: `${name} de prueba`,
    price: 10,
    originalPrice: 10,
    category: 'Accesorios',
    stock: 5,
    rating: 0,
    seller: 'QA',
    freeShipping: false,
  };
}
