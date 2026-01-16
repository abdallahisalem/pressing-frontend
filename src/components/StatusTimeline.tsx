import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StatusHistoryEntry, OrderStatus } from '../types';

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
  compact?: boolean;
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  CREATED: '\u{1F4DD}',        // Memo
  COLLECTED: '\u{1F69A}',      // Truck
  RECEIVED_AT_PLANT: '\u{1F4E5}', // Inbox tray
  PROCESSING: '\u{2699}\uFE0F',  // Gear
  PROCESSED: '\u{2705}',        // Check mark
  DISPATCHED: '\u{1F4E6}',     // Package
  READY: '\u{1F3C1}',          // Checkered flag
  DELIVERED: '\u{1F389}',      // Party popper
};

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ history, compact = false }) => {
  const { t, i18n } = useTranslation();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';

    if (compact) {
      return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!history || history.length === 0) {
    return null;
  }

  // Sort by changedAt ascending
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );

  return (
    <div className="flow-root">
      <ul className={compact ? 'space-y-2' : 'space-y-4'}>
        {sortedHistory.map((entry, index) => {
          const isLast = index === sortedHistory.length - 1;
          const icon = STATUS_ICONS[entry.status] || '\u{1F4CB}';

          return (
            <li key={entry.id} className="relative">
              <div className="flex items-start gap-3">
                {/* Timeline connector */}
                {!compact && !isLast && (
                  <div
                    className="absolute left-4 top-8 w-0.5 h-full -translate-x-1/2 bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isLast
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'bg-gray-100'
                  }`}
                >
                  {icon}
                </div>

                {/* Content */}
                <div className={`flex-1 ${compact ? 'min-w-0' : ''}`}>
                  <p
                    className={`font-medium ${
                      isLast ? 'text-blue-700' : 'text-gray-900'
                    } ${compact ? 'text-sm' : ''}`}
                  >
                    {t(`status.order.${entry.status}`)}
                  </p>
                  <div className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                    <span>{t('statusHistory.by')} {entry.changedByUserName}</span>
                    <span className="mx-1">&bull;</span>
                    <span>{formatDate(entry.changedAt)}</span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
