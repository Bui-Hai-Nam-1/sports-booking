import { useState } from 'react';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { fetchMyComplaints } from '../../features/complaints/api';
import type { ComplaintQueryParams } from '../../features/complaints/api';
import type { Complaint, ComplaintStatus } from '../../types';
import { COMPLAINT_STATUS_LABELS } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ErrorState } from '../../components/common/ErrorState';
import { Modal } from '../../components/common/Modal';

export function MyComplaintsPage() {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

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
  } = usePaginatedQuery<Complaint, ComplaintQueryParams>({
    fetcher: fetchMyComplaints,
    initialFilters: {
      status: undefined,
    },
    initialPage: 1,
    initialPageSize: 10,
  });

  const columns: Column<Complaint>[] = [
    {
      key: 'subject',
      header: 'Tiêu đề khiếu nại',
      render: (row) => (
        <div>
          <strong>{row.subject}</strong>
          <div className="text-muted text-sm">
            {row.booking?.court?.name} - {row.booking?.court?.venue?.name}
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Ngày gửi',
      render: (row) => new Date(row.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} type="complaint" />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setSelectedComplaint(row)}
        >
          Xem chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Khiếu nại của tôi</h2>
          <p className="text-muted">Theo dõi tiến độ giải quyết các vấn đề đã khiếu nại</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-item">
          <label htmlFor="comp-filter-status" className="filter-label">Trạng thái:</label>
          <select
            id="comp-filter-status"
            className="form-select"
            value={filters.status || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value ? (e.target.value as ComplaintStatus) : undefined,
              }))
            }
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(COMPLAINT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
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
            emptyText="Bạn chưa có khiếu nại nào."
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

      {/* Complaint Detail Dialog */}
      <Modal
        isOpen={Boolean(selectedComplaint)}
        onClose={() => setSelectedComplaint(null)}
        title={selectedComplaint ? `Khiếu nại: ${selectedComplaint.subject}` : ''}
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSelectedComplaint(null)}
          >
            Đóng
          </button>
        }
      >
        {selectedComplaint && (
          <div className="complaint-detail-dialog">
            <div className="status-row">
              <span>Trạng thái: </span>
              <StatusBadge status={selectedComplaint.status} type="complaint" />
            </div>
            <div className="detail-item">
              <strong>Thời gian gửi:</strong>{' '}
              {new Date(selectedComplaint.createdAt).toLocaleString('vi-VN')}
            </div>
            <div className="detail-item">
              <strong>Mô tả sự việc:</strong>
              <div className="text-box">{selectedComplaint.description}</div>
            </div>
            {selectedComplaint.resolution && (
              <div className="detail-item resolution-highlight">
                <strong>Kết quả xử lý từ Admin:</strong>
                <div className="resolution-text">{selectedComplaint.resolution}</div>
                {selectedComplaint.resolvedAt && (
                  <div className="text-muted text-sm mt-1">
                    Thời điểm giải quyết:{' '}
                    {new Date(selectedComplaint.resolvedAt).toLocaleString('vi-VN')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
