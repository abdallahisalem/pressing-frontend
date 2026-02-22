import type { OrderStatus, PaymentStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus;
  type?: 'order' | 'payment';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order' }) => {
  const getStatusStyles = () => {
    if (type === 'order') {
      // 6-stage workflow colors
      const orderStyles: Record<OrderStatus, string> = {
        CREATED: 'bg-blue-100 text-blue-800',           // New order
        COLLECTED: 'bg-purple-100 text-purple-800',     // In transit to plant
        RECEIVED_AT_PLANT: 'bg-orange-100 text-orange-800', // Arrived at plant
        DISPATCHED: 'bg-purple-100 text-purple-800',    // In transit to pressing
        READY: 'bg-green-100 text-green-800',           // Ready for pickup
        DELIVERED: 'bg-gray-100 text-gray-800',         // Completed
      };
      return orderStyles[status as OrderStatus] || 'bg-gray-100 text-gray-800';
    } else {
      const paymentStyles = {
        INITIATED: 'bg-orange-100 text-orange-800',
        PAID: 'bg-green-100 text-green-800',
      };
      return paymentStyles[status as PaymentStatus] || 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = () => {
    return status.replace(/_/g, ' ');
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusStyles()}`}>
      {getStatusLabel()}
    </span>
  );
};
