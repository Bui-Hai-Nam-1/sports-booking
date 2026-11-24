import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from './DataTable';
import type { Column } from './DataTable';

interface Item {
  id: string;
  name: string;
  price: number;
}

describe('React Pattern: DataTable Compound Component', () => {
  const columns: Column<Item>[] = [
    { key: 'name', header: 'Tên sân' },
    {
      key: 'price',
      header: 'Giá',
      align: 'right',
      render: (row) => `${row.price.toLocaleString()} đ`,
    },
  ];

  it('should render Header, Body, and items sharing context state', () => {
    const data: Item[] = [
      { id: '1', name: 'Sân bóng 1', price: 200000 },
      { id: '2', name: 'Sân bóng 2', price: 300000 },
    ];

    render(
      <DataTable data={data} columns={columns}>
        <DataTable.Header />
        <DataTable.Body />
        <DataTable.Empty />
      </DataTable>,
    );

    expect(screen.getByText('Tên sân')).toBeInTheDocument();
    expect(screen.getByText('Giá')).toBeInTheDocument();
    expect(screen.getByText('Sân bóng 1')).toBeInTheDocument();
    expect(screen.getByText(/200[.,]000 đ/)).toBeInTheDocument();
    expect(screen.getByText('Sân bóng 2')).toBeInTheDocument();
  });

  it('should render Empty state when data is empty and not loading', () => {
    render(
      <DataTable data={[]} columns={columns} emptyText="Không tìm thấy sân nào">
        <DataTable.Header />
        <DataTable.Body />
        <DataTable.Empty />
      </DataTable>,
    );

    expect(screen.getByText('Không tìm thấy sân nào')).toBeInTheDocument();
  });

  it('should render loading indicator when loading is true', () => {
    render(
      <DataTable data={[]} columns={columns} loading={true}>
        <DataTable.Header />
        <DataTable.Body />
        <DataTable.Empty />
      </DataTable>,
    );

    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
  });

  it('should render Pagination controls and trigger onPageChange', () => {
    const onPageChange = vi.fn();

    render(
      <DataTable.Pagination
        page={2}
        totalPages={5}
        total={50}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('Trang 2 / 5 (Tổng 50 mục)')).toBeInTheDocument();

    const prevBtn = screen.getByLabelText('Trang trước');
    const nextBtn = screen.getByLabelText('Trang sau');

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
