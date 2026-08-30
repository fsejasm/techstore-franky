import { Router, type Request, type Response } from 'express';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isBugsEnabled, setBugsEnabled } from '../bugs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/** Raíz del proyecto (app/src/routes -> ../../../). */
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

export const qaRouter = Router();

/**
 * QA Runner: ejecuta suites de Playwright desde la UI.
 *
 * SEGURIDAD (importante):
 *  - Solo se permiten "suites" de una LISTA BLANCA fija; no se acepta un
 *    comando de texto libre.
 *  - El filtro `grep` se pasa como ARGUMENTO al proceso (spawn con array),
 *    nunca interpolado en un shell, evitando inyección de comandos.
 *  - Este endpoint ejecuta procesos en el servidor: SOLO debe estar activo
 *    en local. Se desactiva salvo que QA_RUNNER=on (o entorno local).
 */

/** Suites permitidas: nombre -> proyectos de Playwright a ejecutar. */
const SUITES: Record<string, string[]> = {
  web: ['--project=web-chromium'],
  api: ['--project=api'],
  all: ['--project=web-chromium', '--project=api'],
  'bug-hunting': ['--project=bug-hunting-api', '--project=bug-hunting-web'],
};

/** El runner solo se habilita en local (no en producción/hosting). */
function isRunnerEnabled(): boolean {
  const flag = (process.env.QA_RUNNER ?? '').trim().toLowerCase();
  if (flag === 'off' || flag === 'false' || flag === '0') return false;
  // Habilitado por defecto salvo que NODE_ENV sea production.
  return process.env.NODE_ENV !== 'production';
}

/** Valida el filtro grep: solo caracteres seguros y longitud acotada. */
function isValidGrep(grep: unknown): grep is string {
  return (
    typeof grep === 'string' &&
    grep.length > 0 &&
    grep.length <= 100 &&
    /^[\w\sáéíóúÁÉÍÓÚñÑ:().,'"-]+$/u.test(grep)
  );
}

/** Ruta al CLI de Playwright (multiplataforma, sin shell). */
const PLAYWRIGHT_CLI = join(PROJECT_ROOT, 'node_modules', 'playwright', 'cli.js');

/**
 * Valida los parámetros y construye los argumentos del CLI de Playwright.
 * Devuelve { args, env } o un { error } si algo es inválido.
 */
function buildRun(params: { suite?: string; grep?: string; bugs?: boolean }):
  | { args: string[]; env: NodeJS.ProcessEnv }
  | { error: string } {
  const { suite, grep, bugs } = params;
  if (!suite || !(suite in SUITES)) {
    return { error: `Suite inválida. Opciones: ${Object.keys(SUITES).join(', ')}` };
  }
  const args = ['test', ...SUITES[suite], '--reporter=list,html'];
  if (grep !== undefined && grep !== '') {
    if (!isValidGrep(grep)) {
      return { error: 'Filtro (grep) contiene caracteres no permitidos.' };
    }
    args.push('--grep', grep);
  }
  const env = { ...process.env, BUGS: bugs ? 'on' : 'off' };
  return { args, env };
}

/** Extrae "N passed" / "N failed" del texto del reporter list. */
function parseSummary(output: string): { passed: number; failed: number } {
  const passed = /(\d+)\s+passed/.exec(output)?.[1];
  const failed = /(\d+)\s+failed/.exec(output)?.[1];
  return { passed: passed ? Number(passed) : 0, failed: failed ? Number(failed) : 0 };
}

/** GET /api/qa/suites — lista de suites disponibles. */
qaRouter.get('/suites', (_req: Request, res: Response) => {
  res.json({ suites: Object.keys(SUITES), enabled: isRunnerEnabled() });
});

/**
 * GET /api/qa/run/stream — ejecuta una suite y emite el log EN VIVO por
 * Server-Sent Events (SSE). Se usa GET porque EventSource solo soporta GET;
 * los parámetros viajan en el query string.
 *
 * Eventos emitidos:
 *  - event: log   -> data: { line }        (cada fragmento de salida)
 *  - event: done  -> data: { success, exitCode, durationMs, summary, reportUrl }
 *  - event: error -> data: { error }
 */
qaRouter.get('/run/stream', (req: Request, res: Response) => {
  if (!isRunnerEnabled()) {
    return res.status(403).json({ error: 'QA Runner deshabilitado en este entorno.' });
  }

  const suite = typeof req.query.suite === 'string' ? req.query.suite : undefined;
  const grep = typeof req.query.grep === 'string' ? req.query.grep : undefined;
  const bugs = req.query.bugs === 'true';

  const built = buildRun({ suite, grep, bugs });

  // Cabeceras SSE.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if ('error' in built) {
    send('error', { error: built.error });
    return res.end();
  }

  // El webServer de Playwright REUTILIZA este mismo servidor (mismo puerto)
  // en local, así que pasar BUGS por variable de entorno al proceso hijo no
  // basta. Activamos el modo en el flag GLOBAL de este proceso, que es el
  // que verán los tests, y lo restauramos al terminar.
  const prevBugs = isBugsEnabled();
  if (bugs) setBugsEnabled(true);
  const restoreBugs = () => setBugsEnabled(prevBugs);

  send('log', {
    line: `$ playwright ${built.args.join(' ')}${bugs ? '  (modo Bug Hunting ON)' : ''}\n`,
  });

  const startedAt = Date.now();
  let output = '';
  let child;
  try {
    child = spawn(process.execPath, [PLAYWRIGHT_CLI, ...built.args], {
      cwd: PROJECT_ROOT,
      env: built.env,
      shell: false,
    });
  } catch (err) {
    restoreBugs();
    send('error', { error: `No se pudo iniciar Playwright: ${(err as Error).message}` });
    return res.end();
  }

  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    output += text;
    send('log', { line: text });
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  child.on('error', (err) => {
    restoreBugs();
    send('error', { error: `Error de ejecución: ${err.message}` });
    res.end();
  });

  child.on('close', (code) => {
    restoreBugs();
    send('done', {
      suite,
      grep: grep ?? null,
      bugs: Boolean(bugs),
      exitCode: code,
      success: code === 0,
      durationMs: Date.now() - startedAt,
      summary: parseSummary(output),
      reportUrl: '/qa-report/',
    });
    res.end();
  });

  // Si el cliente cierra la conexión, matamos el proceso y restauramos.
  req.on('close', () => {
    if (child.exitCode === null) child.kill();
    restoreBugs();
  });
});

