// Cliente web de TechStore (marketplace). Sin framework, JS nativo.
// Los elementos usan data-testid para selectores estables en los tests.

const el = (id) => document.getElementById(id);
const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);

const loginView = byTestId('login-view');
const session = byTestId('session');
const currentUser = byTestId('current-user');
const loginButton = byTestId('login-button');
const loginError = byTestId('login-error');
const sidebar = byTestId('sidebar');

// Sesión / roles
const currentRole = byTestId('current-role');
const navManage = byTestId('nav-manage');

// Vistas
const views = {
  home: byTestId('home-view'),
  deals: byTestId('deals-view'),
  favorites: byTestId('favorites-view'),
  orders: byTestId('orders-view'),
  manage: byTestId('manage-view'),
  qa: byTestId('qa-view'),
};

// QA Runner
const qaSuite = byTestId('qa-suite');
const qaGrep = byTestId('qa-grep');
const qaBugs = byTestId('qa-bugs');
const qaRunButton = byTestId('qa-run-button');
const qaStatus = byTestId('qa-status');
const qaOutput = byTestId('qa-output');
const qaReportWrap = byTestId('qa-report-wrap');
const qaReportFrame = byTestId('qa-report-frame');

// Gestión de productos (vista manage)
const manageRole = byTestId('manage-role');
const manageHint = byTestId('manage-hint');
const createProductForm = byTestId('create-product-form');
const newProductName = byTestId('new-product-name');
const newProductCategory = byTestId('new-product-category');
const newProductPrice = byTestId('new-product-price');
const manageFeedback = byTestId('manage-feedback');
const manageList = byTestId('manage-list');

// Catálogo / filtros
const catalogTitle = byTestId('catalog-title');
const categoryFilters = byTestId('category-filters');
const productGrid = byTestId('product-grid');
const resultsEmpty = byTestId('results-empty');
const searchForm = byTestId('search-form');
const searchInput = byTestId('search-input');

// Ofertas / favoritos / pedidos
const dealsGrid = byTestId('deals-grid');
const favoritesGrid = byTestId('favorites-grid');
const favoritesEmpty = byTestId('favorites-empty');
const favoritesCount = byTestId('favorites-count');
const ordersList = byTestId('orders-list');
const ordersEmpty = byTestId('orders-empty');

// Carrito
const cartPanel = byTestId('cart-panel');
const cartToggle = byTestId('cart-toggle');
const cartOverlay = byTestId('cart-overlay');
const cartCount = byTestId('cart-count');
const cartItems = byTestId('cart-items');
const cartEmpty = byTestId('cart-empty');
const cartTotal = byTestId('cart-total');
const checkoutButton = byTestId('checkout-button');
const orderConfirmation = byTestId('order-confirmation');

// Switch de Bug Hunting
const bugToggle = byTestId('bug-toggle');
const bugStatus = byTestId('bug-status');

let token = null;
let currentUsername = null;
let currentPermissions = {};
let activeCategory = null;
let favoriteIds = new Set();
// Flag de bugs didácticos (viene de /api/config). Ver app/src/bugs.ts.
let BUGS = false;

function reflectBugState() {
  bugToggle.checked = BUGS;
  bugStatus.textContent = BUGS ? 'ON' : 'OFF';
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    BUGS = Boolean(cfg.bugs);
  } catch {
    BUGS = false;
  }
  reflectBugState();
}

