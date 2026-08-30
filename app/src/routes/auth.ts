import { Router, type Request, type Response } from 'express';
import { store } from '../store';
import { isBugsEnabled } from '../bugs';
import { permissionsFor, type LoginInput, type LoginResponse } from '../types';

export const authRouter = Router();

/** POST /api/auth/login */
authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as Partial<LoginInput>;
  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son obligatorios' });
  }

  // BUG(6): con el modo Bug Hunting activado, el login NO valida la
  // contraseña: basta con que el usuario exista. Un fallo de autenticación
  // clásico (acepta cualquier contraseña). Lo detecta un test que inicia
  // sesión con usuario válido + contraseña incorrecta y espera 401.
  const user = isBugsEnabled()
    ? store.findUserByUsername(username)
    : store.findUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const response: LoginResponse = {
    token: user.token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: permissionsFor(user.role),
    },
  };
  res.json(response);
});