/**
 * POST /api/qa/run
 * body: { suite: string, grep?: string, bugs?: boolean }
 * Ejecuta la suite y devuelve la salida (stdout/stderr), el código de
 * salida y un resumen.
 */
qaRouter.post('/run', async (req: Request, res: Response) => {
  if (!isRunnerEnabled()) {
    return res.status(403).json({ error: 'QA Runner deshabilitado en este entorno.' });
  }

  const { suite, grep, bugs } = req.body as {
    suite?: string;
    grep?: string;
    bugs?: boolean;
  };

  const built = buildRun({ suite, grep, bugs });
  if ('error' in built) {
    return res.status(400).json({ error: built.error });
  }

  // Activa el modo en el flag global (el server que Playwright reutiliza)
  // y lo restaura al terminar. Ver nota en el endpoint /run/stream.
  const prevBugs = isBugsEnabled();
  if (bugs) setBugsEnabled(true);
  const restoreBugs = () => setBugsEnabled(prevBugs);

  const startedAt = Date.now();
  let output = '';

  let child;
  try {
    child = spawn(process.execPath, [PLAYWRIGHT_CLI, ...built.args], {
      cwd: PROJECT_ROOT,
      env: built.env,
      shell: false,
    });
  } catch (err) {
    restoreBugs();
    return res
      .status(500)
      .json({ error: `No se pudo iniciar Playwright: ${(err as Error).message}` });
  }

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  child.on('error', (err) => {
    restoreBugs();
    if (res.headersSent) return;
    res.status(500).json({ error: `No se pudo iniciar Playwright: ${err.message}` });
  });

  child.on('close', (code) => {
    restoreBugs();
    if (res.headersSent) return;
    res.json({
      suite,
      grep: grep ?? null,
      bugs: Boolean(bugs),
      exitCode: code,
      success: code === 0,
      durationMs: Date.now() - startedAt,
      summary: parseSummary(output),
      output,
      reportUrl: '/qa-report/',
    });
  });
});
