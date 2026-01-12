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
