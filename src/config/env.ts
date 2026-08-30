import dotenv from 'dotenv';

// Load environment variables from a .env file if present.
dotenv.config();

/** Puerto donde corre la app local (web + API). */
const port = process.env.PORT ?? '3000';
const localBase = `http://localhost:${port}`;

/**
 * Configuración de entorno centralizada y tipada.
 * Por defecto apunta a la app local (Express) que Playwright levanta
 * automáticamente mediante `webServer`.
 */
export const env = {
  /** Puerto de la app local. */
  port: Number(port),

  /** URL base de la web bajo prueba. */
  webBaseURL: process.env.WEB_BASE_URL ?? localBase,

  /**
   * URL base del API bajo prueba (mismo servidor, sin el prefijo /api).
   * El prefijo /api se incluye en cada ruta del cliente para que
   * Playwright resuelva correctamente las rutas absolutas.
   */
  apiBaseURL: process.env.API_BASE_URL ?? localBase,

  /** Token opcional para requests al API. */
  apiToken: process.env.API_TOKEN ?? '',

  /** Nombre del entorno (local, staging, prod, etc.). */
  environment: process.env.TEST_ENV ?? 'local',

  /** Credenciales de prueba por defecto (usuario admin semilla del store). */
  credentials: {
    username: process.env.TEST_USERNAME ?? 'admin',
    password: process.env.TEST_PASSWORD ?? 'admin123',
  },

  /**
   * Credenciales por rol para las pruebas de autorización.
   * Coinciden con los usuarios semilla del store (app/src/store.ts).
   */
  users: {
    admin: { username: 'admin', password: 'admin123', role: 'admin' as const },
    manager: { username: 'manager', password: 'manager123', role: 'manager' as const },
    customer: { username: 'customer', password: 'customer123', role: 'customer' as const },
  },

  /** Flag de CI. */
  isCI: !!process.env.CI,
} as const;

export type Env = typeof env;