/** Alterna el modo Bug Hunting en el servidor y refresca la vista actual. */
async function setBugMode(enabled) {
  try {
    const res = await fetch('/api/config/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const cfg = await res.json();
    BUGS = Boolean(cfg.bugs);
  } catch {
    BUGS = enabled;
  }
  reflectBugState();
  // Vuelve a pedir TODOS los datos afectados para que el cambio se refleje
  // al instante sin recargar la página: categorías (BUG 2), favoritos y su
  // contador (BUG 4) y carrito (BUG 1). Solo si hay sesión iniciada.
  if (!loginView.hidden) return;
  await loadCategories();
  await refreshFavoriteState();
  await refreshCart();
  const active = Object.entries(views).find(([, v]) => !v.hidden);
  if (active) showView(active[0]);
}

const money = (value) => `$${Number(value).toFixed(2)}`;
const stars = (rating) => `★ ${Number(rating).toFixed(1)}`;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ---------- Sesión ----------
function isLoggedIn() {
  return Boolean(token);
}

function showLoggedIn(user) {
  currentUsername = user.username;
  currentPermissions = user.permissions ?? {};
  loginView.hidden = true; // se oculta el panel de login
  session.hidden = false;
  sidebar.hidden = false; // aparece el menú de navegación
  currentUser.textContent = user.username;
  currentRole.textContent = user.role;
  currentRole.dataset.role = user.role;
  // La entrada "Gestión" solo se muestra a quien puede gestionar productos.
  navManage.hidden = !currentPermissions.manageProducts;
  showView('home');
}

/**
 * Estado sin sesión: el panel de login queda a la izquierda y el catálogo
 * (home) se muestra a la derecha en modo "solo ver". El menú de navegación
 * permanece oculto hasta iniciar sesión.
 */
function showLoggedOut() {
  loginView.hidden = false;
  session.hidden = true;
  sidebar.hidden = true;
  cartPanel.hidden = true;
  navManage.hidden = true;
  token = null;
  currentUsername = null;
  currentPermissions = {};
  // Muestra solo la vista de inicio (catálogo público).
  for (const [key, section] of Object.entries(views)) {
    section.hidden = key !== 'home';
  }
  loadCategories();
  loadProducts();
}

/**
 * Puerta de acceso para acciones que requieren sesión. Si no hay sesión,
 * enfoca el formulario de login y devuelve false.
 */
function requireLogin() {
  if (isLoggedIn()) return true;
  loginView.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const usernameInput = el('username');
  if (usernameInput) usernameInput.focus();
  loginError.textContent = 'Inicia sesión para continuar.';
  loginError.hidden = false;
  return false;
}

async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al iniciar sesión');
  }
  const data = await res.json();
  token = data.token;
  return data.user;
}

// ---------- Navegación entre vistas ----------
function showView(name) {
  for (const [key, section] of Object.entries(views)) {
    section.hidden = key !== name;
  }
  for (const link of sidebar.querySelectorAll('.menu-link')) {
    link.classList.toggle('active', link.dataset.view === name);
  }
  if (name === 'home') loadProducts();
  if (name === 'deals') loadDeals();
  if (name === 'favorites') loadFavorites();
  if (name === 'orders') loadOrders();
  if (name === 'manage') loadManage();
  if (name === 'qa') loadQa();
}

// ---------- Catálogo ----------
async function loadCategories() {
  const res = await fetch('/api/categories');
  const categories = await res.json();
  renderCategoryFilters(categories);
}

function renderCategoryFilters(categories) {
  categoryFilters.innerHTML = '';
  const makeChip = (label, value) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.testid = value ? `category-${value}` : 'category-all';
    chip.textContent = label;
    chip.classList.toggle('active', activeCategory === value);
    chip.addEventListener('click', () => {
      activeCategory = value;
      loadProducts();
      renderCategoryFilters(categories);
    });
    return chip;
  };
  categoryFilters.append(makeChip('Todas', null));
  for (const cat of categories) categoryFilters.append(makeChip(cat, cat));
}

async function loadProducts() {
  const params = new URLSearchParams();
  const search = searchInput.value.trim();
  if (search) params.set('search', search);
  if (activeCategory) params.set('category', activeCategory);

  const res = await fetch(`/api/products?${params.toString()}`);
  const products = await res.json();

  catalogTitle.textContent = activeCategory ? `Categoría: ${activeCategory}` : 'Catálogo';
  renderProducts(products, productGrid);
  resultsEmpty.hidden = products.length !== 0;
}

async function loadDeals() {
  const res = await fetch('/api/products/deals');
  const products = await res.json();
  renderProducts(products, dealsGrid);
}

function renderProducts(products, container) {
  container.innerHTML = '';
  for (const product of products) {
    container.append(buildProductCard(product));
  }
}

