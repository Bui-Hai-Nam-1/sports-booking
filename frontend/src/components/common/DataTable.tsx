import React, { createContext, useContext } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableContextValue<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyText?: string;
  keyExtractor?: (row: T, index: number) => string;
}

const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

function useDataTableContext<T>() {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error('DataTable compound components must be rendered inside <DataTable>');
  }
  return context as DataTableContextValue<T>;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyText?: string;
  keyExtractor?: (row: T, index: number) => string;
  children: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyText = 'Không có dữ liệu',
  keyExtractor,
  children,
  className = '',
}: DataTableProps<T>) {
  return (
    <DataTableContext.Provider value={{ data, columns, loading, emptyText, keyExtractor }}>
      <div className={`table-container ${className}`}>
        <table className="data-table">{children}</table>
      </div>
    </DataTableContext.Provider>
  );
}

function DataTableHeader() {
  const { columns } = useDataTableContext();
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            style={{ textAlign: col.align || 'left' }}
            className={col.className || ''}
          >
            {col.header}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function DataTableBody<T>() {
  const { data, columns, loading, keyExtractor } = useDataTableContext<T>();

  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="table-loading-spinner">Đang tải dữ liệu...</div>
          </td>
        </tr>
      </tbody>
    );
  }

  if (data.length === 0) {
    return null; // DataTable.Empty handles this
  }

  return (
    <tbody>
      {data.map((row, index) => {
        const key = keyExtractor ? keyExtractor(row, index) : (row as any)?.id || index;
        return (
          <tr key={key}>
            {columns.map((col) => (
              <td
                key={col.key}
                style={{ textAlign: col.align || 'left' }}
                className={col.className || ''}
              >
                {col.render ? col.render(row, index) : (row as any)?.[col.key] ?? '-'}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

function DataTableEmpty() {
  const { data, columns, loading, emptyText } = useDataTableContext();

  if (loading || data.length > 0) {
    return null;
  }

  return (
    <tbody>
      <tr>
        <td
          colSpan={columns.length}
          style={{ textAlign: 'center', padding: '2.5rem', color: '#666' }}
        >
          <div className="table-empty-box">
            <p>{emptyText}</p>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

export interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

function DataTablePagination({
  page,
  totalPages,
  total,
  onPageChange,
}: DataTablePaginationProps) {
  if (total <= 0) return null;

  return (
    <div className="table-pagination-bar" role="navigation" aria-label="Phân trang">
      <span className="pagination-info">
        Trang {page} / {Math.max(totalPages, 1)} (Tổng {total} mục)
      </span>
      <div className="pagination-buttons">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          &larr; Trước
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
        >
          Sau &rarr;
        </button>
      </div>
    </div>
  );
}

DataTable.Header = DataTableHeader;
DataTable.Body = DataTableBody;
DataTable.Empty = DataTableEmpty;
DataTable.Pagination = DataTablePagination;
