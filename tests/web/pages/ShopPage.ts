import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

type View = 'home' | 'deals' | 'favorites' | 'orders' | 'manage';

/**
 * Page Object para el marketplace TechStore (post-login): navegación por
 * menú, búsqueda, filtros por categoría, catálogo, ofertas, favoritos,
 * carrito, checkout e historial de pedidos.
 */
export class ShopPage extends BasePage {
  // Cabecera / sesión
  readonly currentUser: Locator;
  readonly currentRole: Locator;
  readonly logoutButton: Locator;
  readonly sidebar: Locator;
  readonly navManage: Locator;
  readonly manageView: Locator;
  readonly createProductButton: Locator;
  readonly manageFeedback: Locator;

  // Búsqueda
  readonly searchInput: Locator;
  readonly searchButton: Locator;

  // Navegación
  readonly navHome: Locator;
  readonly navDeals: Locator;
  readonly navFavorites: Locator;
  readonly navOrders: Locator;
  readonly favoritesCount: Locator;

  // Vistas
  readonly homeView: Locator;
  readonly dealsView: Locator;
  readonly favoritesView: Locator;
  readonly ordersView: Locator;
  /** Alias de la vista principal (Inicio). */
  readonly view: Locator;

  // Catálogo
  readonly catalogTitle: Locator;
  readonly categoryFilters: Locator;
  readonly productGrid: Locator;
  readonly resultsEmpty: Locator;

  // Ofertas / favoritos / pedidos
  readonly dealsGrid: Locator;
  readonly favoritesGrid: Locator;
  readonly favoritesEmpty: Locator;
  readonly ordersList: Locator;
  readonly ordersEmpty: Locator;

  // Carrito
  readonly cartToggle: Locator;
  readonly cartCount: Locator;
  readonly cartPanel: Locator;
  readonly cartOverlay: Locator;
  readonly cartItems: Locator;
  readonly cartEmpty: Locator;
  readonly cartTotal: Locator;
  readonly checkoutButton: Locator;
  readonly orderConfirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.currentUser = page.getByTestId('current-user');
    this.currentRole = page.getByTestId('current-role');
    this.logoutButton = page.getByTestId('logout-button');
    this.sidebar = page.getByTestId('sidebar');
    this.navManage = page.getByTestId('nav-manage');
    this.manageView = page.getByTestId('manage-view');
    this.createProductButton = page.getByTestId('create-product-button');
    this.manageFeedback = page.getByTestId('manage-feedback');

    this.searchInput = page.getByTestId('search-input');
    this.searchButton = page.getByTestId('search-button');

    this.navHome = page.getByTestId('nav-home');
    this.navDeals = page.getByTestId('nav-deals');
    this.navFavorites = page.getByTestId('nav-favorites');
    this.navOrders = page.getByTestId('nav-orders');
    this.favoritesCount = page.getByTestId('favorites-count');

    this.homeView = page.getByTestId('home-view');
    this.dealsView = page.getByTestId('deals-view');
    this.favoritesView = page.getByTestId('favorites-view');
    this.ordersView = page.getByTestId('orders-view');
    this.view = this.homeView;

    this.catalogTitle = page.getByTestId('catalog-title');
    this.categoryFilters = page.getByTestId('category-filters');
    this.productGrid = page.getByTestId('product-grid');
    this.resultsEmpty = page.getByTestId('results-empty');

    this.dealsGrid = page.getByTestId('deals-grid');
    this.favoritesGrid = page.getByTestId('favorites-grid');
    this.favoritesEmpty = page.getByTestId('favorites-empty');
    this.ordersList = page.getByTestId('orders-list');
    this.ordersEmpty = page.getByTestId('orders-empty');