/** Placeholder con la inicial del producto (fallback cuando no hay imagen). */
function buildInitial(product) {
  const initial = document.createElement('span');
  initial.className = 'product-initial';
  initial.setAttribute('aria-hidden', 'true');
  initial.textContent = product.name.charAt(0).toUpperCase();
  return initial;
}

function buildProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.testid = `product-${product.id}`;
  card.dataset.productId = String(product.id);

  const onSale = product.originalPrice > product.price;

  // --- Media (imagen/placeholder) con badges superpuestos ---
  const media = document.createElement('div');
  media.className = 'product-media';
  if (product.image) {
    // Imagen del producto; si falla la carga, se muestra el placeholder.
    const img = document.createElement('img');
    img.className = 'product-img';
    img.dataset.testid = 'product-image';
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      media.prepend(buildInitial(product));
    });
    media.append(img);
  } else {
    media.append(buildInitial(product));
  }

  if (onSale) {
    const badge = document.createElement('span');
    badge.className = 'deal-badge';
    badge.dataset.testid = 'deal-badge';
    // BUG(7): con el modo Bug Hunting activado, el porcentaje de descuento
    // usa una fórmula incorrecta (price/originalPrice en vez de
    // 1 - price/originalPrice), mostrando un descuento muy inflado. Lo
    // detecta un test que verifica el % correcto de un producto en oferta.
    const off = BUGS
      ? Math.round((product.price / product.originalPrice) * 100)
      : Math.round((1 - product.price / product.originalPrice) * 100);
    badge.textContent = `-${off}%`;
    media.append(badge);
  }

  const favBtn = document.createElement('button');
  favBtn.className = 'fav-btn';
  favBtn.dataset.testid = `favorite-${product.id}`;
  const isFav = favoriteIds.has(product.id);
  favBtn.classList.toggle('active', isFav);
  favBtn.setAttribute('aria-pressed', String(isFav));
  favBtn.setAttribute('aria-label', 'Agregar a favoritos');
  favBtn.textContent = isFav ? '♥' : '♡';
  favBtn.title = 'Agregar a favoritos';
  favBtn.addEventListener('click', () => toggleFavorite(product.id));
  media.append(favBtn);

  // --- Cuerpo ---
  const body = document.createElement('div');
  body.className = 'product-body';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const category = document.createElement('span');
  category.className = 'category';
  category.dataset.testid = 'product-category';
  category.textContent = product.category;
  const rating = document.createElement('span');
  rating.className = 'rating';
  rating.dataset.testid = 'product-rating';
  rating.textContent = stars(product.rating);
  meta.append(category, rating);

  const name = document.createElement('h3');
  name.dataset.testid = 'product-name';
  name.textContent = product.name;

  const desc = document.createElement('p');
  desc.className = 'description';
  desc.dataset.testid = 'product-description';
  desc.textContent = product.description;

  const priceRow = document.createElement('div');
  priceRow.className = 'price-row';
  const price = document.createElement('span');
  price.className = 'price';
  price.dataset.testid = 'product-price';
  price.textContent = money(product.price);
  priceRow.append(price);
  if (onSale) {
    const old = document.createElement('span');
    old.className = 'old-price';
    old.dataset.testid = 'product-old-price';
    old.textContent = money(product.originalPrice);
    priceRow.append(old);
  }

  // Fila de envío + vendedor (debajo del precio, en su propio flujo).
  const info = document.createElement('div');
  info.className = 'product-info';
  if (product.freeShipping) {
    const ship = document.createElement('span');
    ship.className = 'shipping';
    ship.dataset.testid = 'free-shipping';
    ship.textContent = 'Envío gratis';
    info.append(ship);
  }
  const seller = document.createElement('span');
  seller.className = 'seller';
  seller.dataset.testid = 'product-seller';
  seller.textContent = `Vendido por ${product.seller}`;
  info.append(seller);

  const add = document.createElement('button');
  add.className = 'add-btn';
  add.dataset.testid = `add-to-cart-${product.id}`;
  add.textContent = 'Agregar al carrito';
  add.addEventListener('click', () => addToCart(product.id));

  body.append(meta, name, desc, priceRow, info, add);
  card.append(media, body);
  return card;
}

