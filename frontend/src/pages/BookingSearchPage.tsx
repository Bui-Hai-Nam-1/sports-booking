import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AvailabilityMatrixGrid,
  AvailabilityMatrixHeader,
  AvailabilityMatrixLegend,
  AvailabilityMatrixRoot,
  AvailabilityMatrixRow,
  AvailabilityMatrixSlotCell,
  AvailabilityMatrixSummary,
} from '../components/booking/AvailabilityMatrix';
import { formatVnd } from '../components/booking/availability-matrix-context';

const AvailabilityMatrix = {
  Root: AvailabilityMatrixRoot,
  Header: AvailabilityMatrixHeader,
  Legend: AvailabilityMatrixLegend,
  Grid: AvailabilityMatrixGrid,
  Row: AvailabilityMatrixRow,
  SlotCell: AvailabilityMatrixSlotCell,
  Summary: AvailabilityMatrixSummary,
};
import {
  clearSlotSelection,
  resetSearchFilters,
  selectCourt,
  selectVenue,
  setGridMode,
  setSearchFilters,
} from '../features/booking/bookingSlice';
import { useBookingAction } from '../hooks/useBookingAction';
import { useBookingQuery } from '../hooks/useBookingQuery';
import { useContiguousSlotSelection } from '../hooks/useContiguousSlotSelection';
import {
  checkBookingAvailability,
  createBooking,
  getCourtAvailabilityGrid,
  getVenueAvailabilityGrid,
  searchAvailableVenues,
} from '../lib/bookingApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type {
  AvailabilitySlot,
  BookingRecord,
  CheckAvailabilityResult,
} from '../types/booking';

const SPORT_OPTIONS = [
  '',
  'Bóng đá',
  'Cầu lông',
  'Tennis',
  'Pickleball',
  'Bóng rổ',
] as const;

const HOUR_OPTIONS = Array.from({ length: 19 }, (_, idx) => {
  const hour = String(idx + 5).padStart(2, '0');
  return `${hour}:00`;
});

