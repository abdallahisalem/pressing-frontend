import type { OrderStatus, PaymentStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus;
  type?: 'order' | 'payment';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order' }) => {
  const getStatusStyles = () => {
    if (type === 'order') {
      const orderStyles = {
        CREATED: 'bg-gray-100 text-gray-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        READY: 'bg-yellow-100 text-yellow-800',
        DELIVERED: 'bg-green-100 text-green-800',
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
    return status.replace('_', ' ');
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusStyles()}`}>
      {getStatusLabel()}
    </span>
  );
};
