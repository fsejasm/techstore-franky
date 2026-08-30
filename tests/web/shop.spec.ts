import { test, expect } from '../../src/fixtures/test-fixtures';
import { env } from '../../src/config/env';
import { allure } from 'allure-playwright';

/**
 * Pruebas de Web UI del marketplace TechStore: navegación por menú,
 * búsqueda, filtros por categoría, ofertas, favoritos, carrito, checkout
 * e historial de pedidos. Reinicia el store antes de cada test.
 */
// Estos tests mutan el store en memoria (carrito, favoritos y pedidos son
// compartidos por el servidor). Se ejecutan en serie para aislarlos.
test.describe.configure({ mode: 'serial' });

test.describe('Marketplace TechStore', () => {
  test.beforeEach(async ({ request, loginPage, shopPage }) => {
    await allure.epic('Web UI');
    await allure.feature('Marketplace');

    await request.post(`${env.apiBaseURL}/api/test/reset`);

    await loginPage.open();
    await loginPage.login(env.credentials.username, env.credentials.password);
    await expect(shopPage.homeView).toBeVisible();
  });

  test('el menú lateral está visible tras el login', async ({ shopPage }) => {
    await allure.story('Navegación');
    await expect(shopPage.sidebar).toBeVisible();
    await expect(shopPage.navHome).toBeVisible();
    await expect(shopPage.navDeals).toBeVisible();
    await expect(shopPage.navFavorites).toBeVisible();
    await expect(shopPage.navOrders).toBeVisible();
  });

  test('muestra el catálogo semilla completo', async ({ shopPage }) => {
    await allure.story('Catálogo');
    await expect(shopPage.products()).toHaveCount(10);
    await expect(shopPage.productGrid).toContainText('Laptop Pro 14"');
    await expect(shopPage.product(6)).toContainText('Smartphone X12');
  });

  test('la búsqueda filtra los productos por texto', async ({ shopPage }) => {
    await allure.story('Búsqueda');
    await allure.severity('critical');

    await shopPage.search('smart');

    // "Smartphone X12" y "Smartwatch Fit 3".
    await expect(shopPage.products()).toHaveCount(2);
    await expect(shopPage.productGrid).toContainText('Smartphone X12');
    await expect(shopPage.productGrid).toContainText('Smartwatch Fit 3');
  });

  test('una búsqueda sin resultados muestra el estado vacío', async ({ shopPage }) => {
    await allure.story('Búsqueda');
    await shopPage.search('xyz-no-existe');

    await expect(shopPage.products()).toHaveCount(0);
    await expect(shopPage.resultsEmpty).toBeVisible();
  });

  test('el filtro por categoría acota el catálogo', async ({ shopPage }) => {
    await allure.story('Categorías');

    // "Todas" + 6 categorías únicas (sin duplicados) = 7 chips.
    await expect(shopPage.categoryChips()).toHaveCount(7);

    await shopPage.filterByCategory('Accesorios');

    await expect(shopPage.catalogTitle).toContainText('Accesorios');
    // Teclado, Mouse y Cámara web.
    await expect(shopPage.products()).toHaveCount(3);

    await shopPage.filterByCategory(); // Todas
    await expect(shopPage.products()).toHaveCount(10);
  });

  // Título sin tilde ("categoria") para que el filtro del QA Runner
  // coincida escribas o no el acento.
  test('los chips de categoria no tienen duplicados', async ({ shopPage }) => {
    await allure.story('Categorías');

    // Correcto: "Todas" + 6 categorías únicas = 7 chips.
    // Con Bug Hunting ON el backend no deduplica y aparecen más chips,
    // por lo que este test falla y evidencia el bug.
    await expect(shopPage.categoryChips()).toHaveCount(7);
  });

  test('la vista de ofertas solo muestra productos rebajados', async ({ shopPage }) => {
    await allure.story('Ofertas');

    await shopPage.goToView('deals');
    await expect(shopPage.dealsView).toBeVisible();

    // 7 productos semilla tienen originalPrice > price.
    await expect(shopPage.deals()).toHaveCount(7);
    await expect(shopPage.dealsGrid).toContainText('Laptop Pro 14"');
  });

  test('el porcentaje de descuento se calcula correctamente', async ({ shopPage }) => {
    await allure.story('Ofertas');

    // Laptop Pro 14" (id 1): $1299 sobre $1499 → 13% de descuento.
    // Con Bug Hunting ON la fórmula está mal y este test falla.
    await expect(shopPage.dealBadge(1)).toHaveText('-13%');
  });

  test('marca un favorito y lo ve en la vista de favoritos', async ({ shopPage }) => {
    await allure.story('Favoritos');
    await allure.severity('critical');

    await shopPage.toggleFavorite(1);
    await expect(shopPage.favoritesCount).toHaveText('1');

    await shopPage.goToView('favorites');
    await expect(shopPage.favoritesView).toBeVisible();
    await expect(shopPage.favorites()).toHaveCount(1);
    await expect(shopPage.favoritesGrid).toContainText('Laptop Pro 14"');
  });

  test('desmarcar un favorito lo quita de la lista', async ({ shopPage }) => {
    await allure.story('Favoritos');

    await shopPage.toggleFavorite(2);
    await expect(shopPage.favoritesCount).toHaveText('1');

    await shopPage.goToView('favorites');
    await expect(shopPage.favorites()).toHaveCount(1);

    await shopPage.toggleFavorite(2); // desmarca desde la vista de favoritos
    await expect(shopPage.favorites()).toHaveCount(0);
    await expect(shopPage.favoritesEmpty).toBeVisible();
    await expect(shopPage.favoritesCount).toHaveText('0');
  });

  test('agrega productos al carrito y actualiza el contador y total', async ({ shopPage }) => {
    await allure.story('Carrito');
    await allure.severity('critical');

    await shopPage.addProductToCart(1);
    await shopPage.addProductToCart(4);
    await expect(shopPage.cartCount).toHaveText('2');

    await shopPage.openCart();
    await expect(shopPage.items()).toHaveCount(2);
    // 1299.00 + 449.00
    await expect(shopPage.cartTotal).toHaveText('$1748.00');
  });

  test('el total del carrito multiplica por la cantidad', async ({ shopPage }) => {
    await allure.story('Carrito');
    await allure.severity('critical');

    // Mismo producto dos veces (Teclado, id 3, $89.50 c/u) → total $179.00.
    // Con cantidad > 1, un total mal calculado (que ignore la cantidad) se
    // delata: por eso este caso complementa al de dos productos distintos.
    await shopPage.addProductToCart(3);
    await shopPage.addProductToCart(3);
    await expect(shopPage.cartCount).toHaveText('2');

    await shopPage.openCart();
    await expect(shopPage.items()).toHaveCount(1);
    await expect(shopPage.cartTotal).toHaveText('$179.00');
  });

  test('quita un producto del carrito', async ({ shopPage }) => {
    await allure.story('Carrito');

    await shopPage.addProductToCart(3);
    await shopPage.openCart();
    await expect(shopPage.items()).toHaveCount(1);

    await shopPage.removeFromCart(3);
    await expect(shopPage.items()).toHaveCount(0);
    await expect(shopPage.cartEmpty).toBeVisible();
    await expect(shopPage.cartCount).toHaveText('0');
  });

  test('finaliza la compra y el pedido aparece en Mis pedidos', async ({ shopPage }) => {
    await allure.story('Checkout');
    await allure.severity('critical');

    await shopPage.addProductToCart(6);
    await shopPage.openCart();
    await shopPage.checkout();

    await expect(shopPage.orderConfirmation).toBeVisible();
    await expect(shopPage.orderConfirmation).toContainText('Pedido #1 confirmado');
    await expect(shopPage.cartCount).toHaveText('0');

    // Cierra el carrito (su overlay cubre el resto de la página) antes de
    // navegar, igual que haría un usuario real.
    await shopPage.closeCart();
    await shopPage.goToView('orders');
    await expect(shopPage.ordersView).toBeVisible();
    await expect(shopPage.orders()).toHaveCount(1);
    await expect(shopPage.order(1)).toContainText('Pedido #1');
  });

  test('Mis pedidos muestra estado vacío sin compras', async ({ shopPage }) => {
    await allure.story('Pedidos');

    await shopPage.goToView('orders');
    await expect(shopPage.ordersEmpty).toBeVisible();
    await expect(shopPage.orders()).toHaveCount(0);
  });

  test('el botón de checkout está deshabilitado con el carrito vacío', async ({ shopPage }) => {
    await allure.story('Checkout');

    await shopPage.openCart();
    await expect(shopPage.checkoutButton).toBeDisabled();
  });
});