    this.cartToggle = page.getByTestId('cart-toggle');
    this.cartCount = page.getByTestId('cart-count');
    this.cartPanel = page.getByTestId('cart-panel');
    this.cartOverlay = page.getByTestId('cart-overlay');
    this.cartItems = page.getByTestId('cart-items');
    this.cartEmpty = page.getByTestId('cart-empty');
    this.cartTotal = page.getByTestId('cart-total');
    this.checkoutButton = page.getByTestId('checkout-button');
    this.orderConfirmation = page.getByTestId('order-confirmation');
  }

  // ---- Navegación ----
  async goToView(view: View): Promise<void> {
    const map: Record<View, Locator> = {
      home: this.navHome,
      deals: this.navDeals,
      favorites: this.navFavorites,
      orders: this.navOrders,
      manage: this.navManage,
    };
    await map[view].click();
  }

  /** Crea un producto desde la vista de Gestión. */
  async createProductViaUI(name: string, category: string, price: number): Promise<void> {
    await this.page.getByTestId('new-product-name').fill(name);
    await this.page.getByTestId('new-product-category').fill(category);
    await this.page.getByTestId('new-product-price').fill(String(price));
    await this.createProductButton.click();
  }

  /** Botón de eliminar de un producto en la vista de Gestión. */
  manageDeleteButton(id: number): Locator {
    return this.page.getByTestId(`manage-delete-${id}`);
  }

  // ---- Búsqueda / filtros ----
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  /** Aplica un filtro de categoría; sin argumento usa "Todas". */
  async filterByCategory(category?: string): Promise<void> {
    const testId = category ? `category-${category}` : 'category-all';
    await this.page.getByTestId(testId).click();
  }

  /** Todos los chips de categoría (incluye "Todas"). */
  categoryChips(): Locator {
    return this.categoryFilters.locator('.chip');
  }

  // ---- Catálogo ----
  /** Tarjetas del catálogo (vista Inicio). */
  products(): Locator {
    return this.productGrid.locator('.product-card');
  }

  /** Tarjeta de producto por id (busca en el documento). */
  product(id: number): Locator {
    return this.page.getByTestId(`product-${id}`);
  }

  /** Badge de descuento (ej. "-13%") dentro de la tarjeta de un producto. */
  dealBadge(id: number): Locator {
    return this.product(id).getByTestId('deal-badge');
  }

  /** Tarjetas de la vista de ofertas. */
  deals(): Locator {
    return this.dealsGrid.locator('.product-card');
  }

  /** Tarjetas de la vista de favoritos. */
  favorites(): Locator {
    return this.favoritesGrid.locator('.product-card');
  }

  // ---- Favoritos ----
  /**
   * Marca/desmarca un producto como favorito. El mismo producto puede
   * aparecer en varias vistas (Inicio/Ofertas/Favoritos), todas en el
   * DOM; se actúa sobre el botón visible.
   */
  async toggleFavorite(id: number): Promise<void> {
    await this.page.getByTestId(`favorite-${id}`).locator('visible=true').click();
  }

  favoriteButton(id: number): Locator {
    return this.page.getByTestId(`favorite-${id}`).locator('visible=true');
  }

  // ---- Carrito ----
  async addProductToCart(id: number): Promise<void> {
    await this.page.getByTestId(`add-to-cart-${id}`).locator('visible=true').click();
  }

  async openCart(): Promise<void> {
    await this.cartToggle.click();
  }

  async closeCart(): Promise<void> {
    // Ya no hay botón X: se cierra con el overlay (clic fuera).
    await this.cartOverlay.click();
    // Espera a que el panel y su overlay terminen de ocultarse (animación),
    // para que no intercepten clics posteriores.
    await this.cartPanel.waitFor({ state: 'hidden' });
  }

  items(): Locator {
    return this.cartItems.locator('li');
  }

  cartItem(productId: number): Locator {
    return this.page.getByTestId(`cart-item-${productId}`);
  }

  async removeFromCart(productId: number): Promise<void> {
    await this.page.getByTestId(`remove-from-cart-${productId}`).click();
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }

  // ---- Pedidos ----
  orders(): Locator {
    return this.ordersList.locator('li');
  }

  order(id: number): Locator {
    return this.page.getByTestId(`order-${id}`);
  }

  // ---- Sesión ----
  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