// ---------- Favoritos ----------
async function fetchFavorites() {
  const res = await fetch('/api/favorites');
  return res.json();
}

async function refreshFavoriteState() {
  const favs = await fetchFavorites();
  favoriteIds = new Set(favs.map((p) => p.id));
  // BUG(4): con los bugs activados el contador del menú se queda una
  // unidad por debajo del número real de favoritos (error off-by-one).
  // Lo detecta un test de UI que marca un favorito y verifica que el
  // contador muestre "1".
  const shownCount = BUGS ? Math.max(0, favoriteIds.size - 1) : favoriteIds.size;
  favoritesCount.textContent = String(shownCount);
  return favs;
}

async function toggleFavorite(productId) {
  if (!requireLogin()) return;
  if (favoriteIds.has(productId)) {
    await fetch(`/api/favorites/${productId}`, { method: 'DELETE' });
  } else {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ productId }),
    });
  }
  await refreshFavoriteState();
  // Re-renderiza la vista activa para reflejar el estado.
  if (!views.home.hidden) loadProducts();
  if (!views.deals.hidden) loadDeals();
  if (!views.favorites.hidden) loadFavorites();
}

async function loadFavorites() {
  const favs = await refreshFavoriteState();
  renderProducts(favs, favoritesGrid);
  favoritesEmpty.hidden = favs.length !== 0;
}

// ---------- Pedidos ----------
async function loadOrders() {
  const res = await fetch('/api/orders');
  const orders = await res.json();
  ordersList.innerHTML = '';
  ordersEmpty.hidden = orders.length !== 0;

  for (const order of orders) {
    const li = document.createElement('li');
    li.dataset.testid = `order-${order.id}`;
    li.className = 'order-item';

    const head = document.createElement('div');
    head.className = 'order-head';
    const id = document.createElement('strong');
    id.dataset.testid = 'order-id';
    id.textContent = `Pedido #${order.id}`;
    const total = document.createElement('span');
    total.dataset.testid = 'order-total';
    total.className = 'order-total';
    total.textContent = money(order.totalPrice);
    head.append(id, total);

    const detail = document.createElement('span');
    detail.className = 'muted';
    detail.dataset.testid = 'order-detail';
    const count = order.items.reduce((s, i) => s + i.quantity, 0);
    detail.textContent = `${count} artículo(s)`;

    li.append(head, detail);
    ordersList.append(li);
  }
}

// ---------- Gestión de productos (según rol) ----------
async function loadManage() {
  manageRole.textContent = currentRole.dataset.role ?? '';
  manageHint.textContent = currentPermissions.deleteProducts
    ? 'Puedes crear, editar y eliminar productos.'
    : 'Puedes crear y editar productos (eliminar es solo para admin).';
  manageFeedback.hidden = true;

  const res = await fetch('/api/products');
  const products = await res.json();
  manageList.innerHTML = '';

  for (const product of products) {
    const li = document.createElement('li');
    li.dataset.testid = `manage-item-${product.id}`;
    li.className = 'manage-item';

    const name = document.createElement('span');
    name.textContent = `${product.name} — ${money(product.price)}`;
    li.append(name);

    // El botón de eliminar solo se muestra si el rol puede eliminar.
    if (currentPermissions.deleteProducts) {
      const del = document.createElement('button');
      del.className = 'remove-btn';
      del.dataset.testid = `manage-delete-${product.id}`;
      del.textContent = 'Eliminar';
      del.addEventListener('click', () => deleteManagedProduct(product.id));
      li.append(del);
    }

    manageList.append(li);
  }
}

async function createManagedProduct(name, category, price) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      description: `${name} (creado desde Gestión)`,
      price,
      originalPrice: price,
      category,
      stock: 10,
      rating: 0,
      seller: currentUsername,
      freeShipping: false,
    }),
  });

  if (res.ok) {
    manageFeedback.textContent = `Producto "${name}" creado correctamente.`;
    manageFeedback.hidden = false;
    await loadManage();
  } else {
    const data = await res.json().catch(() => ({}));
    manageFeedback.textContent = data.error || 'No se pudo crear el producto.';
    manageFeedback.hidden = false;
  }
}

