import type {
  AddToCartInput,
  Cart,
  CartItem,
  CreateProductInput,
  Order,
  Product,
  ProductQuery,
  UpdateProductInput,
  User,
} from './types';
import { isBugsEnabled } from './bugs';

/**
 * Store en memoria. Simple y reiniciable, ideal para pruebas automatizadas.
 * No usa base de datos: el estado vive mientras el proceso está arriba.
 * Dominio: marketplace (catálogo, categorías, ofertas, favoritos,
 * carrito y pedidos).
 */
class InMemoryStore {
  private products: Product[] = [];
  private cartItems: CartItem[] = [];
  private orders: Order[] = [];
  private favoriteIds: number[] = [];
  private users: User[] = [];
  private nextProductId = 1;
  private nextOrderId = 1;

  constructor() {
    this.reset();
  }

  /** Reinicia el store a su estado semilla. */
  reset(): void {
    this.nextProductId = 1;
    this.nextOrderId = 1;
    this.products = [
      this.seed('Laptop Pro 14"', 'Portátil ligero con 16GB RAM y 512GB SSD.', 1299.0, 1499.0, 'Computadoras', 8, 4.7, 'TechWorld', true, '💻'),
      this.seed('Auriculares inalámbricos', 'Cancelación de ruido y 30h de batería.', 199.99, 199.99, 'Audio', 25, 4.5, 'SoundHub', true, '🎧'),
      this.seed('Teclado mecánico RGB', 'Switches táctiles e iluminación personalizable.', 89.5, 119.0, 'Accesorios', 40, 4.3, 'KeyMasters', false, '⌨️'),
      this.seed('Monitor 27" 4K', 'Panel IPS con 144Hz y HDR.', 449.0, 449.0, 'Monitores', 12, 4.6, 'DisplayPro', true, '🖥️'),
      this.seed('Mouse ergonómico', 'Mouse inalámbrico con diseño vertical.', 34.9, 49.9, 'Accesorios', 60, 4.1, 'KeyMasters', false, '🖱️'),
      this.seed('Smartphone X12', 'Pantalla OLED 6.5", cámara triple 108MP.', 799.0, 899.0, 'Celulares', 15, 4.8, 'MobilePlus', true, '📱'),
      this.seed('Smartwatch Fit 3', 'Monitoreo de salud y GPS integrado.', 149.0, 149.0, 'Wearables', 30, 4.2, 'FitGear', true, '⌚'),
      this.seed('Cámara web 1080p', 'Full HD con micrófono estéreo.', 45.0, 69.0, 'Accesorios', 50, 4.0, 'StreamKit', false, '📷'),
      this.seed('Tablet Air 10"', 'Ligera, ideal para lectura y notas.', 329.0, 399.0, 'Computadoras', 10, 4.4, 'TechWorld', true, '📲'),
      this.seed('Parlante Bluetooth', 'Resistente al agua, 20h de batería.', 59.99, 79.99, 'Audio', 45, 4.3, 'SoundHub', false, '🔊'),
    ];
    this.cartItems = [];
    this.orders = [];
    this.favoriteIds = [];
    this.users = [
      { id: 1, username: 'admin', password: 'admin123', token: 'token-admin-123', role: 'admin' },
      { id: 2, username: 'manager', password: 'manager123', token: 'token-manager-123', role: 'manager' },
      { id: 3, username: 'customer', password: 'customer123', token: 'token-customer-123', role: 'customer' },
    ];
  }

  private seed(
    name: string,
    description: string,
    price: number,
    originalPrice: number,
    category: string,
    stock: number,
    rating: number,
    seller: string,
    freeShipping: boolean,
    emoji: string,
  ): Product {
    return {
      id: this.nextProductId++,
      name,
      description,
      price,
      originalPrice,
      category,
      stock,
      rating,
      seller,
      freeShipping,
      image: productImage(category, emoji),
    };
  }

