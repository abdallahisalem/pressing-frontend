// User Roles
export type UserRole = 'ADMIN' | 'SUPERVISOR';

// API Response Types
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  role: UserRole;
  pressingId: number;
}

export interface User {
  id: number;
  name: string;
  loginCode: string;
  role: UserRole;
  pressingId: number;
  pressingName: string;
  enabled: boolean;
  lastCodeRegeneratedAt: string;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  role: UserRole;
  pressingId: number;
  enabled: boolean;
}

export interface UpdateUserRequest {
  name: string;
  role: UserRole;
  pressingId: number;
  enabled: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

// Auth Context State
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id: number;
    role: UserRole;
    pressingId: number;
  } | null;
}

export interface AuthContextType extends AuthState {
  login: (loginCode: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Pressing (Business Location) Type
export interface Pressing {
  id: number;
  name: string;
}

// Order Management Types
export type OrderStatus = 'CREATED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED';
export type PaymentMethod = 'CASH' | 'WALLET';
export type PaymentStatus = 'INITIATED' | 'PAID';

// Client Types
export interface Client {
  id: number;
  fullName: string;
  phone?: string;
  pressingId: number;
  pressingName: string;
  createdAt: string;
}

export interface CreateClientRequest {
  fullName: string;
  phone?: string;
  pressingId: number;
}

// Order Item Types
export interface OrderItem {
  id: number;
  label: string;
  quantity: number;
}

export interface OrderItemInput {
  label: string;
  quantity: number;
}

// Payment Types
export interface Payment {
  id: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

// Order Types
export interface Order {
  id: number;
  referenceCode: string;
  pressingId: number;
  pressingName: string;
  clientId: number;
  clientName: string;
  status: OrderStatus;
  items: OrderItem[];
  payment: Payment;
  createdAt: string;
}

export interface CreateOrderRequest {
  clientId: number;
  pressingId: number;
  items: OrderItemInput[];
  paymentAmount: number;
  paymentMethod: PaymentMethod;
}
