import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBookingDetail, cancelCustomerBooking } from '../../features/bookings/api';
import type { Booking } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { RatingStars } from '../../components/common/RatingStars';
import { ReviewFormModal } from '../../features/reviews/ReviewFormModal';
import { ComplaintFormModal } from '../../features/complaints/ComplaintFormModal';
import { useMutation } from '../../hooks/useMutation';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookingDetail(id);
      setBooking(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết đơn đặt sân');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const cancelMutation = useMutation({
    mutationFn: () => cancelCustomerBooking(id!),
    onSuccess: (updated) => {
      setBooking((prev) => (prev ? { ...prev, status: updated.status } : updated));
      setActionSuccess('Đã hủy đơn đặt sân thành công');
    },
  });

  if (loading) {
    return <LoadingState message="Đang tải thông tin đơn đặt sân..." />;
  }

  if (error || !booking) {
    return <ErrorState message={error || 'Không tìm thấy đơn đặt sân'} onRetry={loadDetail} />;
  }

  const startAt = new Date(booking.startAt);
  const endAt = new Date(booking.endAt);
  const isPast = endAt <= new Date();
  const canCancel =
    (booking.status === 'PENDING' || booking.status === 'CONFIRMED') &&
    startAt.getTime() - Date.now() >= 2 * 60 * 60 * 1000;
  const canReview = booking.status === 'COMPLETED' && isPast && !booking.review;

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/my/bookings">&larr; Quay lại danh sách đặt sân</Link>
      </div>

      <div className="page-header">
        <div>
          <h2>Chi tiết đơn đặt #{booking.id.slice(-6)}</h2>
          <div className="header-meta">
            <StatusBadge status={booking.status} type="booking" />
            <span className="text-muted">
              Tạo lúc {new Date(booking.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="header-actions">
          {canCancel && (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn hủy đơn đặt sân này không?')) {
                  cancelMutation.mutate(undefined);
                }
              }}
              loading={cancelMutation.isPending}
            >
              Hủy đặt sân
            </Button>
          )}

          {canReview && (
            <Button variant="primary" onClick={() => setIsReviewOpen(true)}>
              Viết đánh giá
            </Button>
          )}

          <Button variant="outline" onClick={() => setIsComplaintOpen(true)}>
            Gửi khiếu nại
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success" role="status">
          {actionSuccess}
        </div>
      )}

      {cancelMutation.error && (
        <div className="alert alert-danger" role="alert">
          {cancelMutation.error}
        </div>
      )}

      {/* Main Details Grid */}
      <div className="detail-grid">
        <div className="detail-card">
          <h3>Thông tin sân thể thao</h3>
          <table className="info-table">
            <tbody>
              <tr>
                <th>Tên sân:</th>
                <td><strong>{booking.court?.name}</strong></td>
              </tr>
              <tr>
                <th>Cụm sân:</th>
                <td>{booking.court?.venue?.name}</td>
              </tr>
              <tr>
                <th>Địa chỉ:</th>
                <td>{booking.court?.venue?.address}</td>
              </tr>
              <tr>
                <th>Môn thể thao:</th>
                <td>{booking.court?.sportType}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="detail-card">
          <h3>Thời gian & Thanh toán</h3>
          <table className="info-table">
            <tbody>
              <tr>
                <th>Ngày chơi:</th>
                <td>{startAt.toLocaleDateString('vi-VN')}</td>
              </tr>
              <tr>
                <th>Khung giờ:</th>
                <td>
                  {startAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {endAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
              <tr>
                <th>Tổng thanh toán:</th>
                <td>
                  <span className="price-tag text-lg font-bold">
                    {Number(booking.totalPrice).toLocaleString('vi-VN')} đ
                  </span>
                </td>
              </tr>
              <tr>
                <th>Trạng thái:</th>
                <td><StatusBadge status={booking.status} type="booking" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Existing Review Section */}
      {booking.review && (
        <div className="detail-section">
          <h3>Đánh giá của bạn</h3>
          <div className="review-card">
            <div className="review-rating">
              <RatingStars value={booking.review.rating} readOnly size="md" />
              <span className="text-muted text-sm">
                Đánh giá vào {new Date(booking.review.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            {booking.review.comment ? (
              <p className="review-comment">{booking.review.comment}</p>
            ) : (
              <p className="text-muted text-italic">Không có lời nhận xét kèm theo</p>
            )}
          </div>
        </div>
      )}

      {/* Complaints Section */}
      {booking.complaints && booking.complaints.length > 0 && (
        <div className="detail-section">
          <h3>Lịch sử khiếu nại cho đơn này</h3>
          <div className="complaints-list">
            {booking.complaints.map((comp) => (
              <div key={comp.id} className="complaint-card">
                <div className="complaint-header">
                  <strong>{comp.subject}</strong>
                  <StatusBadge status={comp.status} type="complaint" />
                </div>
                <p>{comp.description}</p>
                {comp.resolution && (
                  <div className="resolution-box">
                    <strong>Phản hồi từ Ban Quản Trị:</strong>
                    <p>{comp.resolution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewFormModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        bookingId={booking.id}
        courtName={booking.court?.name || 'Sân thể thao'}
        onSuccess={(rev) => {
          setBooking((prev) => (prev ? { ...prev, review: rev } : prev));
          setActionSuccess('Đã gửi đánh giá thành công! Cảm ơn bạn đã phản hồi.');
        }}
      />

      {/* Complaint Modal */}
      <ComplaintFormModal
        isOpen={isComplaintOpen}
        onClose={() => setIsComplaintOpen(false)}
        bookingId={booking.id}
        courtName={booking.court?.name || 'Sân thể thao'}
        onSuccess={(comp) => {
          setBooking((prev) =>
            prev
              ? {
                  ...prev,
                  complaints: [...(prev.complaints || []), comp],
                }
              : prev,
          );
          setActionSuccess('Đã gửi khiếu nại thành công. Quản trị viên sẽ xử lý sớm nhất.');
        }}
      />
    </div>
  );
}