async function deleteManagedProduct(id) {
  await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
  await loadManage();
}

// ---------- QA Runner ----------
function loadQa() {
  // Nada que precargar; el estado se limpia al entrar a la vista.
  qaStatus.hidden = true;
  qaOutput.hidden = true;
  qaReportWrap.hidden = true;
}

let qaEventSource = null;

function runQa() {
  const suite = qaSuite.value;
  const grep = qaGrep.value.trim();
  const bugs = qaBugs.checked;

  // Cierra un stream previo si lo hubiera.
  if (qaEventSource) {
    qaEventSource.close();
    qaEventSource = null;
  }

  // Estado: ejecutando
  qaRunButton.disabled = true;
  qaStatus.hidden = false;
  qaStatus.className = 'qa-status running';
  qaStatus.textContent = `Ejecutando suite "${suite}"...`;
  qaReportWrap.hidden = true;

  // Cuadro de log en vivo: vacío y visible desde el inicio.
  qaOutput.hidden = false;
  qaOutput.textContent = '';

  const params = new URLSearchParams({ suite, bugs: String(bugs) });
  if (grep) params.set('grep', grep);

  const es = new EventSource(`/api/qa/run/stream?${params.toString()}`);
  qaEventSource = es;

  // Log en vivo: cada fragmento se añade y hace autoscroll.
  es.addEventListener('log', (e) => {
    const { line } = JSON.parse(e.data);
    const atBottom =
      qaOutput.scrollTop + qaOutput.clientHeight >= qaOutput.scrollHeight - 20;
    qaOutput.textContent += line;
    if (atBottom) qaOutput.scrollTop = qaOutput.scrollHeight;
  });

  es.addEventListener('done', (e) => {
    const data = JSON.parse(e.data);
    const secs = (data.durationMs / 1000).toFixed(1);
    qaStatus.className = `qa-status ${data.success ? 'passed' : 'failed'}`;
    qaStatus.textContent = data.success
      ? `✓ ${data.summary.passed} pruebas pasaron en ${secs}s`
      : `✕ ${data.summary.failed} fallaron, ${data.summary.passed} pasaron (${secs}s)`;

    // Reporte HTML embebido (cache-buster para tomar el recién generado).
    qaReportWrap.hidden = false;
    qaReportFrame.src = `/qa-report/?t=${Date.now()}`;

    es.close();
    qaEventSource = null;
    qaRunButton.disabled = false;
  });

  es.addEventListener('error', (e) => {
    // Si 'done' ya cerró el stream, este error es solo el cierre normal
    // de la conexión SSE: se ignora.
    if (qaEventSource !== es) return;
    // Error de aplicación (evento SSE con payload) o de conexión real.
    let msg = 'Se perdió la conexión con el servidor.';
    if (e.data) {
      try {
        msg = JSON.parse(e.data).error || msg;
      } catch {
        /* noop */
      }
    }
    qaStatus.className = 'qa-status failed';
    qaStatus.textContent = msg;
    es.close();
    qaEventSource = null;
    qaRunButton.disabled = false;
  });
}

// ---------- Carrito ----------
async function fetchCart() {
  const res = await fetch('/api/cart');
  return res.json();
}

async function addToCart(productId) {
  if (!requireLogin()) return;
  await fetch('/api/cart/items', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ productId, quantity: 1 }),
  });
  orderConfirmation.hidden = true;
  await refreshCart();
}

async function removeFromCart(productId) {
  await fetch(`/api/cart/items/${productId}`, { method: 'DELETE' });
  await refreshCart();
}

async function refreshCart() {
  const cart = await fetchCart();
  renderCart(cart);
}

