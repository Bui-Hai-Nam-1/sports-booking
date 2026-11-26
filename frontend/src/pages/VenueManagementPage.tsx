import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { api } from "../lib/api";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { useMutation } from "../hooks/useMutation";
import {
  VenueRegistrationModal,
  type VenueRegistrationDraft,
} from "../components/VenueRegistrationModal";
import type {
  Court,
  MaintenanceBlock,
  OpeningHour,
  PricingRule,
  PricingType,
  Venue,
} from "../types/venue";
import { TabsList, TabsPanel, TabsRoot, TabsTrigger } from "../components/Tabs";

const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Panel: TabsPanel,
  Trigger: TabsTrigger,
};

const weekdays = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];
const emptyHours = (): OpeningHour[] =>
  weekdays.map((_, weekday) => ({
    weekday,
    opensAt: "06:00",
    closesAt: "22:00",
    isClosed: false,
  }));
const errorMessage = (reason: unknown): string => {
  if (typeof reason === "object" && reason !== null && "response" in reason) {
    const response = (
      reason as { response?: { data?: { message?: string | string[] } } }
    ).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
  }
  return reason instanceof Error ? reason.message : "Đã xảy ra lỗi.";
};

export function VenueManagementPage() {
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [hours, setHours] = useState<OpeningHour[]>(emptyHours);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

  const loadVenues = useCallback(async () => {
    const { data } = await api.get<Venue[]>("/venues/mine");
    return data;
  }, []);
  const venuesResource = useAsyncResource(loadVenues);
  const venues = useMemo(
    () => venuesResource.data ?? [],
    [venuesResource.data],
  );
  const selectedVenue = useMemo(
    () => venues.find(({ id }) => id === selectedVenueId) ?? null,
    [selectedVenueId, venues],
  );

  useEffect(() => {
    if (!selectedVenueId && venues.length) setSelectedVenueId(venues[0].id);
  }, [selectedVenueId, venues]);

  const loadOpeningHours = useCallback(async () => {
    if (!selectedVenueId) return [];
    const { data } = await api.get<OpeningHour[]>(
      `/venues/${selectedVenueId}/opening-hours`,
    );
    return data;
  }, [selectedVenueId]);
  const hoursResource = useAsyncResource(loadOpeningHours, selectedVenueId);
  useEffect(() => {
    setHours(hoursResource.data?.length ? hoursResource.data : emptyHours());
  }, [hoursResource.data]);

  const loadPricing = useCallback(async () => {
    if (!selectedCourtId) return [];
    const { data } = await api.get<PricingRule[]>(
      `/courts/${selectedCourtId}/pricing`,
    );
    return data;
  }, [selectedCourtId]);
  const pricingResource = useAsyncResource(loadPricing, selectedCourtId);

  const loadMaintenance = useCallback(async () => {
    if (!selectedCourtId) return [];
    const { data } = await api.get<MaintenanceBlock[]>(
      `/courts/${selectedCourtId}/maintenance`,
    );
    return data;
  }, [selectedCourtId]);
  const maintenanceResource = useAsyncResource(
    loadMaintenance,
    selectedCourtId,
  );

  const createVenue = useMutation(
    async (draft: VenueRegistrationDraft): Promise<Venue> => {
      const uploadFiles = async (files: File[]): Promise<string[]> =>
        Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            const { data } = await api.post<{ url: string }>(
              "/venues/media",
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
            return new URL(
              data.url,
              api.defaults.baseURL ?? window.location.origin,
            ).toString();
          }),
        );

      const [imageUrls, videoUrls] = await Promise.all([
        uploadFiles(draft.imageFiles),
        uploadFiles(draft.videoFiles),
      ]);
      const { data } = await api.post<Venue>("/venues", {
        name: draft.name,
        address: draft.address,
        description: draft.description,
        imageUrls,
        videoUrls,
        sportTypes: draft.sportTypes,
        initialCourtPricePerHour: draft.initialCourtPricePerHour,
        initialPriceStartsAt: draft.initialPriceStartsAt,
        initialPriceEndsAt: draft.initialPriceEndsAt,
      });
      return data;
    },
  );

  const runAction = async (action: () => Promise<unknown>) => {
    setNotice("");
    setFormError("");
    try {
      await action();
      setNotice("Đã lưu thay đổi.");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  const onCreateVenue = async (draft: VenueRegistrationDraft) => {
    setNotice("");
    setRegistrationError("");
    try {
      const venue = await createVenue.execute(draft);
      setSelectedVenueId(venue.id);
      setSelectedCourtId("");
      await venuesResource.reload();
      setIsRegistrationOpen(false);
      setNotice(
        "Đã gửi yêu cầu đăng ký. Cụm sân sẽ hiển thị sau khi được duyệt.",
      );
    } catch (reason) {
      setRegistrationError(errorMessage(reason));
    }
  };

  return (
    <section className="management-page">
      <header className="management-hero">
        <div className="management-hero-copy">
          <p className="eyebrow">KHÔNG GIAN CHỦ SÂN</p>
          <h1>Quản lý sân thể thao</h1>
          <p className="page-intro">
            Theo dõi địa điểm, cập nhật thông tin sân và quản lý hoạt động tại
            một nơi.
          </p>
        </div>
        <button
          type="button"
          className="button button-primary add-venue-button"
          onClick={() => {
            setRegistrationError("");
            setIsRegistrationOpen(true);
          }}
        >
          <span aria-hidden="true">＋</span> Thêm mới sân
        </button>
      </header>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {formError && (
        <p className="error-message" role="alert">
          {formError}
        </p>
      )}
      {venuesResource.error && (
        <p className="error-message" role="alert">
          Không thể tải cụm sân: {venuesResource.error}. Hãy đăng nhập bằng tài
          khoản Chủ sân.
        </p>
      )}

      <div className="management-grid">
        <aside className="panel venue-sidebar">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">DANH SÁCH ĐỊA ĐIỂM</span>
              <h2>Cụm sân của tôi</h2>
            </div>
            <button
              type="button"
              className="button button-muted"
              onClick={() => void venuesResource.reload()}
            >
              Làm mới
            </button>
          </div>
          {!venuesResource.loading && venues.length > 0 && (
            <div className="venue-summary-count">
              {venues.length} địa điểm đã đăng ký
            </div>
          )}
          {venuesResource.loading && <p>Đang tải...</p>}
          {!venuesResource.loading && venues.length === 0 && (
            <div className="venue-empty-card">
              <span className="venue-empty-icon" aria-hidden="true">
                ⌂
              </span>
              <strong>Chưa có cụm sân</strong>
              <p>Bắt đầu bằng cách đăng ký địa điểm đầu tiên của bạn.</p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsRegistrationOpen(true)}
              >
                Thêm mới sân
              </button>
            </div>
          )}
          <div className="venue-list">
            {venues.map((venue) => (
              <button
                type="button"
                key={venue.id}
                className={`venue-choice ${selectedVenueId === venue.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedVenueId(venue.id);
                  setSelectedCourtId(venue.courts?.[0]?.id ?? "");
                }}
              >
                {venue.imageUrls[0] ? (
                  <img
                    className="venue-choice-image"
                    src={venue.imageUrls[0]}
                    alt=""
                  />
                ) : (
                  <span className="venue-choice-placeholder" aria-hidden="true">
                    ⌂
                  </span>
                )}
                <span className="venue-choice-copy">
                  <span className="venue-choice-title">
                    <strong>{venue.name}</strong>
                    <small
                      className={`status status-${venue.status.toLowerCase()}`}
                    >
                      {venue.status === "PENDING"
                        ? "Chờ duyệt"
                        : venue.status === "APPROVED"
                          ? "Đã duyệt"
                          : "Từ chối"}
                    </small>
                  </span>
                  <span className="venue-choice-address">{venue.address}</span>
                  <span className="venue-choice-meta">
                    {venue.courts?.length ?? 0} sân
                    {venue.videoUrls?.length
                      ? ` · ${venue.videoUrls.length} video`
                      : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="management-content">
          {!selectedVenue ? (
            <div className="panel management-welcome">
              <span className="welcome-icon" aria-hidden="true">
                ⌂
              </span>
              <p className="section-kicker">BẮT ĐẦU QUẢN LÝ</p>
              <h2>Không gian sân của bạn</h2>
              <p>
                Chọn một cụm sân ở danh sách để quản lý, hoặc thêm địa điểm mới
                để bắt đầu.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsRegistrationOpen(true)}
              >
                Thêm mới sân
              </button>
            </div>
          ) : selectedVenue.status !== "APPROVED" ? (
            <div className="panel approval-waiting">
              {selectedVenue.imageUrls[0] && (
                <img src={selectedVenue.imageUrls[0]} alt="" />
              )}
              <div>
                <span
                  className={`status status-${selectedVenue.status.toLowerCase()}`}
                >
                  {selectedVenue.status === "PENDING"
                    ? "ĐANG CHỜ DUYỆT"
                    : "YÊU CẦU BỊ TỪ CHỐI"}
                </span>
                <h2>{selectedVenue.name}</h2>
                <p>{selectedVenue.address}</p>
                <p>
                  {selectedVenue.status === "PENDING"
                    ? "Quản trị viên đang xem xét thông tin đăng ký. Các tính năng quản lý sẽ được mở sau khi cụm sân được duyệt."
                    : "Vui lòng kiểm tra thông tin đăng ký hoặc liên hệ quản trị viên để biết thêm chi tiết."}
                </p>
              </div>
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
                await Promise.all([
                  venuesResource.reload(),
                  hoursResource.reload(),
                  pricingResource.reload(),
                  maintenanceResource.reload(),
                ]);
              }}
              runAction={runAction}
            />
          )}
        </div>
      </div>

      <AdminApprovals
        runAction={runAction}
        refreshVenues={venuesResource.reload}
      />
      {isRegistrationOpen && (
        <VenueRegistrationModal
          pending={createVenue.pending}
          error={registrationError}
          onClose={() => {
            if (!createVenue.pending) setIsRegistrationOpen(false);
          }}
          onSubmit={onCreateVenue}
        />
      )}
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
  const [newPricingType, setNewPricingType] = useState<PricingType>("STANDARD");
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const {
    venue,
    hours,
    setHours,
    hoursLoading,
    selectedCourtId,
    setSelectedCourtId,
    pricing,
    pricingLoading,
    maintenance,
    maintenanceLoading,
    refreshAll,
    runAction,
  } = props;
  const courts = venue.courts ?? [];
  const selectedCourt = courts.find(({ id }) => id === selectedCourtId);

  const updateVenue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void runAction(async () => {
      await api.patch(`/venues/${venue.id}`, {
        name: form.get("name"),
        address: form.get("address"),
        description: form.get("description") || undefined,
        sportTypes: String(form.get("sportTypes") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        imageUrls: String(form.get("imageUrls") ?? "")
          .split(/\n|,/)
          .map((value) => value.trim())
          .filter(Boolean),
        videoUrls: String(form.get("videoUrls") ?? "")
          .split(/\n|,/)
          .map((value) => value.trim())
          .filter(Boolean),
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
        name: values.get("courtName"),
        sportType: values.get("courtSport"),
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
          <div className="panel-heading">
            <h2>Thông tin cụm sân</h2>
            <span className={`status status-${venue.status.toLowerCase()}`}>
              {venue.status}
            </span>
          </div>
          <form className="form-stack" onSubmit={updateVenue}>
            <label>
              Tên cụm sân
              <input name="name" defaultValue={venue.name} required />
            </label>
            <label>
              Địa chỉ
              <input name="address" defaultValue={venue.address} required />
            </label>
            <label>
              Môn thể thao, cách nhau bằng dấu phẩy
              <input
                name="sportTypes"
                defaultValue={venue.sportTypes.join(", ")}
              />
            </label>
            <label>
              URL hình ảnh, mỗi dòng hoặc dấu phẩy một URL
              <textarea
                name="imageUrls"
                defaultValue={venue.imageUrls.join("\n")}
                rows={3}
              />
            </label>
            <label>
              URL video, mỗi dòng một URL
              <textarea
                name="videoUrls"
                defaultValue={venue.videoUrls.join("\n")}
                rows={2}
              />
            </label>
            <label>
              Mô tả
              <textarea
                name="description"
                defaultValue={venue.description ?? ""}
                rows={3}
              />
            </label>
            <button className="button button-primary">Lưu thông tin</button>
          </form>
          <button
            type="button"
            className="button button-danger"
            onClick={() =>
              void runAction(async () => {
                await api.delete(`/venues/${venue.id}`);
                await refreshAll();
              })
            }
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
                <button
                  type="button"
                  className="court-select"
                  onClick={() => setSelectedCourtId(court.id)}
                >
                  <strong>{court.name}</strong>
                  <span>{court.sportType}</span>
                  <small>{court.isActive ? "Đang hoạt động" : "Đã khóa"}</small>
                </button>
                <button
                  type="button"
                  className="button button-muted"
                  onClick={() =>
                    void runAction(async () => {
                      await api.patch(`/courts/${court.id}`, {
                        isActive: !court.isActive,
                      });
                      await refreshAll();
                    })
                  }
                >
                  {court.isActive ? "Khóa sân" : "Mở sân"}
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() =>
                    void runAction(async () => {
                      await api.delete(`/courts/${court.id}`);
                      await refreshAll();
                    })
                  }
                >
                  Xóa
                </button>
              </div>
            ))}
            {!courts.length && <p>Chưa có sân con.</p>}
          </div>
          <form className="inline-form" onSubmit={createCourt}>
            <label>
              Tên sân
              <input name="courtName" required minLength={2} />
            </label>
            <label>
              Môn thể thao
              <input name="courtSport" required minLength={2} />
            </label>
            <button className="button button-primary">Thêm sân</button>
          </form>
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="hours">
        <div className="panel">
          <h2>Giờ hoạt động theo thứ</h2>
          {hoursLoading ? (
            <p>Đang tải giờ hoạt động...</p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runAction(async () => {
                  await api.put(`/venues/${venue.id}/opening-hours`, { hours });
                  await refreshAll();
                });
              }}
            >
              <div className="hours-grid">
                {hours.map((hour) => (
                  <div className="hour-row" key={hour.weekday}>
                    <strong>{weekdays[hour.weekday]}</strong>
                    <input
                      aria-label={`${weekdays[hour.weekday]} mở cửa`}
                      type="time"
                      value={hour.opensAt}
                      disabled={hour.isClosed}
                      onChange={(event) =>
                        setHours(
                          hours.map((item) =>
                            item.weekday === hour.weekday
                              ? { ...item, opensAt: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label={`${weekdays[hour.weekday]} đóng cửa`}
                      type="time"
                      value={hour.closesAt}
                      disabled={hour.isClosed}
                      onChange={(event) =>
                        setHours(
                          hours.map((item) =>
                            item.weekday === hour.weekday
                              ? { ...item, closesAt: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={hour.isClosed}
                        onChange={(event) =>
                          setHours(
                            hours.map((item) =>
                              item.weekday === hour.weekday
                                ? { ...item, isClosed: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />{" "}
                      Nghỉ
                    </label>
                  </div>
                ))}
              </div>
              <button className="button button-primary" disabled={hoursLoading}>
                Lưu giờ hoạt động
              </button>
            </form>
          )}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="pricing">
        <div className="panel">
          <h2>Bảng giá theo sân</h2>
          <CourtPicker
            courts={courts}
            selectedCourtId={selectedCourtId}
            setSelectedCourtId={setSelectedCourtId}
          />
          {!selectedCourt && <p>Chọn sân con để cấu hình giá.</p>}
          {selectedCourt && (
            <>
              <div className="rule-list">
                {pricingLoading && <p>Đang tải giá...</p>}
                {pricing.map((rule) => (
                  <div className="rule-row" key={rule.id}>
                    <span>
                      <strong>{priceTypeLabel[rule.type]}</strong> ·{" "}
                      {rule.type === "WEEKEND"
                        ? rule.weekday === null
                          ? "Thứ bảy & Chủ nhật"
                          : weekdays[rule.weekday]
                        : rule.weekday === null
                          ? "Tất cả ngày"
                          : weekdays[rule.weekday]}{" "}
                      · {rule.startsAt}–{rule.endsAt}
                    </span>
                    <strong>
                      {rule.type === "STANDARD"
                        ? `${Number(rule.pricePerHour).toLocaleString("vi-VN")} đ/giờ`
                        : `+${rule.increasePercent}%`}
                    </strong>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() =>
                        void runAction(async () => {
                          await api.delete(
                            `/courts/${selectedCourt.id}/pricing/${rule.id}`,
                          );
                          await refreshAll();
                        })
                      }
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
              <p className="pricing-hint">
                Giá cơ bản được tính theo giờ. Phụ thu cuối tuần và giờ vàng
                cộng dồn khi cùng áp dụng; mỗi mức tăng từ 10% đến 20%.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsPricingModalOpen(true)}
              >
                Thêm mức giá
              </button>
              {isPricingModalOpen && (
                <div
                  className="venue-modal-backdrop"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setIsPricingModalOpen(false);
                    }
                  }}
                >
                  <section
                    className="venue-modal pricing-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pricing-modal-title"
                  >
                    <header className="venue-modal-header">
                      <div>
                        <span className="modal-step">CẤU HÌNH GIÁ</span>
                        <h2 id="pricing-modal-title">Thêm mức giá cho sân</h2>
                        <p>
                          Giá thường là giá gốc; cuối tuần và giờ vàng được
                          tính phụ thu theo phần trăm.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="modal-close"
                        aria-label="Đóng biểu mẫu giá"
                        onClick={() => setIsPricingModalOpen(false)}
                      >
                        ×
                      </button>
                    </header>
                    <form
                      className="venue-registration-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formElement = event.currentTarget;
                        const form = new FormData(formElement);
                        void runAction(async () => {
                          await api.post(
                            `/courts/${selectedCourt.id}/pricing`,
                            {
                              type: newPricingType,
                              ...(newPricingType === "STANDARD"
                                ? {
                                    pricePerHour: Number(
                                      form.get("pricePerHour"),
                                    ),
                                  }
                                : {
                                    increasePercent: Number(
                                      form.get("increasePercent"),
                                    ),
                                  }),
                              weekday:
                                newPricingType === "WEEKEND" ||
                                form.get("weekday") === ""
                                  ? undefined
                                  : Number(form.get("weekday")),
                              startsAt: form.get("startsAt"),
                              endsAt: form.get("endsAt"),
                            },
                          );
                          await refreshAll();
                          setIsPricingModalOpen(false);
                        });
                      }}
                    >
                      <div className="venue-form-fields">
                        <label>
                          Loại giá
                          <select
                            name="type"
                            value={newPricingType}
                            onChange={(event) =>
                              setNewPricingType(
                                event.target.value as PricingType,
                              )
                            }
                          >
                            <option value="STANDARD">Giá thường</option>
                            <option value="WEEKEND">Phụ thu cuối tuần</option>
                            <option value="PEAK">Phụ thu giờ vàng</option>
                          </select>
                        </label>
                        {newPricingType === "WEEKEND" ? (
                          <p className="pricing-hint">
                            Tự động áp dụng vào thứ bảy và chủ nhật.
                          </p>
                        ) : (
                          <label>
                            Áp dụng thứ
                            <select name="weekday">
                              <option value="">Mọi ngày</option>
                              {weekdays.map((day, value) => (
                                <option value={value} key={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {newPricingType === "STANDARD" ? (
                          <label>
                            Giá cơ bản/giờ (VNĐ)
                            <input
                              name="pricePerHour"
                              type="number"
                              min="0"
                              step="1000"
                              required
                            />
                          </label>
                        ) : (
                          <label>
                            Tỷ lệ phụ thu (%)
                            <input
                              name="increasePercent"
                              type="number"
                              min="10"
                              max="20"
                              step="1"
                              defaultValue="10"
                              required
                            />
                            <small>
                              Mức tăng từ 10% đến 20%; phụ thu cuối tuần và giờ
                              vàng sẽ cộng dồn.
                            </small>
                          </label>
                        )}
                        <label>
                          Từ
                          <input
                            name="startsAt"
                            type="time"
                            defaultValue="06:00"
                            required
                          />
                        </label>
                        <label>
                          Đến
                          <input
                            name="endsAt"
                            type="time"
                            defaultValue="22:00"
                            required
                          />
                        </label>
                      </div>
                      <footer className="venue-modal-footer">
                        <span>
                          {newPricingType === "STANDARD"
                            ? "Giá áp dụng cho mỗi giờ đặt."
                            : "Chọn tỷ lệ phụ thu và khung giờ áp dụng."}
                        </span>
                        <div>
                          <button
                            type="button"
                            className="button button-muted"
                            onClick={() => setIsPricingModalOpen(false)}
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            className="button button-primary"
                          >
                            Lưu mức giá
                          </button>
                        </div>
                      </footer>
                    </form>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="maintenance">
        <div className="panel">
          <h2>Khóa lịch bảo trì</h2>
          <CourtPicker
            courts={courts}
            selectedCourtId={selectedCourtId}
            setSelectedCourtId={setSelectedCourtId}
          />
          {!selectedCourt && <p>Chọn sân con để quản lý lịch bảo trì.</p>}
          {selectedCourt && (
            <>
              {maintenanceLoading && <p>Đang tải lịch...</p>}
              <div className="rule-list">
                {maintenance.map((block) => (
                  <div className="rule-row" key={block.id}>
                    <span>
                      <strong>{block.reason}</strong>
                      <br />
                      {new Date(block.startAt).toLocaleString("vi-VN")} –{" "}
                      {new Date(block.endAt).toLocaleString("vi-VN")}
                    </span>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() =>
                        void runAction(async () => {
                          await api.delete(
                            `/courts/${selectedCourt.id}/maintenance/${block.id}`,
                          );
                          await refreshAll();
                        })
                      }
                    >
                      Xóa khóa lịch
                    </button>
                  </div>
                ))}
              </div>
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formElement = event.currentTarget;
                  const form = new FormData(formElement);
                  void runAction(async () => {
                    await api.post(`/courts/${selectedCourt.id}/maintenance`, {
                      startAt: new Date(
                        String(form.get("startAt")),
                      ).toISOString(),
                      endAt: new Date(String(form.get("endAt"))).toISOString(),
                      reason: form.get("reason"),
                    });
                    formElement.reset();
                    await refreshAll();
                  });
                }}
              >
                <label>
                  Bắt đầu
                  <input name="startAt" type="datetime-local" required />
                </label>
                <label>
                  Kết thúc
                  <input name="endAt" type="datetime-local" required />
                </label>
                <label>
                  Lý do
                  <input name="reason" required minLength={3} />
                </label>
                <button className="button button-primary">Khóa lịch</button>
              </form>
            </>
          )}
        </div>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

const priceTypeLabel: Record<PricingType, string> = {
  STANDARD: "Giá thường",
  WEEKEND: "Cuối tuần",
  PEAK: "Giờ vàng",
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
    <label className="court-picker">
      Sân con
      <select
        value={selectedCourtId}
        onChange={(event) => setSelectedCourtId(event.target.value)}
      >
        <option value="">Chọn sân</option>
        {courts.map((court) => (
          <option key={court.id} value={court.id}>
            {court.name} · {court.sportType}
          </option>
        ))}
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
  const [error, setError] = useState("");

  const loadPending = async () => {
    setError("");
    try {
      const { data } = await api.get<Venue[]>("/venues/pending");
      setPending(data);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  return (
    <section className="admin-approvals">
      <button
        className="button button-muted"
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) void loadPending();
        }}
      >
        {open ? "Ẩn" : "Duyệt cụm sân mới (Admin)"}
      </button>
      {open && (
        <div className="panel">
          <h2>Yêu cầu chờ duyệt</h2>
          {error && (
            <p className="error-message">Không tải được yêu cầu: {error}</p>
          )}
          {!error && pending.length === 0 && <p>Không có yêu cầu đang chờ.</p>}
          {pending.map((venue) => (
            <div className="approval-row" key={venue.id}>
              <div>
                <strong>{venue.name}</strong>
                <span>{venue.address}</span>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  void runAction(async () => {
                    await api.patch(`/venues/${venue.id}/approval`, {
                      status: "APPROVED",
                    });
                    await loadPending();
                    await refreshVenues();
                  })
                }
              >
                Duyệt
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() =>
                  void runAction(async () => {
                    await api.patch(`/venues/${venue.id}/approval`, {
                      status: "REJECTED",
                    });
                    await loadPending();
                    await refreshVenues();
                  })
                }
              >
                Từ chối
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
