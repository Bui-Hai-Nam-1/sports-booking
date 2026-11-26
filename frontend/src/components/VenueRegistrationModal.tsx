import { useEffect, useRef, useState, type FormEvent } from "react";

const imageLimit = 12;
const videoLimit = 3;
const imageMaxSize = 10 * 1024 * 1024;
const videoMaxSize = 100 * 1024 * 1024;
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];

export interface VenueRegistrationDraft {
  name: string;
  address: string;
  sportTypes: string[];
  description?: string;
  initialCourtPricePerHour: number;
  initialPriceStartsAt: string;
  initialPriceEndsAt: string;
  imageFiles: File[];
  videoFiles: File[];
}

interface VenueRegistrationModalProps {
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (draft: VenueRegistrationDraft) => Promise<void>;
}

interface PreviewFile {
  file: File;
  url: string;
}

export function VenueRegistrationModal({
  pending,
  error,
  onClose,
  onSubmit,
}: VenueRegistrationModalProps) {
  const [images, setImages] = useState<PreviewFile[]>([]);
  const [videos, setVideos] = useState<PreviewFile[]>([]);
  const [fileError, setFileError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    firstInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function addFiles(files: FileList | null, kind: "image" | "video") {
    if (!files) return;
    setFileError("");
    const current = kind === "image" ? images : videos;
    const limit = kind === "image" ? imageLimit : videoLimit;
    const maxSize = kind === "image" ? imageMaxSize : videoMaxSize;
    const allowedTypes = kind === "image" ? imageTypes : videoTypes;
    const additions: PreviewFile[] = [];

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        setFileError(
          kind === "image"
            ? "Ảnh chỉ hỗ trợ JPEG, PNG, WebP hoặc GIF."
            : "Video chỉ hỗ trợ MP4, WebM hoặc MOV.",
        );
        continue;
      }
      if (file.size > maxSize) {
        setFileError(
          kind === "image"
            ? "Mỗi ảnh tối đa 10 MB."
            : "Mỗi video tối đa 100 MB.",
        );
        continue;
      }
      if (current.length + additions.length >= limit) {
        setFileError(
          kind === "image"
            ? `Chỉ được tải tối đa ${imageLimit} ảnh.`
            : `Chỉ được tải tối đa ${videoLimit} video.`,
        );
        break;
      }
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      additions.push({ file, url });
    }

    if (kind === "image") setImages((existing) => [...existing, ...additions]);
    else setVideos((existing) => [...existing, ...additions]);
  }

  function removeFile(kind: "image" | "video", index: number) {
    const update = kind === "image" ? setImages : setVideos;
    update((existing) => {
      const selected = existing[index];
      if (selected) {
        URL.revokeObjectURL(selected.url);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (url) => url !== selected.url,
        );
      }
      return existing.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const sportTypes = String(values.get("sportTypes") ?? "")
      .split(",")
      .map((sport) => sport.trim())
      .filter(Boolean);
    if (!sportTypes.length) {
      setFileError("Vui lòng nhập ít nhất một môn thể thao.");
      return;
    }
    const initialCourtPricePerHour = Number(
      values.get("initialCourtPricePerHour"),
    );
    if (!Number.isFinite(initialCourtPricePerHour) || initialCourtPricePerHour < 0) {
      setFileError("Vui lòng nhập giá sân hợp lệ theo giờ.");
      return;
    }
    await onSubmit({
      name: String(values.get("name") ?? "").trim(),
      address: String(values.get("address") ?? "").trim(),
      description: String(values.get("description") ?? "").trim() || undefined,
      sportTypes: [...new Set(sportTypes)],
      initialCourtPricePerHour,
      initialPriceStartsAt: String(values.get("initialPriceStartsAt") ?? "06:00"),
      initialPriceEndsAt: String(values.get("initialPriceEndsAt") ?? "22:00"),
      imageFiles: images.map(({ file }) => file),
      videoFiles: videos.map(({ file }) => file),
    });
  }

  return (
    <div
      className="venue-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        className="venue-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-modal-title"
      >
        <header className="venue-modal-header">
          <div>
            <span className="modal-step">ĐĂNG KÝ ĐỊA ĐIỂM</span>
            <h2 id="venue-modal-title">Thêm mới cụm sân</h2>
            <p>Điền thông tin và gửi yêu cầu để quản trị viên xét duyệt.</p>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Đóng biểu mẫu"
            disabled={pending}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form
          className="venue-registration-form"
          onSubmit={(event) => void submit(event)}
        >
          <div className="venue-form-fields">
            <label>
              Tên cụm sân <span className="required-mark">*</span>
              <input
                ref={firstInputRef}
                name="name"
                required
                minLength={2}
                maxLength={120}
                placeholder="Ví dụ: Sân thể thao Thanh Xuân"
              />
            </label>
            <label>
              Địa chỉ <span className="required-mark">*</span>
              <input
                name="address"
                required
                minLength={5}
                maxLength={255}
                placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
              />
            </label>
            <label>
              Môn thể thao <span className="required-mark">*</span>
              <input
                name="sportTypes"
                required
                placeholder="Bóng đá, Cầu lông, Tennis..."
              />
              <small>Nhập nhiều môn, phân cách bằng dấu phẩy.</small>
            </label>
            <label>
              Mô tả
              <textarea
                name="description"
                rows={3}
                maxLength={2000}
                placeholder="Mô tả tiện ích và thông tin nổi bật của cụm sân"
              />
            </label>
          </div>

          <section className="initial-court-pricing">
            <div className="media-section-heading">
              <div>
                <h3>Sân đầu tiên & giá theo giờ</h3>
                <p>
                  Tạo Sân 1 theo môn thể thao đầu tiên và cài giá cơ bản ngay
                  khi đăng ký.
                </p>
              </div>
            </div>
            <div className="venue-form-fields">
              <label>
                Giá cơ bản (VNĐ/giờ) <span className="required-mark">*</span>
                <input
                  name="initialCourtPricePerHour"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="Ví dụ: 150000"
                />
              </label>
              <label>
                Bắt đầu áp dụng
                <input
                  name="initialPriceStartsAt"
                  type="time"
                  defaultValue="06:00"
                  required
                />
              </label>
              <label>
                Kết thúc áp dụng
                <input
                  name="initialPriceEndsAt"
                  type="time"
                  defaultValue="22:00"
                  required
                />
              </label>
            </div>
          </section>

          <div className="venue-media-section">
            <div className="media-section-heading">
              <div>
                <h3>Hình ảnh & video</h3>
                <p>Thêm ảnh bìa và video giới thiệu để khách dễ tìm sân.</p>
              </div>
              <span className="media-count">
                {images.length + videos.length}/{imageLimit + videoLimit}
              </span>
            </div>
            <div className="media-upload-grid">
              <label className="media-dropzone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={pending || images.length >= imageLimit}
                  onChange={(event) => {
                    addFiles(event.currentTarget.files, "image");
                    event.currentTarget.value = "";
                  }}
                />
                <span className="upload-icon" aria-hidden="true">
                  ▧
                </span>
                <strong>Thêm hình ảnh</strong>
                <small>
                  JPEG, PNG, WebP · tối đa 10 MB/ảnh · tối đa 12 ảnh
                </small>
                <span className="upload-action">Chọn ảnh</span>
              </label>
              <label className="media-dropzone">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  multiple
                  disabled={pending || videos.length >= videoLimit}
                  onChange={(event) => {
                    addFiles(event.currentTarget.files, "video");
                    event.currentTarget.value = "";
                  }}
                />
                <span className="upload-icon" aria-hidden="true">
                  ▷
                </span>
                <strong>Thêm video</strong>
                <small>
                  MP4, WebM, MOV · tối đa 100 MB/video · tối đa 3 video
                </small>
                <span className="upload-action">Chọn video</span>
              </label>
            </div>

            {(images.length > 0 || videos.length > 0) && (
              <div className="media-preview-grid">
                {images.map(({ file, url }, index) => (
                  <figure
                    className="media-preview"
                    key={`${file.name}-${file.lastModified}-${index}`}
                  >
                    <img src={url} alt={`Xem trước ${file.name}`} />
                    <figcaption>{file.name}</figcaption>
                    <button
                      type="button"
                      aria-label={`Xóa ${file.name}`}
                      disabled={pending}
                      onClick={() => removeFile("image", index)}
                    >
                      ×
                    </button>
                  </figure>
                ))}
                {videos.map(({ file, url }, index) => (
                  <figure
                    className="media-preview"
                    key={`${file.name}-${file.lastModified}-${index}`}
                  >
                    <video
                      src={url}
                      controls
                      preload="metadata"
                      aria-label={`Xem trước ${file.name}`}
                    />
                    <figcaption>{file.name}</figcaption>
                    <button
                      type="button"
                      aria-label={`Xóa ${file.name}`}
                      disabled={pending}
                      onClick={() => removeFile("video", index)}
                    >
                      ×
                    </button>
                  </figure>
                ))}
              </div>
            )}
            {fileError && (
              <p className="error-message media-error" role="alert">
                {fileError}
              </p>
            )}
            <p className="media-storage-hint">
              Tệp được lưu trên máy chủ của hệ thống và chỉ dùng cho thông tin
              cụm sân.
            </p>
          </div>

          {error && (
            <p className="error-message modal-error" role="alert">
              {error}
            </p>
          )}
          <footer className="venue-modal-footer">
            <span>Yêu cầu sẽ ở trạng thái chờ duyệt sau khi gửi.</span>
            <div>
              <button
                type="button"
                className="button button-muted"
                disabled={pending}
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={pending}
              >
                {pending ? "Đang tải tệp và gửi…" : "Gửi yêu cầu đăng ký"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
