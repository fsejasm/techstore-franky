/**
 * Contratos compartidos entre el servidor (API) y el cliente web.
 * Dominio: marketplace (TechStore) estilo MercadoLibre/eBay.
 */

/** Producto del catálogo. */
export interface Product {
  id: number;
  name: string;
  description: string;
  /** Precio actual de venta. */
  price: number;
  /**
   * Precio original antes del descuento. Si es mayor que `price`,
   * el producto está en oferta.
   */
  originalPrice: number;
  category: string;
  /** Unidades disponibles en inventario. */
  stock: number;
  /** Valoración media (0-5). */
  rating: number;
  /** Vendedor que publica el producto. */
  seller: string;
  /** Envío gratis. */
  freeShipping: boolean;
  /**
   * Imagen del producto (URL o data URI). Opcional: si no hay imagen,
   * la UI muestra un placeholder con la inicial del producto.
   */
  image?: string;
}

export type CreateProductInput = Omit<Product, 'id'>;
export type UpdateProductInput = Partial<Omit<Product, 'id'>>;

/** Parámetros de búsqueda/filtrado del catálogo. */
export interface ProductQuery {
  /** Texto a buscar en nombre y descripción (case-insensitive). */
  search?: string;
  /** Categoría exacta para filtrar. */
  category?: string;
  /** Solo productos en oferta (originalPrice > price). */
  onlyDeals?: boolean;
}

/** Ítem dentro del carrito. */
export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

/** Estado del carrito con totales calculados. */
export interface Cart {
  items: CartItem[];
  /** Suma de cantidades de todos los ítems. */
  totalItems: number;
  /** Importe total del carrito. */
  totalPrice: number;
}

export interface AddToCartInput {
  productId: number;
  quantity?: number;
}

/** Pedido generado tras el checkout. */
export interface Order {
  id: number;
  items: CartItem[];
  totalPrice: number;
  customer: string;
  createdAt: string;
}

/** Roles disponibles en la plataforma. */
export type Role = 'admin' | 'manager' | 'customer';

/**
 * Permisos derivados del rol. Se calculan a partir del rol para que la UI
 * y el servidor compartan el mismo criterio.
 */
export interface Permissions {
  /** Crear y editar productos. */
  manageProducts: boolean;
  /** Eliminar productos (solo admin). */
  deleteProducts: boolean;
  /** Ver el listado global de pedidos. */
  viewAllOrders: boolean;
}

/** Devuelve los permisos correspondientes a un rol. */
export function permissionsFor(role: Role): Permissions {
  switch (role) {
    case 'admin':
      return { manageProducts: true, deleteProducts: true, viewAllOrders: true };
    case 'manager':
      return { manageProducts: true, deleteProducts: false, viewAllOrders: true };
    case 'customer':
    default:
      return { manageProducts: false, deleteProducts: false, viewAllOrders: false };
  }
}

export interface User {
  id: number;
  username: string;
  password: string;
  token: string;
  role: Role;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: { id: number; username: string; role: Role; permissions: Permissions };
}

export interface ApiError {
  error: string;
}