function renderCart(cart) {
  cartCount.textContent = String(cart.totalItems);
  cartTotal.textContent = money(cart.totalPrice);
  cartItems.innerHTML = '';

  const isEmpty = cart.items.length === 0;
  cartEmpty.hidden = !isEmpty;
  checkoutButton.disabled = isEmpty;

  for (const item of cart.items) {
    const li = document.createElement('li');
    li.dataset.testid = `cart-item-${item.productId}`;
    li.dataset.productId = String(item.productId);

    const info = document.createElement('div');
    const name = document.createElement('span');
    name.dataset.testid = 'cart-item-name';
    name.textContent = item.name;
    const qty = document.createElement('span');
    qty.className = 'qty';
    qty.dataset.testid = 'cart-item-quantity';
    qty.textContent = `x${item.quantity}`;
    const subtotal = document.createElement('span');
    subtotal.className = 'subtotal';
    subtotal.dataset.testid = 'cart-item-subtotal';
    subtotal.textContent = money(item.price * item.quantity);
    info.append(name, qty, subtotal);

    const remove = document.createElement('button');
    remove.className = 'remove-btn';
    remove.dataset.testid = `remove-from-cart-${item.productId}`;
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => removeFromCart(item.productId));

    li.append(info, remove);
    cartItems.append(li);
  }
}

async function checkout() {
  if (!requireLogin()) return;
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ customer: currentUsername ?? 'invitado' }),
  });
  if (!res.ok) return;
  const order = await res.json();
  orderConfirmation.textContent = `¡Pedido #${order.id} confirmado! Total: ${money(order.totalPrice)}`;
  orderConfirmation.hidden = false;
  await refreshCart();
}

// Retardo de gracia para el auto-hide del carrito al salir el mouse.
let cartHideTimer = null;
function cancelCartHide() {
  if (cartHideTimer) {
    clearTimeout(cartHideTimer);
    cartHideTimer = null;
  }
}

function openCart() {
  cancelCartHide();
  if (cartCloseTimer) {
    clearTimeout(cartCloseTimer);
    cartCloseTimer = null;
  }
  cartOverlay.hidden = false;
  cartPanel.hidden = false;
  // Permite animar la entrada (fade in) en el siguiente frame.
  requestAnimationFrame(() => {
    cartOverlay.classList.add('visible');
    cartPanel.classList.add('open');
  });
}

let cartCloseTimer = null;
function closeCart() {
  cancelCartHide();
  if (cartPanel.hidden) return;
  // Dispara el desvanecido quitando las clases visibles.
  cartOverlay.classList.remove('visible');
  cartPanel.classList.remove('open');
  // Oculta del todo (hidden) recién cuando termina la transición de opacidad,
  // para que el efecto de desaparecer sea visible.
  cartCloseTimer = setTimeout(() => {
    cartOverlay.hidden = true;
    cartPanel.hidden = true;
    cartCloseTimer = null;
  }, 260);
}

// ---------- Eventos ----------
loginButton.addEventListener('click', async () => {
  loginError.hidden = true;
  try {
    const user = await login(el('username').value, el('password').value);
    showLoggedIn(user);
    await loadCategories();
    await refreshFavoriteState();
    await loadProducts();
    await refreshCart();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  showView('home');
  loadProducts();
});

for (const link of sidebar.querySelectorAll('.menu-link')) {
  link.addEventListener('click', () => showView(link.dataset.view));
}

createProductForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const price = Number(newProductPrice.value);
  createManagedProduct(newProductName.value.trim(), newProductCategory.value.trim(), price);
  newProductName.value = '';
  newProductCategory.value = '';
  newProductPrice.value = '';
});

qaRunButton.addEventListener('click', runQa);

bugToggle.addEventListener('change', () => setBugMode(bugToggle.checked));

cartToggle.addEventListener('click', () => {
  if (!requireLogin()) return;
  if (cartPanel.hidden) openCart();
  else closeCart();
});
// Auto-hidden: cerrar al hacer clic fuera (overlay) o con Escape.
cartOverlay.addEventListener('click', closeCart);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !cartPanel.hidden) closeCart();
});

// Auto-hide al sacar el mouse del panel, con un pequeño retardo de gracia
// que se cancela si el cursor vuelve (evita cierres accidentales al rozar).
cartPanel.addEventListener('mouseleave', () => {
  cancelCartHide();
  cartHideTimer = setTimeout(closeCart, 400);
});
cartPanel.addEventListener('mouseenter', cancelCartHide);
checkoutButton.addEventListener('click', checkout);

el('logout-btn').addEventListener('click', showLoggedOut);

// Estado inicial
loadConfig();
showLoggedOut();
