import { useState } from 'react';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import {
  fetchAdminComplaints,
  updateComplaintStatus,
} from '../../features/complaints/api';
import type { ComplaintQueryParams } from '../../features/complaints/api';
import type { Complaint, ComplaintStatus } from '../../types';
import { COMPLAINT_STATUS_LABELS } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ErrorState } from '../../components/common/ErrorState';
import { useMutation } from '../../hooks/useMutation';

export function AdminComplaintsPage() {
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('IN_PROGRESS');
  const [resolution, setResolution] = useState<string>('');
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
  } = usePaginatedQuery<Complaint, ComplaintQueryParams>({
    fetcher: fetchAdminComplaints,
    initialFilters: {
      status: undefined,
    },
    initialPage: 1,
    initialPageSize: 10,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      resolution,
    }: {
      id: string;
      status: ComplaintStatus;
      resolution?: string;
    }) => updateComplaintStatus(id, { status, resolution }),
    onSuccess: () => {
      setActionSuccess('Đã cập nhật trạng thái khiếu nại thành công');
      setActiveComplaint(null);
      setResolution('');
      refetch();
    },
  });

  const columns: Column<Complaint>[] = [
    {
      key: 'complainant',
      header: 'Người gửi',
      render: (row) => (
        <div>
          <strong>{row.complainant?.fullName}</strong>
          <div className="text-muted text-sm">{row.complainant?.email}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Tiêu đề khiếu nại',
      render: (row) => (
        <div>
          <strong>{row.subject}</strong>
          <div className="text-muted text-sm">{row.booking?.court?.name}</div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Thời gian',
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveComplaint(row);
            setNewStatus(row.status === 'OPEN' ? 'IN_PROGRESS' : row.status);
            setResolution(row.resolution || '');
          }}
        >
          Xử lý
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Quản trị Khiếu nại Khách hàng</h2>
          <p className="text-muted">Tiếp nhận, điều tra và phản hồi kết quả giải quyết khiếu nại</p>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success" role="status">
          {actionSuccess}
        </div>
      )}

      {updateMutation.error && (
        <div className="alert alert-danger" role="alert">
          {updateMutation.error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-item">
          <label htmlFor="admin-comp-filter-status" className="filter-label">Trạng thái:</label>
          <select
            id="admin-comp-filter-status"
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
            emptyText="Hiện không có khiếu nại nào cần xử lý."
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

      {/* Action / Resolution Modal */}
      <Modal
        isOpen={Boolean(activeComplaint)}
        onClose={() => setActiveComplaint(null)}
        title={activeComplaint ? `Xử lý khiếu nại: ${activeComplaint.subject}` : ''}
        footer={
          <div className="modal-actions">
            <Button
              variant="outline"
              onClick={() => setActiveComplaint(null)}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={updateMutation.isPending}
              onClick={() => {
                if (activeComplaint) {
                  if (
                    (newStatus === 'RESOLVED' || newStatus === 'REJECTED') &&
                    resolution.trim().length < 5
                  ) {
                    alert('Vui lòng nhập lý do/kết quả xử lý ít nhất 5 ký tự khi đóng khiếu nại');
                    return;
                  }
                  updateMutation.mutate({
                    id: activeComplaint.id,
                    status: newStatus,
                    resolution: resolution.trim() || undefined,
                  });
                }
              }}
            >
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        {activeComplaint && (
          <div className="form-layout">
            <div className="detail-item">
              <strong>Khách khiếu nại:</strong> {activeComplaint.complainant?.fullName} (
              {activeComplaint.complainant?.email})
            </div>
            <div className="detail-item">
              <strong>Nội dung phản ánh:</strong>
              <div className="text-box">{activeComplaint.description}</div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-comp-status-select" className="form-label">
                Chuyển trạng thái xử lý:
              </label>
              <select
                id="admin-comp-status-select"
                className="form-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
              >
                {activeComplaint.status === 'OPEN' && (
                  <>
                    <option value="OPEN">Chờ tiếp nhận (OPEN)</option>
                    <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                    <option value="RESOLVED">Giải quyết xong (RESOLVED)</option>
                    <option value="REJECTED">Từ chối khiếu nại (REJECTED)</option>
                  </>
                )}
                {activeComplaint.status === 'IN_PROGRESS' && (
                  <>
                    <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                    <option value="RESOLVED">Giải quyết xong (RESOLVED)</option>
                    <option value="REJECTED">Từ chối khiếu nại (REJECTED)</option>
                  </>
                )}
                {(activeComplaint.status === 'RESOLVED' ||
                  activeComplaint.status === 'REJECTED') && (
                  <option value={activeComplaint.status}>
                    Đã đóng ({activeComplaint.status})
                  </option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="admin-comp-resolution" className="form-label">
                Nội dung phản hồi / Giải pháp xử lý:{' '}
                {(newStatus === 'RESOLVED' || newStatus === 'REJECTED') && (
                  <span className="text-danger">* (Bắt buộc khi đóng khiếu nại)</span>
                )}
              </label>
              <textarea
                id="admin-comp-resolution"
                className="form-textarea"
                rows={4}
                maxLength={2000}
                placeholder="Nhập thông tin phản hồi cho khách hàng và ghi chú hướng xử lý..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
