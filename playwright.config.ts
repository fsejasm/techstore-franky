import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Configuración de Playwright con proyectos separados para Web UI y API.
 * - Los proyectos web corren pruebas de UI en navegador desde tests/web.
 * - El proyecto api corre pruebas HTTP headless desde tests/api usando
 *   el fixture nativo `request` (sin navegador).
 *
 * `webServer` levanta la app local (Express) antes de correr los tests.
 * Reportes: list + html + allure-playwright.
 *
 * Ver https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // La app usa un store en memoria global (único backend). Para evitar
  // interferencia de estado entre tests que mutan datos, se ejecuta con
  // un solo worker. Cada test resetea el store en su beforeEach.
  fullyParallel: false,
  workers: 1,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 0,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        environmentInfo: {
          Entorno: env.environment,
          Web_URL: env.webBaseURL,
          API_URL: env.apiBaseURL,
          Node: process.version,
        },
      },
    ],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Levanta la app local antes de las pruebas y la reutiliza en dev.
  webServer: {
    command: 'npm run start',
    url: `http://localhost:${env.port}/api/health`,
    reuseExistingServer: !env.isCI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'web-chromium',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.webBaseURL,
      },
    },
    {
      name: 'web-firefox',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: env.webBaseURL,
      },
    },
    {
      name: 'web-webkit',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Safari'],
        baseURL: env.webBaseURL,
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: env.apiBaseURL,
        extraHTTPHeaders: {
          Accept: 'application/json',
          ...(env.apiToken ? { Authorization: `Bearer ${env.apiToken}` } : {}),
        },
      },
    },
    // --- Suites "bug-hunting" (didácticas) ---
    // Detectan bugs plantados a propósito (ver app/src/bugs.ts). Deben
    // ejecutarse con el servidor arrancado con BUGS=on; entonces FALLAN a
    // propósito para demostrar que los tests atrapan los defectos. Con el
    // servidor normal (BUGS off) pasan. No se incluyen en la suite normal.
    // Cómo correrlas (PowerShell):
    //   $env:BUGS='on'; npm run test:bugs
    {
      name: 'bug-hunting-api',
      testDir: './tests/bug-hunting/api',
      use: {
        baseURL: env.apiBaseURL,
        extraHTTPHeaders: {
          Accept: 'application/json',
          ...(env.apiToken ? { Authorization: `Bearer ${env.apiToken}` } : {}),
        },
      },
    },
    {
      name: 'bug-hunting-web',
      testDir: './tests/bug-hunting/web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.webBaseURL,
      },
    },
  ],
});
