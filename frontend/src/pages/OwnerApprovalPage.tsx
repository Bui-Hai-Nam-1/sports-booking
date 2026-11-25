import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

type PendingVenue = {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
  };
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
        'message' in data
      ) {
        const message = data.message;
        if (typeof message === 'string') return message;
        if (Array.isArray(message)) return message.join(', ');
      }
    }
  }
  return 'Không thể tải hoặc cập nhật danh sách sân chờ duyệt.';
}

export function OwnerApprovalPage() {
  const [venues, setVenues] = useState<PendingVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PendingVenue[]>('/venues/pending');
      setVenues(response.data);
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

  async function review(venueId: string, status: 'APPROVED' | 'REJECTED') {
    setError('');
    setNotice('');
    try {
      await api.patch(`/venues/${venueId}/approval`, { status });
      setNotice(
        status === 'APPROVED'
          ? 'Đã duyệt địa điểm. Tài khoản chủ sân được cấp quyền OWNER.'
          : 'Đã từ chối địa điểm.',
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
          <h1>Duyệt đăng ký sân</h1>
          <p>Kiểm tra thông tin địa điểm trước khi công khai và cấp quyền chủ sân.</p>
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
      {!loading && venues.length === 0 && !error && (
        <p className="empty-state">Hiện không có địa điểm nào cần duyệt.</p>
      )}
      <div className="managed-venues">
        {venues.map((venue) => (
          <article className="management-card approval-card" key={venue.id}>
            <div>
              <h2>{venue.name}</h2>
              <p>{venue.address}</p>
              <p>
                Chủ sân: {venue.owner.fullName} · {venue.owner.email}
              </p>
              <span className="field-hint">
                Gửi ngày{' '}
                {new Date(venue.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="form-actions">
              <button
                className="button"
                type="button"
                onClick={() => void review(venue.id, 'APPROVED')}
              >
                Duyệt
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={() => void review(venue.id, 'REJECTED')}
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