const WEEKDAY_LABELS = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
] as const;

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function BookingSearchPage() {
  const dispatch = useAppDispatch();
  const { filters, selectedVenueId, selectedCourtId, gridMode } = useAppSelector(
    (state) => state.booking,
  );

  const [notes, setNotes] = useState('');
  const [checkResult, setCheckResult] = useState<CheckAvailabilityResult | null>(
    null,
  );
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(
    null,
  );
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);

  const searchParams = useMemo(
    () => ({
      sportType: filters.sportType || undefined,
      area: filters.area || undefined,
      date: filters.date || getTodayIso(),
      startTime:
        filters.startTime && filters.endTime ? filters.startTime : undefined,
      endTime:
        filters.startTime && filters.endTime ? filters.endTime : undefined,
      page: 1,
      limit: 12,
    }),
    [filters],
  );

  const searchQuery = useBookingQuery(searchAvailableVenues, searchParams, {
    enabled: true,
    debounceMs: 250,
  });

  const venues = useMemo(
    () => searchQuery.data?.items ?? [],
    [searchQuery.data],
  );

  // Auto-select the first matching venue & court when search results refresh.
  useEffect(() => {
    if (venues.length === 0) {
      return;
    }
    const currentVenueStillPresent = venues.some(
      (venue) => venue.id === selectedVenueId,
    );
    if (!currentVenueStillPresent) {
      const firstVenue = venues[0];
      dispatch(selectVenue(firstVenue.id));
      dispatch(selectCourt(firstVenue.courts[0]?.id ?? null));
    }
  }, [dispatch, selectedVenueId, venues]);

  const activeVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? null,
    [selectedVenueId, venues],
  );

  const venueGridParams = useMemo(
    () => ({
      venueId: activeVenue?.id ?? '',
      date: filters.date || getTodayIso(),
    }),
    [activeVenue?.id, filters.date],
  );

  const fetchVenueGrid = useCallback(
    (params: { venueId: string; date: string }) =>
      getVenueAvailabilityGrid(params.venueId, { date: params.date }),
    [],
  );

  const venueGridQuery = useBookingQuery(fetchVenueGrid, venueGridParams, {
    enabled: gridMode === 'venue' && Boolean(activeVenue?.id),
    debounceMs: 100,
  });

  const courtGridParams = useMemo(
    () => ({
      courtId: selectedCourtId ?? '',
      date: filters.date || getTodayIso(),
      days: 7,
    }),
    [filters.date, selectedCourtId],
  );

  const fetchCourtGrid = useCallback(
    (params: { courtId: string; date: string; days: number }) =>
      getCourtAvailabilityGrid(params.courtId, {
        date: params.date,
        days: params.days,
      }),
    [],
  );

  const courtGridQuery = useBookingQuery(fetchCourtGrid, courtGridParams, {
    enabled: gridMode === 'court' && Boolean(selectedCourtId),
    debounceMs: 100,
  });

  // Track which court the selected slots belong to in 'venue' matrix mode.
  const [matrixCourtId, setMatrixCourtId] = useState<string | null>(null);
  const slotSelection = useContiguousSlotSelection<AvailabilitySlot>(12);

  const checkAction = useBookingAction(checkBookingAvailability);
  const bookAction = useBookingAction(createBooking);

  const effectiveCourtId =
    gridMode === 'court' ? selectedCourtId : matrixCourtId ?? selectedCourtId;

  const handleToggleVenueCourtSlot = useCallback(
    (courtId: string, slot: AvailabilitySlot) => {
      setCheckResult(null);
      setConflictAlert(null);
      setCreatedBooking(null);

      if (gridMode === 'venue' && matrixCourtId && matrixCourtId !== courtId) {
        setMatrixCourtId(courtId);
        dispatch(selectCourt(courtId));
        slotSelection.replaceSelection(
          slot.status === 'AVAILABLE' ? [slot] : [],
        );
        return;
      }

      setMatrixCourtId(courtId);
      dispatch(selectCourt(courtId));
      slotSelection.toggleSlot(slot);
    },
    [dispatch, gridMode, matrixCourtId, slotSelection],
  );

  const handleToggleCourtDaySlot = useCallback(
    (slot: AvailabilitySlot) => {
      setCheckResult(null);
      setConflictAlert(null);
      setCreatedBooking(null);

      // Keep multi-slot selection within the same day when viewing the 7-day grid.
      const currentDate = slotSelection.selectedSlots[0]?.date;
      if (currentDate && currentDate !== slot.date) {
        slotSelection.replaceSelection(
          slot.status === 'AVAILABLE' ? [slot] : [],
        );
        return;
      }
      slotSelection.toggleSlot(slot);
    },
    [slotSelection],
  );

  const refreshAllGrids = useCallback(async () => {
    await Promise.all([
      searchQuery.refetch(),
      gridMode === 'venue' && activeVenue?.id
        ? venueGridQuery.refetch()
        : Promise.resolve(),
      gridMode === 'court' && selectedCourtId
        ? courtGridQuery.refetch()
        : Promise.resolve(),
    ]);
  }, [
    activeVenue?.id,
    courtGridQuery,
    gridMode,
    searchQuery,
    selectedCourtId,
    venueGridQuery,
  ]);

  const handleCheckAvailability = async () => {
    if (!effectiveCourtId || slotSelection.selectedSlots.length === 0) {
      return;
    }
    setConflictAlert(null);
    const result = await checkAction.execute({
      courtId: effectiveCourtId,
      slots: slotSelection.selectedSlots.map((slot) => ({
        startAt: slot.startAt,
        endAt: slot.endAt,
      })),
    });
    setCheckResult(result);
    if (!result.available) {
      setConflictAlert(result.reason ?? 'Khung giờ vừa được đặt trước.');
      await refreshAllGrids();
    }
  };

  const handleSubmitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!effectiveCourtId || slotSelection.selectedSlots.length === 0) {
      return;
    }

    setConflictAlert(null);
    try {
      const booking = await bookAction.execute({
        courtId: effectiveCourtId,
        slots: slotSelection.selectedSlots.map((slot) => ({
          startAt: slot.startAt,
          endAt: slot.endAt,
        })),
        notes: notes.trim() || undefined,
      });
      setCreatedBooking(booking);
      setCheckResult(null);
      setNotes('');
      slotSelection.clearSelection();
      dispatch(clearSlotSelection());
      await refreshAllGrids();
    } catch {
      if (bookAction.statusCode === 409) {
        setConflictAlert(
          'Rất tiếc! Người khác vừa đặt hoặc sân vừa khóa bảo trì ở khung giờ này. Lưới lịch đã được làm mới.',
        );
        slotSelection.clearSelection();
        await refreshAllGrids();
      }
    }
  };

  const hasToken =
    Boolean(localStorage.getItem('accessToken')) ||
    Boolean(localStorage.getItem('auth_token'));

  const currentMatrixColumns =
    gridMode === 'court'
      ? (courtGridQuery.data?.matrix.columns ?? [])
      : (venueGridQuery.data?.matrix.columns ?? []);

  return (
    <div className="booking-page">
      <header className="booking-hero">
        <div>
          <p className="eyebrow">MODULE ĐẶT LỊCH & LỊCH TRỐNG</p>
          <h1>Tìm sân & Đặt khung giờ trực tuyến</h1>
          <p className="hero-sub">
            Lọc theo môn thể thao, khu vực, ngày và khung giờ; chọn một hoặc
            nhiều giờ liên tiếp trên lưới lịch trực quan.
          </p>
        </div>
        <Link className="btn btn-outline" to="/bookings/my">
          Đơn đặt của tôi
        </Link>
      </header>

      <section className="panel filter-panel" aria-label="Bộ lọc tìm sân">
        <div className="filter-grid">
          <label className="field">
            <span>Môn thể thao</span>
            <select
              value={filters.sportType}
              onChange={(event) =>
                dispatch(setSearchFilters({ sportType: event.target.value }))
              }
            >
              {SPORT_OPTIONS.map((sport) => (
                <option key={sport || 'all'} value={sport}>
                  {sport || 'Tất cả môn'}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Khu vực / Tên cụm sân</span>
            <input
              type="text"
              placeholder="Ví dụ: Cầu Giấy, Quận 7..."
              value={filters.area}
              onChange={(event) =>
                dispatch(setSearchFilters({ area: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>Ngày đặt</span>
            <input
              type="date"
              min={getTodayIso()}
              value={filters.date}
              onChange={(event) =>
                dispatch(setSearchFilters({ date: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>Từ giờ (tùy chọn)</span>
            <select
              value={filters.startTime}
              onChange={(event) =>
                dispatch(setSearchFilters({ startTime: event.target.value }))
              }
            >
              <option value="">Bất kỳ</option>
              {HOUR_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Đến giờ (tùy chọn)</span>
            <select
              value={filters.endTime}
              onChange={(event) =>
                dispatch(setSearchFilters({ endTime: event.target.value }))
              }
            >
              <option value="">Bất kỳ</option>
              {HOUR_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>

          <div className="filter-actions">
            <button
              type="button"
              className="btn btn-muted"
              onClick={() => {
                dispatch(resetSearchFilters());
                slotSelection.clearSelection();
              }}
            >
              Đặt lại
            </button>
          </div>
        </div>
      </section>

      {searchQuery.error && (
        <div className="alert alert-error" role="alert">
          {searchQuery.error}
        </div>
      )}

      <div className="booking-workspace">
        <aside className="venue-sidebar" aria-label="Danh sách cụm sân">
          <div className="sidebar-head">
            <h2>Cụm sân phù hợp ({searchQuery.data?.meta.total ?? 0})</h2>
            {searchQuery.loading && <span className="muted-tag">Đang tìm...</span>}
          </div>

          {!searchQuery.loading && venues.length === 0 && (
            <div className="panel empty-box">
              <p>Chưa tìm thấy sân phù hợp với bộ lọc hiện tại.</p>
            </div>
          )}

          <div className="venue-list">
            {venues.map((venue) => {
              const isActive = venue.id === activeVenue?.id;
              return (
                <article
                  key={venue.id}
                  className={`venue-card ${isActive ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="venue-select-btn"
                    onClick={() => {
                      dispatch(selectVenue(venue.id));
                      dispatch(selectCourt(venue.courts[0]?.id ?? null));
                      dispatch(setGridMode('venue'));
                      setMatrixCourtId(venue.courts[0]?.id ?? null);
                      slotSelection.clearSelection();
                      setCheckResult(null);
                    }}
                  >
                    <div className="venue-card-title">
                      <strong>{venue.name}</strong>
                      <span className="hours-pill">
                        {venue.isClosed
                          ? 'Đóng cửa'
                          : `${venue.opensAt ?? '06:00'} – ${venue.closesAt ?? '22:00'}`}
                      </span>
                    </div>
                    <p className="venue-address">{venue.address}</p>
                    <div className="sport-tags">
                      {venue.courts.map((court) => (
                        <span key={court.id} className="sport-tag">
                          {court.name} · {court.availableSlotCount} giờ trống
                          {court.requestedWindowPrice !== null
                            ? ` (${formatVnd(court.requestedWindowPrice)})`
                            : ''}
                        </span>
                      ))}
                    </div>
                  </button>

                  {isActive && venue.courts.length > 0 && (
                    <div className="court-quick-actions">
                      {venue.courts.map((court) => (
                        <button
                          key={court.id}
                          type="button"
                          className={`mini-chip ${
                            gridMode === 'court' && selectedCourtId === court.id
                              ? 'is-active'
                              : ''
                          }`}
                          onClick={() => {
                            dispatch(selectCourt(court.id));
                            dispatch(setGridMode('court'));
                            setMatrixCourtId(court.id);
                            slotSelection.clearSelection();
                            setCheckResult(null);
                          }}
                        >
                          Lịch 7 ngày: {court.name}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </aside>

        <section className="matrix-column">
          {createdBooking && (
            <div className="alert alert-success" role="status">
              <strong>Đặt sân thành công!</strong> Mã đơn{' '}
              <code>{createdBooking.id}</code> · Tổng tiền{' '}
              <strong>{formatVnd(createdBooking.totalPrice)}</strong> · Trạng thái{' '}
              <strong>{createdBooking.status}</strong>.{' '}
              <Link to="/bookings/my">Xem đơn của tôi →</Link>
            </div>
          )}

          {(conflictAlert || bookAction.error || checkAction.error) && (
            <div className="alert alert-error" role="alert">
              {conflictAlert || bookAction.error || checkAction.error}
            </div>
          )}

          {!activeVenue ? (
            <div className="panel empty-box">
              <p>Chọn một cụm sân bên trái để xem lưới khung giờ trống.</p>
            </div>
          ) : (
            <AvailabilityMatrix.Root
              columns={currentMatrixColumns}
              selectedSlots={slotSelection.selectedSlots}
              totalPrice={slotSelection.totalPrice}
              selectionNotice={slotSelection.selectionNotice}
              isSelected={slotSelection.isSelected}
              onToggleSlot={(slot) => {
                if (gridMode === 'court') {
                  handleToggleCourtDaySlot(slot);
                }
              }}
            >
              <AvailabilityMatrix.Header
                title={
                  gridMode === 'court' && courtGridQuery.data
                    ? `${courtGridQuery.data.venue.name} · ${courtGridQuery.data.court.name}`
                    : `${activeVenue.name} (${filters.date})`
                }
                subtitle={
                  gridMode === 'court'
                    ? 'Lưới Ngày × Khung giờ trong 7 ngày tới'
                    : 'Lưới Sân con × Khung giờ trong ngày'
                }
                actions={
                  <div className="mode-toggle" role="group" aria-label="Chế độ xem lưới">
                    <button
                      type="button"
                      className={`btn btn-sm ${gridMode === 'venue' ? 'btn-primary' : 'btn-muted'}`}
                      onClick={() => {
                        dispatch(setGridMode('venue'));
                        slotSelection.clearSelection();
                      }}
                    >
                      Sân × Giờ
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${gridMode === 'court' ? 'btn-primary' : 'btn-muted'}`}
                      disabled={!selectedCourtId && !activeVenue.courts[0]?.id}
                      onClick={() => {
                        const targetCourtId =
                          selectedCourtId ?? activeVenue.courts[0]?.id ?? null;
                        if (targetCourtId) {
                          dispatch(selectCourt(targetCourtId));
                          setMatrixCourtId(targetCourtId);
                        }
                        dispatch(setGridMode('court'));
                        slotSelection.clearSelection();
                      }}
                    >
                      Ngày × Giờ (7 ngày)
                    </button>
                  </div>
                }
              />

              <AvailabilityMatrix.Legend />

              {gridMode === 'venue' && (
                <>
                  {venueGridQuery.loading && (
                    <p className="matrix-loading">Đang tải lịch sân theo ngày...</p>
                  )}
                  {venueGridQuery.error && (
                    <p className="alert alert-error">{venueGridQuery.error}</p>
                  )}
                  {!venueGridQuery.loading && venueGridQuery.data && (
                    <AvailabilityMatrix.Grid rowHeaderLabel="Sân con">
                      {venueGridQuery.data.matrix.rows.map((row) => (
                        <tr key={row.key}>
                          <th scope="row" className="matrix-sticky-col matrix-row-head">
                            <span>{row.label}</span>
                            <small>
                              {String(row.metadata?.sportType ?? '')} ·{' '}
                              {String(row.metadata?.availableCount ?? 0)} trống
                            </small>
                          </th>
                          {row.cells.map((slot) => {
                            const selected = slotSelection.isSelected(slot);
                            const isAvailable = slot.status === 'AVAILABLE';
                            const statusClass = selected
                              ? 'is-selected'
                              : slot.status === 'AVAILABLE'
                                ? 'is-available'
                                : slot.status === 'BOOKED'
                                  ? 'is-booked'
                                  : slot.status === 'MAINTENANCE'
                                    ? 'is-maintenance'
                                    : slot.status === 'PAST'
                                      ? 'is-past'
                                      : 'is-closed';

                            return (
                              <td key={`${row.key}-${slot.startTime}`}>
                                <button
                                  type="button"
                                  className={`slot-btn ${statusClass}`}
                                  disabled={!isAvailable}
                                  aria-pressed={selected}
                                  title={
                                    slot.maintenanceReason
                                      ? `Bảo trì: ${slot.maintenanceReason}`
                                      : `${row.label} (${slot.startTime}-${slot.endTime})`
                                  }
                                  onClick={() =>
                                    handleToggleVenueCourtSlot(row.key, slot)
                                  }
                                >
                                  {isAvailable ? (
                                    <>
                                      <strong className="slot-price">
                                        {Math.round(slot.price / 1000)}k
                                      </strong>
                                      <span
                                        className={`tier-tag tier-${slot.pricingType.toLowerCase()}`}
                                      >
                                        {slot.pricingType === 'PEAK'
                                          ? 'Vàng'
                                          : slot.pricingType === 'WEEKEND'
                                            ? 'C.Tuần'
                                            : 'Thường'}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="slot-state-text">
                                      {slot.status === 'BOOKED'
                                        ? 'Đã đặt'
                                        : slot.status === 'MAINTENANCE'
                                          ? 'Bảo trì'
                                          : slot.status === 'PAST'
                                            ? 'Đã qua'
                                            : 'Đóng'}
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </AvailabilityMatrix.Grid>
                  )}
                </>
              )}

              {gridMode === 'court' && (
                <>
                  {courtGridQuery.loading && (
                    <p className="matrix-loading">Đang tải lịch 7 ngày...</p>
                  )}
                  {courtGridQuery.error && (
                    <p className="alert alert-error">{courtGridQuery.error}</p>
                  )}
                  {!courtGridQuery.loading && courtGridQuery.data && (
                    <AvailabilityMatrix.Grid rowHeaderLabel="Ngày">
                      {courtGridQuery.data.matrix.rows.map((row) => {
                        const weekdayIdx = Number(row.metadata?.weekday ?? 0);
                        const weekdayText =
                          WEEKDAY_LABELS[weekdayIdx] ?? '';
                        const availCount = Number(
                          row.metadata?.availableCount ?? 0,
                        );
                        return (
                          <AvailabilityMatrix.Row
                            key={row.key}
                            rowLabel={row.label}
                            rowMeta={`${weekdayText} · ${availCount} trống`}
                            cells={row.cells}
                          />
                        );
                      })}
                    </AvailabilityMatrix.Grid>
                  )}
                </>
              )}

              <AvailabilityMatrix.Summary>
                <form className="booking-confirm-form" onSubmit={handleSubmitBooking}>
                  <input
                    type="text"
                    placeholder="Ghi chú cho chủ sân (tùy chọn)..."
                    maxLength={500}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                  <div className="confirm-buttons">
                    <button
                      type="button"
                      className="btn btn-muted"
                      disabled={checkAction.pending || bookAction.pending}
                      onClick={() => void handleCheckAvailability()}
                    >
                      {checkAction.pending
                        ? 'Đang kiểm tra...'
                        : 'Kiểm tra trống'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        slotSelection.clearSelection();
                        setCheckResult(null);
                      }}
                    >
                      Bỏ chọn
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={bookAction.pending || !hasToken}
                    >
                      {bookAction.pending ? 'Đang đặt...' : 'Xác nhận đặt sân'}
                    </button>
                  </div>
                </form>

                {!hasToken && (
                  <p className="auth-hint">
                    Bạn cần <Link to="/login">đăng nhập</Link> để gửi yêu cầu đặt
                    sân.
                  </p>
                )}

                {checkResult && checkResult.available && (
                  <p className="check-ok">
                    ✓ Sân còn trống! Tổng chi phí xác thực từ server:{' '}
                    <strong>{formatVnd(checkResult.totalPrice)}</strong>
                  </p>
                )}
              </AvailabilityMatrix.Summary>
            </AvailabilityMatrix.Root>
          )}
        </section>
      </div>
    </div>
  );
}
