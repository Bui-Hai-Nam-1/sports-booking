import { Link } from 'react-router-dom';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { fetchMyBookings } from '../../features/bookings/api';
import type { BookingQueryParams } from '../../features/bookings/api';
import type { Booking, BookingStatus } from '../../types';
import { BOOKING_STATUS_LABELS } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ErrorState } from '../../components/common/ErrorState';

export function MyBookingsPage() {
  const {
    items,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    refetch,
  } = usePaginatedQuery<Booking, BookingQueryParams>({
    fetcher: fetchMyBookings,
    initialFilters: {
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    },
    initialPage: 1,
    initialPageSize: 10,
  });

  const columns: Column<Booking>[] = [
    {
      key: 'court',
      header: 'Sân & Cụm sân',
      render: (row) => (
        <div>
          <strong>{row.court?.name ?? 'Sân thể thao'}</strong>
          <div className="text-muted text-sm">{row.court?.venue?.name ?? 'Cụm sân'}</div>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Thời gian',
      render: (row) => {
        const start = new Date(row.startAt);
        const end = new Date(row.endAt);
        return (
          <div>
            <div>{start.toLocaleDateString('vi-VN')}</div>
            <div className="text-muted text-sm">
              {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
              {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalPrice',
      header: 'Tổng tiền',
      align: 'right',
      render: (row) => (
        <span className="price-tag font-semibold">
          {Number(row.totalPrice).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} type="booking" />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (row) => (
        <Link to={`/my/bookings/${row.id}`} className="btn btn-outline btn-sm">
          Chi tiết
        </Link>
      ),
    },
  ];

  function handleStatusChange(status: string) {
    setFilters((prev) => ({
      ...prev,
      status: status ? (status as BookingStatus) : undefined,
    }));
  }

  function handleDateChange(field: 'dateFrom' | 'dateTo', value: string) {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Lịch sử đặt sân của tôi</h2>
          <p className="text-muted">Theo dõi và quản lý danh sách các lượt đặt sân thể thao</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-item">
          <label htmlFor="filter-status" className="filter-label">Trạng thái:</label>
          <select
            id="filter-status"
            className="form-select"
            value={filters.status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(BOOKING_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="filter-date-from" className="filter-label">Từ ngày:</label>
          <input
            id="filter-date-from"
            type="date"
            className="form-input"
            value={filters.dateFrom || ''}
            onChange={(e) => handleDateChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="filter-date-to" className="filter-label">Đến ngày:</label>
          <input
            id="filter-date-to"
            type="date"
            className="form-input"
            value={filters.dateTo || ''}
            onChange={(e) => handleDateChange('dateTo', e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          {/* Compound Component: DataTable */}
          <DataTable
            data={items}
            columns={columns}
            loading={loading}
            emptyText="Bạn chưa có lượt đặt sân nào phù hợp với bộ lọc."
          >
            <DataTable.Header />
            <DataTable.Body />
            <DataTable.Empty />
          </DataTable>

          <DataTable.Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