  // ---- Products ----
  /**
   * Lista los productos aplicando búsqueda por texto, filtro por
   * categoría y filtro de ofertas según los parámetros recibidos.
   */
  listProducts(query: ProductQuery = {}): Product[] {
    const search = query.search?.trim().toLowerCase();
    const category = query.category?.trim().toLowerCase();

    return this.products.filter((p) => {
      if (search) {
        const haystack = `${p.name} ${p.description}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (category && p.category.toLowerCase() !== category) return false;
      if (query.onlyDeals && !this.isOnSale(p)) return false;
      return true;
    });
  }

  /** Productos en oferta (precio actual menor al original). */
  listDeals(): Product[] {
    return this.products.filter((p) => this.isOnSale(p));
  }

  /** Categorías únicas ordenadas alfabéticamente. */
  listCategories(): string[] {
    // BUG(2): con los bugs activados no se deduplican las categorías,
    // así que se repiten (una por producto). Lo detecta un test que
    // verifica que no haya duplicados en la respuesta de /api/categories.
    const categories = isBugsEnabled()
      ? this.products.map((p) => p.category)
      : [...new Set(this.products.map((p) => p.category))];
    return categories.sort((a, b) => a.localeCompare(b));
  }

  private isOnSale(p: Product): boolean {
    return p.originalPrice > p.price;
  }

  getProduct(id: number): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  createProduct(input: CreateProductInput): Product {
    const product: Product = { id: this.nextProductId++, ...input };
    this.products.push(product);
    return product;
  }

  updateProduct(id: number, input: UpdateProductInput): Product | undefined {
    const product = this.getProduct(id);
    if (!product) return undefined;
    Object.assign(product, input);
    return product;
  }

  deleteProduct(id: number): boolean {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.products.splice(index, 1);
    return true;
  }

  // ---- Favorites (wishlist) ----
  listFavorites(): Product[] {
    return this.favoriteIds
      .map((id) => this.getProduct(id))
      .filter((p): p is Product => p !== undefined);
  }

  /** Agrega a favoritos. Devuelve false si el producto no existe. */
  addFavorite(productId: number): boolean {
    // BUG(3): con los bugs activados se omite la validación de existencia,
    // por lo que se puede agregar a favoritos un producto inexistente y la
    // API responde 201 en vez de 404. Lo detecta un test que intenta
    // marcar como favorito un id que no existe y espera 404.
    if (!isBugsEnabled() && !this.getProduct(productId)) return false;
    if (!this.favoriteIds.includes(productId)) {
      this.favoriteIds.push(productId);
    }
    return true;
  }

  /** Quita de favoritos. Devuelve true si estaba presente. */
  removeFavorite(productId: number): boolean {
    const index = this.favoriteIds.indexOf(productId);
    if (index === -1) return false;
    this.favoriteIds.splice(index, 1);
    return true;
  }

  // ---- Cart ----
  getCart(): Cart {
    const items = this.cartItems;
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    // BUG(1): con los bugs activados, el total ignora la cantidad y suma
    // solo el precio unitario de cada ítem. Un producto con quantity=2
    // debería contar dos veces, pero aquí cuenta una. Lo detecta un test
    // que agrega quantity>1 y verifica totalPrice = price * quantity.
    const totalPrice = isBugsEnabled()
      ? round2(items.reduce((sum, i) => sum + i.price, 0))
      : round2(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
    return { items, totalItems, totalPrice };
  }

  /**
   * Agrega un producto al carrito. Devuelve el carrito actualizado o
   * undefined si el producto no existe.
   */
  addToCart(input: AddToCartInput): Cart | undefined {
    const quantity = input.quantity ?? 1;
    if (quantity < 1) return undefined;
    const product = this.getProduct(input.productId);
    if (!product) return undefined;

    const existing = this.cartItems.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cartItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
      });
    }
    return this.getCart();
  }

  /** Elimina un producto del carrito. Devuelve true si estaba presente. */
  removeFromCart(productId: number): boolean {
    const index = this.cartItems.findIndex((i) => i.productId === productId);
    if (index === -1) return false;
    this.cartItems.splice(index, 1);
    return true;
  }

  clearCart(): void {
    this.cartItems = [];
  }

  // ---- Orders (checkout) ----
  /**
   * Crea un pedido a partir del carrito actual y lo vacía.
   * Devuelve undefined si el carrito está vacío.
   */
  checkout(customer: string): Order | undefined {
    if (this.cartItems.length === 0) return undefined;
    const cart = this.getCart();
    const order: Order = {
      id: this.nextOrderId++,
      items: cart.items.map((i) => ({ ...i })),
      totalPrice: cart.totalPrice,
      customer,
      createdAt: new Date().toISOString(),
    };
    this.orders.push(order);
    this.clearCart();
    return order;
  }

  getOrder(id: number): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  listOrders(): Order[] {
    return this.orders;
  }

  // ---- Users ----
  findUser(username: string, password: string): User | undefined {
    return this.users.find((u) => u.username === username && u.password === password);
  }

  /** Busca un usuario por su token de sesión (para autorización). */
  findUserByToken(token: string): User | undefined {
    return this.users.find((u) => u.token === token);
  }

  /** Busca un usuario solo por nombre (sin validar contraseña). */
  findUserByUsername(username: string): User | undefined {
    return this.users.find((u) => u.username === username);
  }
}

/** Redondea a 2 decimales evitando errores de coma flotante. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Paleta de degradado por categoría para las imágenes generadas. */
/**
 * Genera una imagen de producto como SVG (data URI). No depende de
 * internet ni de archivos: siempre funciona (local, CI, hosting).
 *
 * Estilo sobrio tipo foto de catálogo: fondo neutro claro con un sutil
 * degradado radial gris (efecto "estudio"), sin colores saturados, y el
 * producto (emoji) centrado.
 */
function productImage(_category: string, emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs>
      <radialGradient id="bg" cx="50%" cy="42%" r="75%">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="1" stop-color="#e9edf3"/>
      </radialGradient>
    </defs>
    <rect width="400" height="300" fill="url(#bg)"/>
    <ellipse cx="200" cy="248" rx="120" ry="20" fill="#0f172a" opacity="0.06"/>
    <text x="50%" y="46%" font-size="140" text-anchor="middle" dominant-baseline="central" opacity="0.92">${emoji}</text>
  </svg>`;
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

export const store = new InMemoryStore();
