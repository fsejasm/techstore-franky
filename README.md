# Test Automation App

Framework de automatización con **Playwright + TypeScript** que incluye:

- Una **Demo App** propia (web + API REST) construida con **Express + TypeScript** y store en memoria.
- Pruebas de **Web UI** con Page Object Model.
- Pruebas de **API** con el `request` nativo de Playwright.
- Reportes con **Allure**.

Playwright levanta la Demo App automáticamente antes de correr los tests (`webServer`).

## Requisitos

- Node.js 18+ (LTS recomendado)
- npm
- Java (JRE/JDK) — solo para generar reportes Allure. El script de Allure
  corrige automáticamente un `JAVA_HOME` que apunte por error a `...\bin`.

## Setup

```bash
npm install
npx playwright install        # descarga navegadores (para tests web)
cp .env.example .env          # opcional: sobreescribir configuración
```

Por defecto todo corre en local, sin configuración extra:

- Web: `http://localhost:3000`
- API: `http://localhost:3000/api`
- Credenciales de prueba: `admin` / `admin123`

## Estructura

```
.
├── app/                        # Demo App (bajo prueba)
│   ├── src/
│   │   ├── server.ts           # Express: sirve API + web estática
│   │   ├── store.ts            # store en memoria (con reset y semilla)
│   │   ├── types.ts
│   │   └── routes/
│   │       ├── posts.ts        # CRUD /api/posts
│   │       └── auth.ts         # POST /api/auth/login
│   └── public/                 # web estática (index.html, app.js, styles.css)
├── playwright.config.ts        # proyectos web-* + api, webServer, reporters
├── scripts/allure-generate.mjs # generación robusta del reporte Allure
├── allure/categories.json      # categorías de fallos para Allure
├── src/
│   ├── config/env.ts           # configuración de entorno tipada
│   └── fixtures/test-fixtures.ts  # fixtures (page objects + api client)
└── tests/
    ├── web/                    # Web UI
    │   ├── pages/              # Page Objects (BasePage, LoginPage, PostsPage)
    │   ├── login.spec.ts
    │   └── posts.spec.ts
    └── api/                    # API
        ├── clients/ApiClient.ts
        ├── types.ts
        ├── auth.spec.ts
        ├── posts.spec.ts          # vía ApiClient
        └── posts-native.spec.ts   # vía request nativo
```

## La Demo App

Endpoints del API:

| Método | Ruta                | Descripción                         |
| ------ | ------------------- | ----------------------------------- |
| POST   | `/api/auth/login`   | Autenticación (devuelve token)      |
| GET    | `/api/posts`        | Lista posts                         |
| GET    | `/api/posts/:id`    | Obtiene un post                     |
| POST   | `/api/posts`        | Crea un post                        |
| PUT    | `/api/posts/:id`    | Actualiza un post                   |
| DELETE | `/api/posts/:id`    | Elimina un post                     |
| GET    | `/api/health`       | Health check                        |
| POST   | `/api/test/reset`   | Reinicia el store (uso en pruebas)  |

La web (`/`) es un cliente mínimo (login + gestión de posts) que consume el API.

Para levantar la app manualmente:

```bash
npm run start     # http://localhost:3000
npm run dev       # con recarga automática (watch)
```

## Ejecutar tests

```bash
npm test              # todo (todos los proyectos)
npm run test:web      # Web UI (chromium)
npm run test:api      # solo API
npm run test:headed   # web con navegador visible
npm run test:ui       # modo UI de Playwright
npm run test:debug    # depuración paso a paso
npm run report        # abre el último reporte HTML de Playwright
npm run typecheck     # chequeo de tipos TypeScript
```

Otros navegadores (requieren instalarlos con `npx playwright install firefox webkit`):

```bash
npx playwright test --project=web-firefox
npx playwright test --project=web-webkit
```

> Nota: la Demo App usa un store en memoria global (un único backend), por eso
> los tests corren con un solo worker y cada uno resetea el estado en su
> `beforeEach` para garantizar aislamiento.

## Reportes con Allure

```bash
npm test                  # genera allure-results/ durante la corrida
npm run allure:generate   # genera el reporte HTML en allure-report/
npm run allure:open       # abre el reporte generado
npm run allure:serve      # genera y sirve el reporte en un solo paso
```

Los tests incluyen metadata de Allure (epic, feature, story, severity) y el
reporte muestra información del entorno (URLs, versión de Node) y categorías
de fallos definidas en `allure/categories.json`.

## Escribir tests

**Web UI** — importa desde los fixtures para obtener los page objects:

```ts
import { test, expect } from '../../src/fixtures/test-fixtures';

test('ejemplo', async ({ loginPage, postsPage }) => {
  await loginPage.open();
  await loginPage.login('admin', 'admin123');
  await expect(postsPage.view).toBeVisible();
});
```

**API** — usa el fixture `apiClient` o el `request` nativo directamente:

```ts
// Con el cliente
import { test, expect } from '../../src/fixtures/test-fixtures';
test('obtiene un post', async ({ apiClient }) => {
  const res = await apiClient.getPost(1);
  expect(res.ok()).toBeTruthy();
});

// Con el request nativo
import { test, expect } from '@playwright/test';
test('obtiene un post', async ({ request }) => {
  const res = await request.get('/api/posts/1');
  expect(res.ok()).toBeTruthy();
});
```
