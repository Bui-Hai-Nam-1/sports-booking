import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useMutation } from '../hooks/useMutation';
import type {
  Court,
  MaintenanceBlock,
  OpeningHour,
  PricingRule,
  PricingType,
  Venue,
} from '../types/venue';
import { TabsList, TabsPanel, TabsRoot, TabsTrigger } from '../components/Tabs';

const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Panel: TabsPanel,
  Trigger: TabsTrigger,
};

const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const emptyHours = (): OpeningHour[] =>
  weekdays.map((_, weekday) => ({
    weekday,
    opensAt: '06:00',
    closesAt: '22:00',
    isClosed: false,
  }));
const errorMessage = (reason: unknown): string => {
  if (typeof reason === 'object' && reason !== null && 'response' in reason) {
    const response = (reason as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return reason instanceof Error ? reason.message : 'Đã xảy ra lỗi.';
};

export function VenueManagementPage() {
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [hours, setHours] = useState<OpeningHour[]>(emptyHours);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const loadVenues = useCallback(async () => {
    const { data } = await api.get<Venue[]>('/venues/mine');
    return data;
  }, []);
  const venuesResource = useAsyncResource(loadVenues);
  const venues = useMemo(() => venuesResource.data ?? [], [venuesResource.data]);
  const selectedVenue = useMemo(
    () => venues.find(({ id }) => id === selectedVenueId) ?? null,
    [selectedVenueId, venues],
  );

  useEffect(() => {
    if (!selectedVenueId && venues.length) setSelectedVenueId(venues[0].id);
  }, [selectedVenueId, venues]);

  const loadOpeningHours = useCallback(async () => {
    if (!selectedVenueId) return [];
    const { data } = await api.get<OpeningHour[]>(`/venues/${selectedVenueId}/opening-hours`);
    return data;
  }, [selectedVenueId]);
  const hoursResource = useAsyncResource(loadOpeningHours, selectedVenueId);
  useEffect(() => {
    setHours(hoursResource.data?.length ? hoursResource.data : emptyHours());
  }, [hoursResource.data]);

  const loadPricing = useCallback(async () => {
    if (!selectedCourtId) return [];
    const { data } = await api.get<PricingRule[]>(`/courts/${selectedCourtId}/pricing`);
    return data;
  }, [selectedCourtId]);
  const pricingResource = useAsyncResource(loadPricing, selectedCourtId);

  const loadMaintenance = useCallback(async () => {
    if (!selectedCourtId) return [];
    const { data } = await api.get<MaintenanceBlock[]>(`/courts/${selectedCourtId}/maintenance`);
    return data;
  }, [selectedCourtId]);
  const maintenanceResource = useAsyncResource(loadMaintenance, selectedCourtId);

  const createVenue = useMutation(async (form: HTMLFormElement) => {
    const values = new FormData(form);
    await api.post('/venues', {
      name: values.get('name'),
      address: values.get('address'),
      description: values.get('description') || undefined,
      imageUrls: String(values.get('imageUrls') ?? '').split(/\n|,/).map((value) => value.trim()).filter(Boolean),
      sportTypes: String(values.get('sportTypes') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
    });
  });

  const runAction = async (action: () => Promise<unknown>) => {
    setNotice('');
    setFormError('');
    try {
      await action();
      setNotice('Đã lưu thay đổi.');
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  const onCreateVenue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runAction(async () => {
      await createVenue.execute(form);
      form.reset();
      await venuesResource.reload();
    });
  };

  return (
    <section className="management-page">
      <p className="eyebrow">ĐĂNG KÝ VÀ QUẢN LÝ SÂN</p>
      <h1>Quản lý cụm sân</h1>
      <p className="page-intro">Tạo địa điểm, quản lý sân con, giờ hoạt động, giá thuê và lịch bảo trì.</p>

      {notice && <p className="notice" role="status">{notice}</p>}
      {formError && <p className="error-message" role="alert">{formError}</p>}
      {venuesResource.error && (
        <p className="error-message" role="alert">
          Không thể tải cụm sân: {venuesResource.error}. Hãy đăng nhập bằng tài khoản Chủ sân.
        </p>
      )}

      <div className="management-grid">
        <aside className="panel venue-sidebar">
          <div className="panel-heading">
            <h2>Cụm sân của tôi</h2>
            <button type="button" className="button button-muted" onClick={() => void venuesResource.reload()}>
              Làm mới
            </button>
          </div>
          {venuesResource.loading && <p>Đang tải...</p>}
          {!venuesResource.loading && venues.length === 0 && <p>Chưa có cụm sân.</p>}
          <div className="venue-list">
            {venues.map((venue) => (
              <button
                type="button"
                key={venue.id}
                className={`venue-choice ${selectedVenueId === venue.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedVenueId(venue.id);
                  setSelectedCourtId(venue.courts?.[0]?.id ?? '');
                }}
              >
                <strong>{venue.name}</strong>
                <span>{venue.address}</span>
                <small className={`status status-${venue.status.toLowerCase()}`}>{venue.status}</small>
              </button>
            ))}
          </div>
          <h3>Đăng ký cụm sân</h3>
          <form className="form-stack" onSubmit={(event) => void onCreateVenue(event)}>
            <label>Tên cụm sân<input name="name" required minLength={2} maxLength={120} /></label>
            <label>Địa chỉ<input name="address" required minLength={5} maxLength={255} /></label>
            <label>Môn thể thao, cách nhau bằng dấu phẩy<input name="sportTypes" placeholder="Bóng đá, Cầu lông" required /></label>
            <label>URL hình ảnh, mỗi dòng hoặc dấu phẩy một URL<textarea name="imageUrls" rows={2} /></label>
            <label>Mô tả<textarea name="description" rows={3} /></label>
            <button className="button button-primary" type="submit" disabled={createVenue.pending}>
              {createVenue.pending ? 'Đang gửi...' : 'Gửi đăng ký duyệt'}
            </button>
          </form>
        </aside>

        <div className="management-content">
          {!selectedVenue ? (
            <div className="panel empty-state">Chọn cụm sân hoặc tạo cụm sân mới để bắt đầu.</div>
          ) : selectedVenue.status !== 'APPROVED' ? (
            <div className="panel empty-state">
              <span className={`status status-${selectedVenue.status.toLowerCase()}`}>{selectedVenue.status}</span>
              <p>Cụm sân đang chờ Admin duyệt. Bạn có thể quản lý sân và lịch sau khi được duyệt.</p>
            </div>
          ) : (
            <VenueEditor
              venue={selectedVenue}
              hours={hours}
              setHours={setHours}
              hoursLoading={hoursResource.loading}
              selectedCourtId={selectedCourtId}
              setSelectedCourtId={setSelectedCourtId}
              pricing={pricingResource.data ?? []}
              pricingLoading={pricingResource.loading}
              maintenance={maintenanceResource.data ?? []}
              maintenanceLoading={maintenanceResource.loading}
              refreshAll={async () => {
                await Promise.all([venuesResource.reload(), hoursResource.reload(), pricingResource.reload(), maintenanceResource.reload()]);
              }}
              runAction={runAction}
            />
          )}
        </div>
      </div>

      <AdminApprovals runAction={runAction} refreshVenues={venuesResource.reload} />
    </section>
  );
}

interface VenueEditorProps {
  venue: Venue;
  hours: OpeningHour[];
  setHours: (hours: OpeningHour[]) => void;
  hoursLoading: boolean;
  selectedCourtId: string;
  setSelectedCourtId: (id: string) => void;
  pricing: PricingRule[];
  pricingLoading: boolean;
  maintenance: MaintenanceBlock[];
  maintenanceLoading: boolean;
  refreshAll: () => Promise<void>;
  runAction: (action: () => Promise<unknown>) => Promise<void>;
}

function VenueEditor(props: VenueEditorProps) {
  const {
    venue, hours, setHours, hoursLoading, selectedCourtId, setSelectedCourtId,
    pricing, pricingLoading, maintenance, maintenanceLoading, refreshAll, runAction,
  } = props;
  const courts = venue.courts ?? [];
  const selectedCourt = courts.find(({ id }) => id === selectedCourtId);

  const updateVenue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void runAction(async () => {
      await api.patch(`/venues/${venue.id}`, {
        name: form.get('name'),
        address: form.get('address'),
        description: form.get('description') || undefined,
        sportTypes: String(form.get('sportTypes') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
        imageUrls: String(form.get('imageUrls') ?? '').split(/\n|,/).map((value) => value.trim()).filter(Boolean),
      });
      await refreshAll();
    });
  };

  const createCourt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    void runAction(async () => {
      await api.post(`/venues/${venue.id}/courts`, {
        name: values.get('courtName'),
        sportType: values.get('courtSport'),
      });
      formElement.reset();
      await refreshAll();
    });
  };

  return (
    <Tabs.Root defaultValue="courts">
      <Tabs.List>
        <Tabs.Trigger value="courts">Sân con</Tabs.Trigger>
        <Tabs.Trigger value="venue">Thông tin cụm sân</Tabs.Trigger>
        <Tabs.Trigger value="hours">Giờ mở cửa</Tabs.Trigger>
        <Tabs.Trigger value="pricing">Bảng giá</Tabs.Trigger>
        <Tabs.Trigger value="maintenance">Bảo trì</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Panel value="venue">
        <div className="panel">
          <div className="panel-heading"><h2>Thông tin cụm sân</h2><span className={`status status-${venue.status.toLowerCase()}`}>{venue.status}</span></div>
          <form className="form-stack" onSubmit={updateVenue}>
            <label>Tên cụm sân<input name="name" defaultValue={venue.name} required /></label>
            <label>Địa chỉ<input name="address" defaultValue={venue.address} required /></label>
            <label>Môn thể thao, cách nhau bằng dấu phẩy<input name="sportTypes" defaultValue={venue.sportTypes.join(', ')} /></label>
            <label>URL hình ảnh, mỗi dòng hoặc dấu phẩy một URL<textarea name="imageUrls" defaultValue={venue.imageUrls.join('\n')} rows={3} /></label>
            <label>Mô tả<textarea name="description" defaultValue={venue.description ?? ''} rows={3} /></label>
            <button className="button button-primary">Lưu thông tin</button>
          </form>
          <button
            type="button"
            className="button button-danger"
            onClick={() => void runAction(async () => {
              await api.delete(`/venues/${venue.id}`);
              await refreshAll();
            })}
          >
            Ngừng hoạt động cụm sân
          </button>
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="courts">
        <div className="panel">
          <h2>Sân con</h2>
          <div className="court-list">
            {courts.map((court: Court) => (
              <div className="court-row" key={court.id}>
                <button type="button" className="court-select" onClick={() => setSelectedCourtId(court.id)}>
                  <strong>{court.name}</strong><span>{court.sportType}</span>
                  <small>{court.isActive ? 'Đang hoạt động' : 'Đã khóa'}</small>
                </button>
                <button
                  type="button"
                  className="button button-muted"
                  onClick={() => void runAction(async () => {
                    await api.patch(`/courts/${court.id}`, { isActive: !court.isActive });
                    await refreshAll();
                  })}
                >
                  {court.isActive ? 'Khóa sân' : 'Mở sân'}
                </button>
                <button type="button" className="button button-danger" onClick={() => void runAction(async () => {
                  await api.delete(`/courts/${court.id}`);
                  await refreshAll();
                })}>Xóa</button>
              </div>
            ))}
            {!courts.length && <p>Chưa có sân con.</p>}
          </div>
          <form className="inline-form" onSubmit={createCourt}>
            <label>Tên sân<input name="courtName" required minLength={2} /></label>
            <label>Môn thể thao<input name="courtSport" required minLength={2} /></label>
            <button className="button button-primary">Thêm sân</button>
          </form>
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="hours">
        <div className="panel">
          <h2>Giờ hoạt động theo thứ</h2>
          {hoursLoading ? <p>Đang tải giờ hoạt động...</p> : (
            <form onSubmit={(event) => {
              event.preventDefault();
              void runAction(async () => {
                await api.put(`/venues/${venue.id}/opening-hours`, { hours });
                await refreshAll();
              });
            }}>
              <div className="hours-grid">
                {hours.map((hour) => (
                  <div className="hour-row" key={hour.weekday}>
                    <strong>{weekdays[hour.weekday]}</strong>
                    <input aria-label={`${weekdays[hour.weekday]} mở cửa`} type="time" value={hour.opensAt} disabled={hour.isClosed} onChange={(event) => setHours(hours.map((item) => item.weekday === hour.weekday ? { ...item, opensAt: event.target.value } : item))} />
                    <input aria-label={`${weekdays[hour.weekday]} đóng cửa`} type="time" value={hour.closesAt} disabled={hour.isClosed} onChange={(event) => setHours(hours.map((item) => item.weekday === hour.weekday ? { ...item, closesAt: event.target.value } : item))} />
                    <label className="checkbox-label"><input type="checkbox" checked={hour.isClosed} onChange={(event) => setHours(hours.map((item) => item.weekday === hour.weekday ? { ...item, isClosed: event.target.checked } : item))} /> Nghỉ</label>
                  </div>
                ))}
              </div>
              <button className="button button-primary" disabled={hoursLoading}>Lưu giờ hoạt động</button>
            </form>
          )}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="pricing">
        <div className="panel">
          <h2>Bảng giá theo sân</h2>
          <CourtPicker courts={courts} selectedCourtId={selectedCourtId} setSelectedCourtId={setSelectedCourtId} />
          {!selectedCourt && <p>Chọn sân con để cấu hình giá.</p>}
          {selectedCourt && <>
            <div className="rule-list">
              {pricingLoading && <p>Đang tải giá...</p>}
              {pricing.map((rule) => (
                <div className="rule-row" key={rule.id}>
                  <span><strong>{priceTypeLabel[rule.type]}</strong> · {rule.weekday === null ? 'Tất cả ngày' : weekdays[rule.weekday]} · {rule.startsAt}–{rule.endsAt}</span>
                  <strong>{Number(rule.pricePerHour).toLocaleString('vi-VN')} đ/giờ</strong>
                  <button type="button" className="button button-danger" onClick={() => void runAction(async () => {
                    await api.delete(`/courts/${selectedCourt.id}/pricing/${rule.id}`);
                    await refreshAll();
                  })}>Xóa</button>
                </div>
              ))}
            </div>
            <form className="inline-form" onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const form = new FormData(formElement);
              void runAction(async () => {
                await api.post(`/courts/${selectedCourt.id}/pricing`, {
                  type: form.get('type'),
                  pricePerHour: Number(form.get('pricePerHour')),
                  weekday: form.get('weekday') === '' ? undefined : Number(form.get('weekday')),
                  startsAt: form.get('startsAt'),
                  endsAt: form.get('endsAt'),
                });
                formElement.reset();
                await refreshAll();
              });
            }}>
              <label>Loại giá<select name="type"><option value="STANDARD">Giá thường</option><option value="WEEKEND">Cuối tuần</option><option value="PEAK">Giờ vàng</option></select></label>
              <label>Áp dụng thứ<select name="weekday"><option value="">Mọi ngày</option>{weekdays.map((day, value) => <option value={value} key={day}>{day}</option>)}</select></label>
              <label>Giá/giờ (VNĐ)<input name="pricePerHour" type="number" min="0" step="1000" required /></label>
              <label>Từ<input name="startsAt" type="time" defaultValue="06:00" required /></label>
              <label>Đến<input name="endsAt" type="time" defaultValue="22:00" required /></label>
              <button className="button button-primary">Thêm mức giá</button>
            </form>
          </>}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="maintenance">
        <div className="panel">
          <h2>Khóa lịch bảo trì</h2>
          <CourtPicker courts={courts} selectedCourtId={selectedCourtId} setSelectedCourtId={setSelectedCourtId} />
          {!selectedCourt && <p>Chọn sân con để quản lý lịch bảo trì.</p>}
          {selectedCourt && <>
            {maintenanceLoading && <p>Đang tải lịch...</p>}
            <div className="rule-list">
              {maintenance.map((block) => (
                <div className="rule-row" key={block.id}>
                  <span><strong>{block.reason}</strong><br />{new Date(block.startAt).toLocaleString('vi-VN')} – {new Date(block.endAt).toLocaleString('vi-VN')}</span>
                  <button type="button" className="button button-danger" onClick={() => void runAction(async () => {
                    await api.delete(`/courts/${selectedCourt.id}/maintenance/${block.id}`);
                    await refreshAll();
                  })}>Xóa khóa lịch</button>
                </div>
              ))}
            </div>
            <form className="inline-form" onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const form = new FormData(formElement);
              void runAction(async () => {
                await api.post(`/courts/${selectedCourt.id}/maintenance`, {
                  startAt: new Date(String(form.get('startAt'))).toISOString(),
                  endAt: new Date(String(form.get('endAt'))).toISOString(),
                  reason: form.get('reason'),
                });
                formElement.reset();
                await refreshAll();
              });
            }}>
              <label>Bắt đầu<input name="startAt" type="datetime-local" required /></label>
              <label>Kết thúc<input name="endAt" type="datetime-local" required /></label>
              <label>Lý do<input name="reason" required minLength={3} /></label>
              <button className="button button-primary">Khóa lịch</button>
            </form>
          </>}
        </div>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

const priceTypeLabel: Record<PricingType, string> = {
  STANDARD: 'Giá thường',
  WEEKEND: 'Cuối tuần',
  PEAK: 'Giờ vàng',
};

function CourtPicker({
  courts,
  selectedCourtId,
  setSelectedCourtId,
}: {
  courts: Court[];
  selectedCourtId: string;
  setSelectedCourtId: (id: string) => void;
}) {
  return (
    <label className="court-picker">Sân con
      <select value={selectedCourtId} onChange={(event) => setSelectedCourtId(event.target.value)}>
        <option value="">Chọn sân</option>
        {courts.map((court) => <option key={court.id} value={court.id}>{court.name} · {court.sportType}</option>)}
      </select>
    </label>
  );
}

function AdminApprovals({
  runAction,
  refreshVenues,
}: {
  runAction: (action: () => Promise<unknown>) => Promise<void>;
  refreshVenues: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Venue[]>([]);
  const [error, setError] = useState('');

  const loadPending = async () => {
    setError('');
    try {
      const { data } = await api.get<Venue[]>('/venues/pending');
      setPending(data);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  return (
    <section className="admin-approvals">
      <button className="button button-muted" type="button" onClick={() => {
        setOpen(!open);
        if (!open) void loadPending();
      }}>
        {open ? 'Ẩn' : 'Duyệt cụm sân mới (Admin)'}
      </button>
      {open && <div className="panel">
        <h2>Yêu cầu chờ duyệt</h2>
        {error && <p className="error-message">Không tải được yêu cầu: {error}</p>}
        {!error && pending.length === 0 && <p>Không có yêu cầu đang chờ.</p>}
        {pending.map((venue) => (
          <div className="approval-row" key={venue.id}>
            <div><strong>{venue.name}</strong><span>{venue.address}</span></div>
            <button type="button" className="button button-primary" onClick={() => void runAction(async () => {
              await api.patch(`/venues/${venue.id}/approval`, { status: 'APPROVED' });
              await loadPending();
              await refreshVenues();
            })}>Duyệt</button>
            <button type="button" className="button button-danger" onClick={() => void runAction(async () => {
              await api.patch(`/venues/${venue.id}/approval`, { status: 'REJECTED' });
              await loadPending();
              await refreshVenues();
            })}>Từ chối</button>
          </div>
        ))}
      </div>}
    </section>
  );
}
