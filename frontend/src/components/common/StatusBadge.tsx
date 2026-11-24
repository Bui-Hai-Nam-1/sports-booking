import type { BookingStatus, ComplaintStatus } from '../../types';
import { BOOKING_STATUS_LABELS, COMPLAINT_STATUS_LABELS } from '../../types';

export interface StatusBadgeProps {
  status: BookingStatus | ComplaintStatus | string;
  type?: 'booking' | 'complaint';
}

export function StatusBadge({ status, type = 'booking' }: StatusBadgeProps) {
  let label = status;
  let colorClass = 'badge-default';

  if (type === 'booking') {
    label = BOOKING_STATUS_LABELS[status as BookingStatus] || status;
    switch (status) {
      case 'PENDING':
        colorClass = 'badge-warning';
        break;
      case 'CONFIRMED':
        colorClass = 'badge-info';
        break;
      case 'COMPLETED':
        colorClass = 'badge-success';
        break;
      case 'CANCELLED':
      case 'REJECTED':
        colorClass = 'badge-danger';
        break;
    }
  } else {
    label = COMPLAINT_STATUS_LABELS[status as ComplaintStatus] || status;
    switch (status) {
      case 'OPEN':
        colorClass = 'badge-warning';
        break;
      case 'IN_PROGRESS':
        colorClass = 'badge-info';
        break;
      case 'RESOLVED':
        colorClass = 'badge-success';
        break;
      case 'REJECTED':
        colorClass = 'badge-danger';
        break;
    }
  }

  return <span className={`badge ${colorClass}`}>{label}</span>;
}
