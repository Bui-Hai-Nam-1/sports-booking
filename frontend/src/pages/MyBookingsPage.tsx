import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { formatVnd } from '../components/booking/availability-matrix-context';
import {
  cancelMyBookingThunk,
  fetchMyBookingsThunk,
} from '../features/booking/bookingSlice';
import { useBookingAction } from '../hooks/useBookingAction';
import { useBookingQuery } from '../hooks/useBookingQuery';
import { listOwnerBookings, updateBookingStatus } from '../lib/bookingApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { UserRole } from '../types';
import {
  BOOKING_STATUSES,
  type BookingRecord,
  type BookingStatus,
} from '../types/booking';

const CANCELLATION_DEADLINE_HOURS = 2;

const STATUS_LABEL: Readonly<Record<BookingStatus, string>> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Từ chối',
};

interface StoredUser {
  id: string;
  role: UserRole;
  fullName?: string;
}

function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { id?: unknown; role?: unknown };
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'CUSTOMER' ||
      candidate.role === 'OWNER' ||
      candidate.role === 'ADMIN')
  );
}

function readCurrentUserRole(): UserRole | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isStoredUser(parsed) ? parsed.role : null;
  } catch {
    return null;
  }
}

function formatDateTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateText = start.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = end.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateText} · ${startTime} – ${endTime}`;
}

function getCustomerCancellationState(booking: BookingRecord): {
  allowed: boolean;
  hint: string;
} {
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
    return {
      allowed: false,
      hint: `Đơn ở trạng thái "${STATUS_LABEL[booking.status]}" không thể hủy.`,
    };
  }
  const startMs = new Date(booking.startAt).getTime();
  const nowMs = Date.now();
  if (nowMs >= startMs) {
    return { allowed: false, hint: 'Đã đến hoặc qua giờ bắt đầu.' };
  }
  const leadMs = startMs - nowMs;
  if (leadMs < CANCELLATION_DEADLINE_HOURS * 3600_000) {
    return {
      allowed: false,
      hint: `Quá hạn hủy: cần hủy trước giờ chơi tối thiểu ${CANCELLATION_DEADLINE_HOURS} tiếng.`,
    };
  }
  return {
    allowed: true,
    hint: `Có thể hủy trước giờ bắt đầu ít nhất ${CANCELLATION_DEADLINE_HOURS} tiếng.`,
  };
}

export function MyBookingsPage({
  initialTab = 'mine',
}: {
  initialTab?: 'mine' | 'owner';
}) {
  const dispatch = useAppDispatch();
  const {
    myBookings,
    myBookingsMeta,
    myBookingsStatus,
    error: sliceError,
  } = useAppSelector((state) => state.booking);

  const userRole = readCurrentUserRole();
  const canManageAsOwner = userRole === 'OWNER' || userRole === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'mine' | 'owner'>(initialTab);

  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [statusTarget, setStatusTarget] = useState<{
    bookingId: string;
    nextStatus: 'REJECTED' | 'CANCELLED';
  } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const hasToken =
    Boolean(localStorage.getItem('accessToken')) ||
    Boolean(localStorage.getItem('auth_token'));

  const mineParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 8,
    }),
    [dateFrom, dateTo, page, statusFilter],
  );

  const loadMine = useCallback(
    async (params: typeof mineParams) => {
      await dispatch(fetchMyBookingsThunk(params)).unwrap();
      return true;
    },
    [dispatch],
  );

  const mineQuery = useBookingQuery(loadMine, mineParams, {
    enabled: hasToken && activeTab === 'mine',
    debounceMs: 150,
  });

  const ownerParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 8,
    }),
    [dateFrom, dateTo, page, statusFilter],
  );

  const ownerQuery = useBookingQuery(listOwnerBookings, ownerParams, {
    enabled: hasToken && activeTab === 'owner',
    debounceMs: 150,
  });

  const ownerStatusAction = useBookingAction(
    (input: {
      bookingId: string;
      status: BookingStatus;
      reason?: string;
    }) =>
      updateBookingStatus(input.bookingId, {
        status: input.status,
        reason: input.reason,
      }),
  );

  const handleConfirmCancel = async (event: FormEvent) => {
    event.preventDefault();
    if (!cancellingId || cancelReason.trim().length < 3) {
      return;
    }
    setActionError(null);
    setActionMessage(null);
    try {
      await dispatch(
        cancelMyBookingThunk({
          bookingId: cancellingId,
          payload: { reason: cancelReason.trim() },
        }),
      ).unwrap();
      setActionMessage(`Đã hủy đơn ${cancellingId} thành công.`);
      setCancellingId(null);
      setCancelReason('');
      await mineQuery.refetch();
    } catch (reason) {
      setActionError(
        typeof reason === 'string' ? reason : 'Không thể hủy đơn đặt.',
      );
    }
  };

  const handleDirectOwnerTransition = async (
    bookingId: string,
    status: BookingStatus,
    reason?: string,
  ) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await ownerStatusAction.execute({ bookingId, status, reason });
      setActionMessage(
        `Đã cập nhật đơn ${bookingId} sang trạng thái ${STATUS_LABEL[status]}.`,
      );
      setStatusTarget(null);
      setStatusReason('');
      await ownerQuery.refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.',
      );
    }
  };

  const handleSubmitOwnerReason = async (event: FormEvent) => {
    event.preventDefault();
    if (!statusTarget || statusReason.trim().length < 3) {
      return;
    }
    await handleDirectOwnerTransition(
      statusTarget.bookingId,
      statusTarget.nextStatus,
      statusReason.trim(),
    );
  };

  if (!hasToken) {
    return (
      <div className="booking-page">
        <div className="panel empty-box">
          <h1>Quản lý đơn đặt sân</h1>
          <p>
            Bạn chưa đăng nhập. Vui lòng <Link to="/login">đăng nhập</Link> để
            xem lịch sử đơn đặt hoặc hủy lịch theo quy định.
          </p>
          <Link className="btn btn-primary" to="/bookings">
            Tìm sân đặt lịch ngay
          </Link>
        </div>
      </div>
    );
  }

  const activeMeta =
    activeTab === 'mine' ? myBookingsMeta : ownerQuery.data?.meta ?? null;
  const activeRecords =
    activeTab === 'mine' ? myBookings : [...(ownerQuery.data?.items ?? [])];
  const isLoading =
    activeTab === 'mine'
      ? myBookingsStatus === 'loading' || mineQuery.loading
      : ownerQuery.loading;

  return (
    <div className="booking-page my-bookings-page">
      <header className="booking-hero">
        <div>
          <p className="eyebrow">QUẢN LÝ ĐƠN ĐẶT SÂN</p>
          <h1>Lịch đặt & Trạng thái đơn</h1>
          <p className="hero-sub">
            Quy định hủy lịch: Khách hàng được hủy đơn{' '}
            <strong>Chờ xác nhận</strong> hoặc <strong>Đã xác nhận</strong>{' '}
            trước giờ bắt đầu tối thiểu{' '}
            <strong>{CANCELLATION_DEADLINE_HOURS} tiếng</strong>.
          </p>
        </div>
        <Link className="btn btn-primary" to="/bookings">
          + Đặt sân mới
        </Link>
      </header>

      <div className="tab-bar" role="tablist" aria-label="Chế độ xem đơn">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mine'}
          className={`btn ${activeTab === 'mine' ? 'btn-primary' : 'btn-muted'}`}
          onClick={() => {
            setActiveTab('mine');
            setPage(1);
            setActionMessage(null);
            setActionError(null);
          }}
        >
          Đơn đặt của tôi
        </button>

        {(canManageAsOwner || initialTab === 'owner') && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'owner'}
            className={`btn ${activeTab === 'owner' ? 'btn-primary' : 'btn-muted'}`}
            onClick={() => {
              setActiveTab('owner');
              setPage(1);
              setActionMessage(null);
              setActionError(null);
            }}
          >
            Quản lý đơn tại sân (Chủ sân / Admin)
          </button>
        )}
      </div>

      <section className="panel" aria-label="Bộ lọc đơn đặt">
        <div className="bookings-filter-row">
          <label className="field">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as BookingStatus | '');
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {BOOKING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="field">
            <span>Đến ngày</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <div className="filter-actions">
            <button
              type="button"
              className="btn btn-muted"
              onClick={() => {
                setStatusFilter('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </section>

      {actionMessage && (
        <div className="alert alert-success" role="status">
          {actionMessage}
        </div>
      )}

      {(actionError || sliceError || ownerQuery.error || mineQuery.error) && (
        <div className="alert alert-error" role="alert">
          {actionError || sliceError || ownerQuery.error || mineQuery.error}
        </div>
      )}

      {isLoading && <p className="matrix-loading">Đang tải danh sách đơn...</p>}

      {!isLoading && activeRecords.length === 0 && (
        <div className="panel empty-box">
          <p>Chưa có đơn đặt nào phù hợp bộ lọc hiện tại.</p>
        </div>
      )}

      <div className="booking-cards">
        {activeRecords.map((booking) => {
          const cancelPolicy = getCustomerCancellationState(booking);
          const nowMs = Date.now();
          const hasEnded = nowMs >= new Date(booking.endAt).getTime();
          const hasStarted = nowMs >= new Date(booking.startAt).getTime();

          return (
            <article key={booking.id} className="panel booking-card">
              <div className="booking-card-top">
                <div>
                  <span className="booking-code">Mã đơn: {booking.id}</span>
                  <h3>
                    {booking.court.venue.name} · {booking.court.name}
                  </h3>
                  <p className="venue-address">
                    {booking.court.sportType} · {booking.court.venue.address}
                  </p>
                </div>

                <span
                  className={`status-badge status-${booking.status.toLowerCase()}`}
                >
                  {STATUS_LABEL[booking.status]}
                </span>
              </div>

              <div className="booking-meta-grid">
                <div>
                  <small>Thời gian chơi</small>
                  <strong>
                    {formatDateTimeRange(booking.startAt, booking.endAt)}
                  </strong>
                </div>
                <div>
                  <small>Tổng thanh toán</small>
                  <strong>{formatVnd(booking.totalPrice)}</strong>
                </div>
                {activeTab === 'owner' && booking.user && (
                  <div>
                    <small>Khách đặt</small>
                    <strong>
                      {booking.user.fullName} ({booking.user.email})
                    </strong>
                  </div>
                )}
              </div>

              {booking.notes && (
                <p className="booking-note-line">
                  <strong>Ghi chú:</strong> {booking.notes}
                </p>
              )}

              {booking.cancelReason && (
                <p className="booking-note-line is-danger">
                  <strong>Lý do hủy/từ chối:</strong> {booking.cancelReason}
                </p>
              )}

              {activeTab === 'mine' && (
                <div className="booking-card-actions">
                  <span className="policy-hint">{cancelPolicy.hint}</span>
                  {cancelPolicy.allowed && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        setCancellingId(booking.id);
                        setCancelReason('');
                        setActionError(null);
                      }}
                    >
                      Hủy lịch
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'owner' && (
                <div className="booking-card-actions">
                  <div className="confirm-buttons">
                    {booking.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={ownerStatusAction.pending}
                          onClick={() =>
                            void handleDirectOwnerTransition(
                              booking.id,
                              'CONFIRMED',
                            )
                          }
                        >
                          Xác nhận đơn
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={ownerStatusAction.pending}
                          onClick={() => {
                            setStatusTarget({
                              bookingId: booking.id,
                              nextStatus: 'REJECTED',
                            });
                            setStatusReason('');
                          }}
                        >
                          Từ chối
                        </button>
                      </>
                    )}

                    {booking.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={ownerStatusAction.pending || !hasEnded}
                        title={
                          hasEnded
                            ? 'Đánh dấu đơn đã hoàn thành'
                            : 'Chỉ hoàn thành sau khi kết thúc khung giờ đặt'
                        }
                        onClick={() =>
                          void handleDirectOwnerTransition(
                            booking.id,
                            'COMPLETED',
                          )
                        }
                      >
                        Hoàn thành
                      </button>
                    )}

                    {(booking.status === 'PENDING' ||
                      booking.status === 'CONFIRMED') &&
                      !hasStarted && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={ownerStatusAction.pending}
                          onClick={() => {
                            setStatusTarget({
                              bookingId: booking.id,
                              nextStatus: 'CANCELLED',
                            });
                            setStatusReason('');
                          }}
                        >
                          Hủy bởi chủ sân
                        </button>
                      )}
                  </div>
                </div>
              )}

              {cancellingId === booking.id && activeTab === 'mine' && (
                <form className="cancel-box" onSubmit={handleConfirmCancel}>
                  <label className="field">
                    <span>Lý do hủy lịch (tối thiểu 3 ký tự)</span>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={300}
                      placeholder="Ví dụ: Thay đổi kế hoạch nhóm..."
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                    />
                  </label>
                  <div className="confirm-buttons">
                    <button type="submit" className="btn btn-sm btn-danger">
                      Xác nhận hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-muted"
                      onClick={() => setCancellingId(null)}
                    >
                      Đóng
                    </button>
                  </div>
                </form>
              )}

              {statusTarget?.bookingId === booking.id &&
                activeTab === 'owner' && (
                  <form className="cancel-box" onSubmit={handleSubmitOwnerReason}>
                    <label className="field">
                      <span>
                        Lý do{' '}
                        {statusTarget.nextStatus === 'REJECTED'
                          ? 'từ chối'
                          : 'hủy'}{' '}
                        (tối thiểu 3 ký tự)
                      </span>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={300}
                        placeholder="Nhập lý do gửi khách..."
                        value={statusReason}
                        onChange={(event) => setStatusReason(event.target.value)}
                      />
                    </label>
                    <div className="confirm-buttons">
                      <button
                        type="submit"
                        className="btn btn-sm btn-danger"
                        disabled={ownerStatusAction.pending}
                      >
                        Xác nhận
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-muted"
                        onClick={() => setStatusTarget(null)}
                      >
                        Đóng
                      </button>
                    </div>
                  </form>
                )}
            </article>
          );
        })}
      </div>

      {activeMeta && activeMeta.totalPages > 1 && (
        <div className="pagination-row">
          <button
            type="button"
            className="btn btn-sm btn-muted"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            ← Trang trước
          </button>
          <span>
            Trang {activeMeta.page} / {activeMeta.totalPages} (
            {activeMeta.total} đơn)
          </span>
          <button
            type="button"
            className="btn btn-sm btn-muted"
            disabled={page >= activeMeta.totalPages}
            onClick={() =>
              setPage((prev) => Math.min(activeMeta.totalPages, prev + 1))
            }
          >
            Trang sau →
          </button>
        </div>
      )}
    </div>
  );
}
