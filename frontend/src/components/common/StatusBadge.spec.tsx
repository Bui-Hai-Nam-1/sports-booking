import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('should render booking status badge with corresponding labels', () => {
    const { rerender } = render(<StatusBadge status="PENDING" type="booking" />);
    expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument();

    rerender(<StatusBadge status="COMPLETED" type="booking" />);
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();

    rerender(<StatusBadge status="CANCELLED" type="booking" />);
    expect(screen.getByText('Đã hủy')).toBeInTheDocument();
  });

  it('should render complaint status badge with corresponding labels', () => {
    const { rerender } = render(<StatusBadge status="OPEN" type="complaint" />);
    expect(screen.getByText('Chờ tiếp nhận')).toBeInTheDocument();

    rerender(<StatusBadge status="RESOLVED" type="complaint" />);
    expect(screen.getByText('Đã giải quyết')).toBeInTheDocument();

    rerender(<StatusBadge status="REJECTED" type="complaint" />);
    expect(screen.getByText('Bị từ chối')).toBeInTheDocument();
  });
});
