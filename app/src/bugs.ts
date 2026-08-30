/**
 * Bugs didácticos (modo Bug Hunting).
 *
 * Este proyecto incluye bugs plantados A PROPÓSITO en lugares estratégicos
 * para practicar automatización de pruebas.
 *
 * El modo se puede alternar EN CALIENTE (sin reiniciar el servidor):
 *  - Desde la UI, con el switch "Bug Hunting" de la cabecera.
 *  - Por API: POST /api/config/bugs { "enabled": true|false }.
 *
 * El valor inicial se toma de la variable de entorno `BUGS` (on/true/1),
 * útil para CI. Por defecto está apagado, así la suite normal queda verde.
 *
 * Cada punto donde se consulta `isBugsEnabled()` está marcado con un
 * comentario `// BUG(n): ...` que explica el defecto introducido.
 *
 * Bugs plantados:
 *  - BUG(1) store.getCart      : el total del carrito ignora la cantidad.
 *  - BUG(2) store.listCategories: devuelve categorías duplicadas.
 *  - BUG(3) store.addFavorite   : permite favoritar un producto inexistente.
 *  - BUG(4) app.js refreshFavoriteState: contador de favoritos off-by-one.
 *  - BUG(5) middleware/authorize: omite el control de acceso por rol.
 *  - BUG(6) routes/auth login   : no valida la contraseña (acepta cualquiera).
 *  - BUG(7) app.js buildProductCard: % de descuento calculado con fórmula errónea.
 */
function parseFlag(value: string | undefined): boolean {
  const raw = (value ?? '').trim().toLowerCase();
  return raw === 'on' || raw === 'true' || raw === '1';
}

/** Estado mutable del modo Bug Hunting. Inicializado desde el entorno. */
let bugsEnabled = parseFlag(process.env.BUGS);

/** true cuando los bugs didácticos están activados. */
export function isBugsEnabled(): boolean {
  return bugsEnabled;
}

/** Activa o desactiva el modo Bug Hunting en runtime. */
export function setBugsEnabled(enabled: boolean): void {
  bugsEnabled = enabled;
}
