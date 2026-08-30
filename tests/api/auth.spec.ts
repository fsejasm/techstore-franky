import { test, expect } from '../../src/fixtures/test-fixtures';
import { env } from '../../src/config/env';
import { allure } from 'allure-playwright';
import type { LoginResponse } from './types';

/**
 * Pruebas del endpoint de autenticación del API (Demo App local).
 */
test.describe('Auth API', () => {
  test.beforeEach(async () => {
    await allure.epic('API');
    await allure.feature('Autenticación');
  });

  test('login válido devuelve token y usuario', async ({ apiClient }) => {
    await allure.severity('critical');
    const response = await apiClient.login(
      env.credentials.username,
      env.credentials.password,
    );

    expect(response.status()).toBe(200);
    const body = (await response.json()) as LoginResponse;
    expect(body.token).toBeTruthy();
    expect(body.user.username).toBe(env.credentials.username);
  });

  test('login inválido devuelve 401', async ({ apiClient }) => {
    const response = await apiClient.login('admin', 'clave-incorrecta');
    expect(response.status()).toBe(401);
  });

  test('login sin campos devuelve 400', async ({ apiClient }) => {
    const response = await apiClient.login('', '');
    expect(response.status()).toBe(400);
  });
});
