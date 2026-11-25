import { useState } from 'react';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import {
  fetchOwnerBookings,
  confirmOwnerBooking,
  rejectOwnerBooking,
  completeOwnerBooking,
} from '../../features/bookings/api';
import type { BookingQueryParams } from '../../features/bookings/api';
import type { Booking, BookingStatus } from '../../types';
import { BOOKING_STATUS_LABELS } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ErrorState } from '../../components/common/ErrorState';
import { useMutation } from '../../hooks/useMutation';

export function OwnerBookingsPage() {
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
    fetcher: fetchOwnerBookings,
    initialFilters: {
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    },
    initialPage: 1,
    initialPageSize: 10,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmOwnerBooking(id),
    onSuccess: () => {
      setActionSuccess('Đã xác nhận đơn đặt sân thành công');
      refetch();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectOwnerBooking(id, reason),
    onSuccess: () => {
      setActionSuccess('Đã từ chối đơn đặt sân');
      setRejectingBooking(null);
      setRejectReason('');
      refetch();
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeOwnerBooking(id),
    onSuccess: () => {
      setActionSuccess('Đã chuyển đơn sang trạng thái Hoàn thành (COMPLETED)');
      refetch();
    },
  });

  const columns: Column<Booking>[] = [
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => (
        <div>
          <strong>{row.user?.fullName || 'Khách'}</strong>
          <div className="text-muted text-sm">{row.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'court',
      header: 'Sân đặt',
      render: (row) => (
        <div>
          <strong>{row.court?.name}</strong>
          <div className="text-muted text-sm">{row.court?.venue?.name}</div>
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
      key: 'price',
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
        <div className="btn-group">
          {row.status === 'PENDING' && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => confirmMutation.mutate(row.id)}
                loading={confirmMutation.isPending}
              >
                Duyệt
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setRejectingBooking(row)}
              >
                Từ chối
              </Button>
            </>
          )}

          {row.status === 'CONFIRMED' &&
            (new Date(row.endAt).getTime() <= Date.now() ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => completeMutation.mutate(row.id)}
                loading={completeMutation.isPending}
              >
                Hoàn thành
              </Button>
            ) : (
              <span className="text-muted text-sm">Chưa kết thúc</span>
            ))}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Quản lý đơn đặt sân của chủ sân</h2>
          <p className="text-muted">Xem danh sách, xác nhận hoặc từ chối đơn đặt sân thể thao</p>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success" role="status">
          {actionSuccess}
        </div>
      )}

      {(confirmMutation.error || rejectMutation.error || completeMutation.error) && (
        <div className="alert alert-danger" role="alert">
          {confirmMutation.error || rejectMutation.error || completeMutation.error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-item">
          <label htmlFor="owner-filter-status" className="filter-label">Trạng thái:</label>
          <select
            id="owner-filter-status"
            className="form-select"
            value={filters.status || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value ? (e.target.value as BookingStatus) : undefined,
              }))
            }
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="owner-date-from" className="filter-label">Từ ngày:</label>
          <input
            id="owner-date-from"
            type="date"
            className="form-input"
            value={filters.dateFrom || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                dateFrom: e.target.value || undefined,
              }))
            }
          />
        </div>

        <div className="filter-item">
          <label htmlFor="owner-date-to" className="filter-label">Đến ngày:</label>
          <input
            id="owner-date-to"
            type="date"
            className="form-input"
            value={filters.dateTo || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                dateTo: e.target.value || undefined,
              }))
            }
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            data={items}
            columns={columns}
            loading={loading}
            emptyText="Chưa có đơn đặt sân nào thuộc các cụm sân của bạn."
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

      {/* Reject Booking Dialog */}
      <Modal
        isOpen={Boolean(rejectingBooking)}
        onClose={() => setRejectingBooking(null)}
        title="Từ chối đơn đặt sân"
        footer={
          <div className="modal-actions">
            <Button
              variant="outline"
              onClick={() => setRejectingBooking(null)}
              disabled={rejectMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              onClick={() => {
                if (rejectingBooking) {
                  rejectMutation.mutate({
                    id: rejectingBooking.id,
                    reason: rejectReason.trim() || undefined,
                  });
                }
              }}
            >
              Xác nhận từ chối
            </Button>
          </div>
        }
      >
        <div className="form-layout">
          <p>
            Bạn có chắc chắn muốn từ chối đơn đặt sân{' '}
            <strong>{rejectingBooking?.court?.name}</strong> của khách hàng{' '}
            <strong>{rejectingBooking?.user?.fullName}</strong> không?
          </p>

          <div className="form-group">
            <label htmlFor="reject-reason" className="form-label">
              Lý do từ chối (Tùy chọn):
            </label>
            <textarea
              id="reject-reason"
              className="form-textarea"
              rows={3}
              maxLength={500}
              placeholder="Ví dụ: Sân đang trong thời gian bảo dưỡng đột xuất..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
