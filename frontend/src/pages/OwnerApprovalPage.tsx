import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

type PendingOwner = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response
    ) {
      const data = response.data;
      if (
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
      ) {
        return data.message;
      }
    }
  }
  return 'Không thể tải hoặc cập nhật danh sách chủ sân.';
}

export function OwnerApprovalPage() {
  const [owners, setOwners] = useState<PendingOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PendingOwner[]>('/admin/owners/pending');
      setOwners(response.data);
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function review(ownerId: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await api.patch(`/admin/owners/${ownerId}/approval`, { status });
      setNotice(
        status === 'APPROVED'
          ? 'Đã duyệt chủ sân.'
          : 'Đã từ chối yêu cầu chủ sân.',
      );
      await refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <section className="management-page">
      <div className="management-heading">
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1>Duyệt chủ sân</h1>
          <p>Chủ sân cần được duyệt trước khi tạo và quản lý địa điểm.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void refresh()}
        >
          Tải lại
        </button>
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {loading && <p>Đang tải yêu cầu…</p>}
      {!loading && owners.length === 0 && !error && (
        <p className="empty-state">Hiện không có yêu cầu nào cần duyệt.</p>
      )}
      <div className="managed-venues">
        {owners.map((owner) => (
          <article className="management-card approval-card" key={owner.id}>
            <div>
              <h2>{owner.fullName}</h2>
              <p>{owner.email}</p>
              <span className="field-hint">
                Đăng ký ngày{' '}
                {new Date(owner.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="form-actions">
              <button
                className="button"
                type="button"
                onClick={() => void review(owner.id, 'APPROVED')}
              >
                Duyệt
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={() => void review(owner.id, 'REJECTED')}
              >
                Từ chối
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
