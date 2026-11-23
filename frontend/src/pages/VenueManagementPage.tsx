import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';

type OpeningHour = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

type PriceRule = {
  id: string;
  name: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  pricePerHour: string;
};

type Court = {
  id: string;
  name: string;
  sportType: string;
  imageUrls: string[];
  isActive: boolean;
  priceRules: PriceRule[];
};

type Venue = {
  id: string;
  name: string;
  address: string;
  description: string | null;
  sportTypes: string[];
  imageUrls: string[];
  isActive: boolean;
  openingHours: OpeningHour[];
  courts: Court[];
};

type VenueDraft = {
  name: string;
  address: string;
  description: string;
  sportTypes: string;
  imageUrls: string;
  openingHours: OpeningHour[];
};

type CourtDraft = {
  venueId: string;
  courtId: string;
  name: string;
  sportType: string;
  imageUrls: string;
};
type PriceDraft = {
  courtId: string;
  ruleId?: string;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  pricePerHour: string;
};
type Maintenance = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string;
};

const weekDays = [
  'Chủ nhật',
  'Thứ hai',
  'Thứ ba',
  'Thứ tư',
  'Thứ năm',
  'Thứ sáu',
  'Thứ bảy',
];
const defaultHours = (): OpeningHour[] =>
  weekDays.map((_, dayOfWeek) => ({
    dayOfWeek,
    openTime: '06:00',
    closeTime: '22:00',
    isClosed: false,
  }));
const emptyVenueDraft = (): VenueDraft => ({
  name: '',
  address: '',
  description: '',
  sportTypes: '',
  imageUrls: '',
  openingHours: defaultHours(),
});

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response
    ) {
      const data = response.data;
      if (typeof data === 'object' && data !== null && 'message' in data) {
        const message = data.message;
        if (typeof message === 'string') return message;
        if (Array.isArray(message)) return message.join(', ');
      }
    }
  }
  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}

