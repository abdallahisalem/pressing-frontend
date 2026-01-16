// User Roles
export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'PLANT_OPERATOR';

// API Response Types
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  userName: string;
  role: UserRole;
  pressingId: number | null;
  pressingName: string | null;
  plantId: number | null;
  plantName: string | null;
}

export interface User {
  id: number;
  name: string;
  loginCode: string;
  role: UserRole;
  pressingId: number | null;
  pressingName: string | null;
  plantId: number | null;
  plantName: string | null;
  enabled: boolean;
  lastCodeRegeneratedAt: string;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  role: UserRole;
  pressingId?: number | null;
  plantId?: number | null;
  enabled: boolean;
}

export interface UpdateUserRequest {
  name: string;
  role: UserRole;
  pressingId?: number | null;
  plantId?: number | null;
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
    name: string;
    role: UserRole;
    pressingId: number | null;
    pressingName: string | null;
    plantId: number | null;
    plantName: string | null;
  } | null;
}

export interface AuthContextType extends AuthState {
  login: (loginCode: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Pressing (Business Location) Types
export interface Pressing {
  id: number;
  name: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePressingRequest {
  name: string;
  address?: string;
  active?: boolean;
}

export interface UpdatePressingRequest {
  name?: string;
  address?: string;
  active?: boolean;
}

// Order Management Types - 8-stage workflow
export type OrderStatus =
  | 'CREATED'           // Order created at pressing
  | 'COLLECTED'         // Picked up from pressing by driver
  | 'RECEIVED_AT_PLANT' // Arrived at plant facility
  | 'PROCESSING'        // Being cleaned/processed at plant
  | 'PROCESSED'         // Cleaning complete
  | 'DISPATCHED'        // Sent back to pressing
  | 'READY'             // Back at pressing, ready for client pickup
  | 'DELIVERED';        // Given to client
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

// Status History Entry
export interface StatusHistoryEntry {
  id: number;
  status: OrderStatus;
  changedByUserName: string;
  changedAt: string;
}

// Order Types
export interface Order {
  id: number;
  referenceCode: string;
  pressingId: number;
  pressingName: string;
  clientId: number;
  clientName: string;
  plantId: number | null;
  plantName: string | null;
  status: OrderStatus;
  items: OrderItem[];
  payment: Payment | null;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
}

export interface CreateOrderRequest {
  clientId: number;
  pressingId: number;
  items: OrderItemInput[];
  paymentAmount: number;
  paymentMethod: PaymentMethod;
}

// Plant (Laundry Processing Facility) Types
export interface Plant {
  id: number;
  name: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlantRequest {
  name: string;
  address?: string;
  active?: boolean;
}

export interface UpdatePlantRequest {
  name?: string;
  address?: string;
  active?: boolean;
}

// Bulk Order Status Update
export interface BulkUpdateOrderStatusRequest {
  orderIds: number[];
  newStatus: OrderStatus;
  plantId?: number; // Required when status is RECEIVED_AT_PLANT
}
