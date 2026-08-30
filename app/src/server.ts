import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { favoritesRouter } from './routes/favorites';
import { cartRouter } from './routes/cart';
import { ordersRouter } from './routes/orders';
import { authRouter } from './routes/auth';
import { qaRouter } from './routes/qa';
import { store } from './store';
import { isBugsEnabled, setBugsEnabled } from './bugs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Crea la app Express (API + web estática). Exportada para reutilizar en tests si hiciera falta. */
export function createApp() {
  const app = express();
  app.use(express.json());

  // --- API ---
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/qa', qaRouter);

  // Reporte HTML de Playwright (generado por el QA Runner), embebible en la UI.
  app.use('/qa-report', express.static(join(__dirname, '..', '..', 'playwright-report')));

  // Endpoint de salud, útil para el webServer de Playwright.
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Expone flags de configuración al frontend. `bugs` indica si el modo
  // Bug Hunting está activo (ver app/src/bugs.ts).
  app.get('/api/config', (_req, res) => res.json({ bugs: isBugsEnabled() }));

  // Alterna el modo Bug Hunting en caliente (usado por el switch de la UI
  // y por la suite de tests bug-hunting).
  app.post('/api/config/bugs', (req, res) => {
    const { enabled } = req.body as { enabled?: unknown };
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled (boolean) es obligatorio' });
    }
    setBugsEnabled(enabled);
    res.json({ bugs: isBugsEnabled() });
  });

  // Endpoint de utilidad para pruebas: reinicia SOLO los datos del store en
  // memoria (productos, carrito, favoritos, pedidos). NO toca el modo Bug
  // Hunting: reiniciar datos y cambiar el modo son acciones distintas, y
  // apagar el flag aquí rompía las corridas del QA Runner con el modo ON
  // (cada beforeEach que llamaba a reset lo desactivaba a mitad de corrida).
  app.post('/api/test/reset', (_req, res) => {
    store.reset();
    res.json({ status: 'reset' });
  });

  // --- Web estática ---
  // Sirve la carpeta app/public (index.html + assets). Se desactiva la
  // caché para que el navegador siempre tome la última versión de
  // app.js / styles.css tras un cambio (evita ver una UI "vieja").
  app.use(
    express.static(join(__dirname, '..', 'public'), {
      etag: false,
      lastModified: false,
      cacheControl: false,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      },
    }),
  );

  return app;
}

const PORT = Number(process.env.PORT ?? 3000);

// Arranca solo si se ejecuta directamente (no al importar).
if (process.argv[1] === __filename) {
  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`App corriendo en http://localhost:${PORT}`);
  });
}