export function VenueManagementPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueDraft, setVenueDraft] = useState<VenueDraft>(emptyVenueDraft);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [courtDraft, setCourtDraft] = useState<CourtDraft | null>(null);
  const [priceDraft, setPriceDraft] = useState<PriceDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Venue[]>('/venues/mine');
      setVenues(response.data);
      setError('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function beginEdit(venue: Venue) {
    setEditingVenueId(venue.id);
    setVenueDraft({
      name: venue.name,
      address: venue.address,
      description: venue.description ?? '',
      sportTypes: venue.sportTypes.join(', '),
      imageUrls: venue.imageUrls.join('\n'),
      openingHours: weekDays.map((_, dayOfWeek) => {
        const saved = venue.openingHours.find(
          (hour) => hour.dayOfWeek === dayOfWeek,
        );
        return (
          saved ?? {
            dayOfWeek,
            openTime: '06:00',
            closeTime: '22:00',
            isClosed: true,
          }
        );
      }),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingVenueId(null);
    setVenueDraft(emptyVenueDraft());
  }

  async function saveVenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: venueDraft.name,
        address: venueDraft.address,
        description: venueDraft.description || undefined,
        sportTypes: venueDraft.sportTypes
          .split(',')
          .map((sport) => sport.trim())
          .filter(Boolean),
        imageUrls: splitLines(venueDraft.imageUrls),
        openingHours: venueDraft.openingHours,
      };
      if (editingVenueId) {
        await api.patch(`/venues/${editingVenueId}`, payload);
      } else {
        await api.post('/venues', payload);
      }
      setNotice(editingVenueId ? 'Đã cập nhật cụm sân.' : 'Đã tạo cụm sân.');
      cancelEdit();
      await refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function saveCourt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courtDraft) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: courtDraft.name,
        sportType: courtDraft.sportType,
        imageUrls: splitLines(courtDraft.imageUrls),
      };
      if (courtDraft.courtId) {
        await api.patch(`/courts/${courtDraft.courtId}`, payload);
      } else {
        await api.post(`/venues/${courtDraft.venueId}/courts`, payload);
      }
      setCourtDraft(null);
      setNotice(courtDraft.courtId ? 'Đã cập nhật sân.' : 'Đã thêm sân.');
      await refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function savePriceRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceDraft) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: priceDraft.name,
        dayOfWeek:
          priceDraft.dayOfWeek === '' ? null : Number(priceDraft.dayOfWeek),
        startTime: priceDraft.startTime,
        endTime: priceDraft.endTime,
        pricePerHour: Number(priceDraft.pricePerHour),
      };
      if (priceDraft.ruleId) {
        await api.patch(`/pricing/${priceDraft.ruleId}`, payload);
      } else {
        await api.post(`/courts/${priceDraft.courtId}/pricing`, payload);
      }
      setPriceDraft(null);
      setNotice(
        priceDraft.ruleId ? 'Đã cập nhật khung giá.' : 'Đã thêm khung giá.',
      );
      await refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(path: string, label: string) {
    if (!window.confirm(`Bạn có chắc muốn ngừng hoạt động ${label}?`)) return;
    try {
      await api.delete(path);
      setNotice(`Đã ngừng hoạt động ${label}.`);
      await refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  return (
    <section className="management-page">
      <div className="management-heading">
        <div>
          <p className="eyebrow">KHU VỰC CHỦ SÂN</p>
          <h1>Quản lý cụm sân</h1>
          <p>
            Thiết lập thông tin địa điểm, sân con, giờ mở cửa, giá thuê và lịch
            bảo trì.
          </p>
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

      <form
        className="management-card venue-form"
        onSubmit={(event) => void saveVenue(event)}
      >
        <h2>{editingVenueId ? 'Chỉnh sửa cụm sân' : 'Tạo cụm sân mới'}</h2>
        <div className="form-grid">
          <label>
            Tên cụm sân
            <input
              required
              maxLength={120}
              value={venueDraft.name}
              onChange={(event) =>
                setVenueDraft({ ...venueDraft, name: event.target.value })
              }
            />
          </label>
          <label>
            Địa chỉ
            <input
              required
              maxLength={300}
              value={venueDraft.address}
              onChange={(event) =>
                setVenueDraft({ ...venueDraft, address: event.target.value })
              }
            />
          </label>
          <label>
            Môn thể thao, cách nhau bằng dấu phẩy
            <input
              placeholder="Bóng đá, Cầu lông"
              value={venueDraft.sportTypes}
              onChange={(event) =>
                setVenueDraft({ ...venueDraft, sportTypes: event.target.value })
              }
            />
          </label>
          <label>
            Liên kết ảnh (mỗi dòng một URL)
            <textarea
              rows={2}
              value={venueDraft.imageUrls}
              onChange={(event) =>
                setVenueDraft({ ...venueDraft, imageUrls: event.target.value })
              }
            />
          </label>
          <label className="form-wide">
            Mô tả
            <textarea
              rows={2}
              maxLength={2000}
              value={venueDraft.description}
              onChange={(event) =>
                setVenueDraft({
                  ...venueDraft,
                  description: event.target.value,
                })
              }
            />
          </label>
        </div>
        <fieldset className="hours-fieldset">
          <legend>Giờ mở cửa theo ngày</legend>
          <div className="hours-list">
            {venueDraft.openingHours.map((hour, index) => (
              <div className="hours-row" key={hour.dayOfWeek}>
                <strong>{weekDays[hour.dayOfWeek]}</strong>
                <label className="closed-toggle">
                  <input
                    type="checkbox"
                    checked={hour.isClosed}
                    onChange={(event) =>
                      setVenueDraft({
                        ...venueDraft,
                        openingHours: venueDraft.openingHours.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, isClosed: event.target.checked }
                              : item,
                        ),
                      })
                    }
                  />{' '}
                  Nghỉ
                </label>
                <input
                  aria-label={`${weekDays[hour.dayOfWeek]} mở cửa`}
                  type="time"
                  disabled={hour.isClosed}
                  value={hour.openTime}
                  onChange={(event) =>
                    setVenueDraft({
                      ...venueDraft,
                      openingHours: venueDraft.openingHours.map(
                        (item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, openTime: event.target.value }
                            : item,
                      ),
                    })
                  }
                />
                <span>đến</span>
                <input
                  aria-label={`${weekDays[hour.dayOfWeek]} đóng cửa`}
                  type="time"
                  disabled={hour.isClosed}
                  value={hour.closeTime}
                  onChange={(event) =>
                    setVenueDraft({
                      ...venueDraft,
                      openingHours: venueDraft.openingHours.map(
                        (item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, closeTime: event.target.value }
                            : item,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </fieldset>
        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving
              ? 'Đang lưu…'
              : editingVenueId
                ? 'Lưu thay đổi'
                : 'Tạo cụm sân'}
          </button>
          {editingVenueId && (
            <button
              className="button button-secondary"
              type="button"
              onClick={cancelEdit}
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="venue-list-heading">
        <h2>Cụm sân của bạn</h2>
        {loading && <span>Đang tải…</span>}
      </div>
      {!loading && venues.length === 0 && !error && (
        <p className="empty-state">
          Chưa có cụm sân. Hãy tạo cụm sân đầu tiên ở trên.
        </p>
      )}

      <div className="managed-venues">
        {venues.map((venue) => (
          <article
            className={`management-card venue-card${venue.isActive ? '' : ' is-inactive'}`}
            key={venue.id}
          >
            <div className="venue-card-heading">
              <div>
                <span
                  className={`status-pill${venue.isActive ? ' status-active' : ''}`}
                >
                  {venue.isActive ? 'Đang hoạt động' : 'Đã ngừng'}
                </span>
                <h2>{venue.name}</h2>
                <p>{venue.address}</p>
              </div>
              <div className="form-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => beginEdit(venue)}
                >
                  Chỉnh sửa
                </button>
                {venue.isActive && (
                  <button
                    className="button button-danger"
                    type="button"
                    onClick={() =>
                      void deactivate(
                        `/venues/${venue.id}`,
                        `cụm sân ${venue.name}`,
                      )
                    }
                  >
                    Ngừng hoạt động
                  </button>
                )}
              </div>
            </div>
            <p className="tag-list">
              {venue.sportTypes.map((sport) => (
                <span className="sport-tag" key={sport}>
                  {sport}
                </span>
              ))}
            </p>
            {venue.imageUrls[0] && (
              <img
                className="venue-image"
                src={venue.imageUrls[0]}
                alt={`Ảnh ${venue.name}`}
              />
            )}
            <div className="hours-summary">
              {venue.openingHours.map((hour) => (
                <span key={hour.dayOfWeek}>
                  {weekDays[hour.dayOfWeek]}:{' '}
                  {hour.isClosed
                    ? 'Nghỉ'
                    : `${hour.openTime}–${hour.closeTime}`}
                </span>
              ))}
            </div>
            <div className="courts-heading">
              <h3>Sân con ({venue.courts.length})</h3>
            </div>
            {venue.courts.map((court) => (
              <div className="court-row" key={court.id}>
                <div className="court-information">
                  <strong>{court.name}</strong>
                  <span>{court.sportType}</span>
                  {!court.isActive && (
                    <span className="status-pill">Đã ngừng</span>
                  )}
                  <div className="price-list">
                    {court.priceRules.map((rule) => (
                      <span key={rule.id}>
                        {rule.name} ·{' '}
                        {rule.dayOfWeek === null
                          ? 'Mọi ngày'
                          : weekDays[rule.dayOfWeek]}{' '}
                        · {rule.startTime}–{rule.endTime} ·{' '}
                        {Number(rule.pricePerHour).toLocaleString('vi-VN')}{' '}
                        đ/giờ
                        <button
                          className="text-button"
                          type="button"
                          aria-label={`Sửa ${rule.name}`}
                          onClick={() =>
                            setPriceDraft({
                              courtId: court.id,
                              ruleId: rule.id,
                              name: rule.name,
                              dayOfWeek:
                                rule.dayOfWeek === null
                                  ? ''
                                  : String(rule.dayOfWeek),
                              startTime: rule.startTime,
                              endTime: rule.endTime,
                              pricePerHour: String(Number(rule.pricePerHour)),
                            })
                          }
                        >
                          Sửa
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          aria-label={`Xóa ${rule.name}`}
                          onClick={() =>
                            void deactivate(
                              `/pricing/${rule.id}`,
                              `khung giá ${rule.name}`,
                            )
                          }
                        >
                          Xóa
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() =>
                      setCourtDraft({
                        venueId: venue.id,
                        courtId: court.id,
                        name: court.name,
                        sportType: court.sportType,
                        imageUrls: court.imageUrls.join('\n'),
                      })
                    }
                  >
                    Sửa sân
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() =>
                      setPriceDraft({
                        courtId: court.id,
                        name: '',
                        dayOfWeek: '',
                        startTime: '06:00',
                        endTime: '22:00',
                        pricePerHour: '',
                      })
                    }
                  >
                    Thêm giá
                  </button>
                  <MaintenanceManager
                    courtId={court.id}
                    onError={setError}
                    onNotice={setNotice}
                  />
                  {court.isActive && (
                    <button
                      className="button button-danger"
                      type="button"
                      onClick={() =>
                        void deactivate(
                          `/courts/${court.id}`,
                          `sân ${court.name}`,
                        )
                      }
                    >
                      Xóa sân
                    </button>
                  )}
                </div>
              </div>
            ))}
            {venue.isActive && (
              <button
                className="button button-secondary add-court-button"
                type="button"
                onClick={() =>
                  setCourtDraft({
                    venueId: venue.id,
                    courtId: '',
                    name: '',
                    sportType: '',
                    imageUrls: '',
                  })
                }
              >
                + Thêm sân con
              </button>
            )}
          </article>
        ))}
      </div>

      {courtDraft && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCourtDraft(null);
          }}
        >
          <form
            className="management-card modal-card"
            onSubmit={(event) => void saveCourt(event)}
          >
            <h2>{courtDraft.courtId ? 'Chỉnh sửa sân' : 'Thêm sân con'}</h2>
            <label>
              Tên sân
              <input
                required
                maxLength={120}
                value={courtDraft.name}
                onChange={(event) =>
                  setCourtDraft({ ...courtDraft, name: event.target.value })
                }
              />
            </label>
            <label>
              Môn thể thao
              <input
                required
                maxLength={60}
                value={courtDraft.sportType}
                onChange={(event) =>
                  setCourtDraft({
                    ...courtDraft,
                    sportType: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Liên kết ảnh (mỗi dòng một URL)
              <textarea
                rows={3}
                value={courtDraft.imageUrls}
                onChange={(event) =>
                  setCourtDraft({
                    ...courtDraft,
                    imageUrls: event.target.value,
                  })
                }
              />
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving}>
                Lưu sân
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setCourtDraft(null)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {priceDraft && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPriceDraft(null);
          }}
        >
          <form
            className="management-card modal-card"
            onSubmit={(event) => void savePriceRule(event)}
          >
            <h2>
              {priceDraft.ruleId ? 'Chỉnh sửa khung giá' : 'Thêm khung giá'}
            </h2>
            <label>
              Tên khung giá
              <input
                required
                maxLength={80}
                placeholder="Giờ vàng, cuối tuần…"
                value={priceDraft.name}
                onChange={(event) =>
                  setPriceDraft({ ...priceDraft, name: event.target.value })
                }
              />
            </label>
            <label>
              Áp dụng ngày
              <select
                value={priceDraft.dayOfWeek}
                onChange={(event) =>
                  setPriceDraft({
                    ...priceDraft,
                    dayOfWeek: event.target.value,
                  })
                }
              >
                <option value="">Mọi ngày</option>
                {weekDays.map((day, index) => (
                  <option value={index} key={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Từ giờ
                <input
                  type="time"
                  required
                  value={priceDraft.startTime}
                  onChange={(event) =>
                    setPriceDraft({
                      ...priceDraft,
                      startTime: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Đến giờ
                <input
                  type="time"
                  required
                  value={priceDraft.endTime}
                  onChange={(event) =>
                    setPriceDraft({
                      ...priceDraft,
                      endTime: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Giá/giờ (VNĐ)
                <input
                  type="number"
                  min="1"
                  step="1000"
                  required
                  value={priceDraft.pricePerHour}
                  onChange={(event) =>
                    setPriceDraft({
                      ...priceDraft,
                      pricePerHour: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            <p className="field-hint">
              Các khung giá cùng ngày không được chồng lấn. Có thể đặt một khung
              chung và khung riêng theo ngày.
            </p>
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving}>
                {priceDraft.ruleId ? 'Lưu khung giá' : 'Thêm khung giá'}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setPriceDraft(null)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function MaintenanceManager({
  courtId,
  onError,
  onNotice,
}: {
  courtId: string;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [periods, setPeriods] = useState<Maintenance[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await api.get<Maintenance[]>(
        `/courts/${courtId}/maintenance`,
      );
      setPeriods(response.data);
    } catch (requestError) {
      onError(errorMessage(requestError));
    }
  }, [courtId, onError]);

  useEffect(() => {
    if (expanded) void load();
  }, [expanded, load]);

  async function addMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.post(`/courts/${courtId}/maintenance`, {
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        reason,
      });
      setStartAt('');
      setEndAt('');
      setReason('');
      onNotice('Đã khóa lịch sân trong thời gian bảo trì.');
      await load();
    } catch (requestError) {
      onError(errorMessage(requestError));
    }
  }

  async function removePeriod(id: string) {
    try {
      await api.delete(`/maintenance/${id}`);
      onNotice('Đã gỡ lịch bảo trì.');
      await load();
    } catch (requestError) {
      onError(errorMessage(requestError));
    }
  }

  return (
    <div className="maintenance-control">
      <button
        className="button button-secondary"
        type="button"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Đóng bảo trì' : 'Lịch bảo trì'}
      </button>
      {expanded && (
        <div className="maintenance-popover">
          <form onSubmit={(event) => void addMaintenance(event)}>
            <label>
              Bắt đầu
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </label>
            <label>
              Kết thúc
              <input
                type="datetime-local"
                required
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
              />
            </label>
            <label>
              Lý do
              <input
                required
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button className="button" type="submit">
              Khóa lịch
            </button>
          </form>
          {periods.map((period) => (
            <div className="maintenance-period" key={period.id}>
              <span>
                {new Date(period.startAt).toLocaleString('vi-VN')} –{' '}
                {new Date(period.endAt).toLocaleString('vi-VN')} ·{' '}
                {period.reason}
              </span>
              <button
                className="text-button"
                type="button"
                onClick={() => void removePeriod(period.id)}
              >
                Gỡ
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
