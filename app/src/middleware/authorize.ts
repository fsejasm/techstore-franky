import type { NextFunction, Request, Response } from 'express';
import { store } from '../store';
import { isBugsEnabled } from '../bugs';
import type { Role, User } from '../types';

/** Extrae el token Bearer de la cabecera Authorization. */
function getToken(req: Request): string | undefined {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

/** Adjunta el usuario autenticado a la request si el token es válido. */
export function resolveUser(req: Request): User | undefined {
  const token = getToken(req);
  if (!token) return undefined;
  return store.findUserByToken(token);
}

/**
 * Middleware que exige autenticación y uno de los roles indicados.
 *
 * BUG(5): con el modo Bug Hunting activado se OMITE por completo el control
 * de acceso (se deja pasar a cualquiera, incluso sin token). Esto permite
 * una escalada de privilegios: un `customer` podría crear o eliminar
 * productos. Lo detecta un test que, autenticado como customer, intenta una
 * operación de admin y espera 403 pero recibe 200/201.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isBugsEnabled()) {
      return next(); // BUG(5): autorización desactivada.
    }

    const user = resolveUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'No autorizado para esta acción' });
    }
    next();
  };
}
