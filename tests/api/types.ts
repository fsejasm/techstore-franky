/**
 * Contratos del API bajo prueba (TechStore marketplace).
 * Mantener alineado con app/src/types.ts.
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
  stock: number;
  rating: number;
  seller: string;
  freeShipping: boolean;
  image?: string;
}

export type CreateProductInput = Omit<Product, 'id'>;

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export interface Order {
  id: number;
  items: CartItem[];
  totalPrice: number;
  customer: string;
  createdAt: string;
}

export type Role = 'admin' | 'manager' | 'customer';

export interface Permissions {
  manageProducts: boolean;
  deleteProducts: boolean;
  viewAllOrders: boolean;
}

export interface LoginResponse {
  token: string;
  user: { id: number; username: string; role: Role; permissions: Permissions };
}
