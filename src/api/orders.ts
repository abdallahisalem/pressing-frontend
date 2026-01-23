import { apiClient } from './client';
import type { Order, CreateOrderRequest, Payment, OrderStatus, BulkUpdateOrderStatusRequest, RecordPaymentRequest } from '../types';

export const ordersApi = {
  // Get orders by pressing ID
  getOrdersByPressing: async (pressingId: number): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>(`/api/orders/pressing/${pressingId}`);
    return response.data;
  },

  // Get orders by plant ID
  getOrdersByPlant: async (plantId: number): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>(`/api/orders/plant/${plantId}`);
    return response.data;
  },

  // Get all COLLECTED orders (visible to all plant operators)
  getCollectedOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/api/orders/collected');
    return response.data;
  },

  // Get all orders (ADMIN only)
  getAllOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/api/orders');
    return response.data;
  },

  // Get single order by ID
  getOrder: async (id: number): Promise<Order> => {
    const response = await apiClient.get<Order>(`/api/orders/${id}`);
    return response.data;
  },

  // Get order by reference code
  getOrderByReference: async (referenceCode: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/api/orders/reference/${referenceCode}`);
    return response.data;
  },

  // Create new order
  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<Order>('/api/orders', orderData);
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (id: number, status: OrderStatus): Promise<Order> => {
    const response = await apiClient.patch<Order>(
      `/api/orders/${id}/status?status=${status}`
    );
    return response.data;
  },

  // Confirm payment (deprecated - use recordPayment for new workflow)
  confirmPayment: async (id: number): Promise<Payment> => {
    const response = await apiClient.post<Payment>(`/api/orders/${id}/confirm-payment`);
    return response.data;
  },

  // Record payment (new workflow - after DELIVERED status)
  recordPayment: async (request: RecordPaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/api/orders/record-payment', request);
    return response.data;
  },

  // Bulk update order status
  bulkUpdateStatus: async (request: BulkUpdateOrderStatusRequest): Promise<Order[]> => {
    const response = await apiClient.post<Order[]>('/api/orders/bulk-update-status', request);
    return response.data;
  },
};
