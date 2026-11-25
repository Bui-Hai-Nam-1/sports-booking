import type { ReactNode } from 'react';
import type { AvailabilitySlot, PricingType, SlotStatus } from '../../types/booking';
import {
  AvailabilityMatrixContext,
  formatVnd,
  useAvailabilityMatrixContext,
} from './availability-matrix-context';

function formatCompactPrice(amount: number): string {
  if (amount >= 1000) {
    const k = Math.round(amount / 1000);
    return `${k}k`;
  }
  return `${amount}đ`;
}

const PRICING_TIER_LABEL: Readonly<Record<PricingType, string>> = {
  STANDARD: 'Thường',
  WEEKEND: 'Cuối tuần',
  PEAK: 'Giờ vàng',
};

const SLOT_STATUS_LABEL: Readonly<Record<SlotStatus, string>> = {
  AVAILABLE: 'Trống',
  BOOKED: 'Đã đặt',
  MAINTENANCE: 'Bảo trì',
  CLOSED: 'Đóng cửa',
  PAST: 'Đã qua',
};

interface RootProps {
  columns: ReadonlyArray<string>;
  selectedSlots: ReadonlyArray<AvailabilitySlot>;
  totalPrice: number;
  selectionNotice: string | null;
  isSelected: (slot: AvailabilitySlot) => boolean;
  onToggleSlot: (slot: AvailabilitySlot) => void;
  children: ReactNode;
}

export function AvailabilityMatrixRoot({
  columns,
  selectedSlots,
  totalPrice,
  selectionNotice,
  isSelected,
  onToggleSlot,
  children,
}: RootProps) {
  return (
    <AvailabilityMatrixContext.Provider
      value={{
        columns,
        selectedSlots,
        totalPrice,
        selectionNotice,
        isSelected,
        onToggleSlot,
      }}
    >
      <section className="availability-matrix" aria-label="Lưới lịch trống sân">
        {children}
      </section>
    </AvailabilityMatrixContext.Provider>
  );
}

export function AvailabilityMatrixHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="matrix-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="matrix-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="matrix-actions">{actions}</div>}
    </header>
  );
}

export function AvailabilityMatrixLegend() {
  return (
    <div className="matrix-legend" role="note" aria-label="Chú thích trạng thái">
      <span className="legend-item">
        <i className="legend-swatch is-available" /> Trống
      </span>
      <span className="legend-item">
        <i className="legend-swatch is-selected" /> Đang chọn
      </span>
      <span className="legend-item">
        <i className="legend-swatch is-booked" /> Đã đặt
      </span>
      <span className="legend-item">
        <i className="legend-swatch is-maintenance" /> Bảo trì
      </span>
      <span className="legend-item">
        <i className="legend-swatch is-closed" /> Đóng cửa / Đã qua
      </span>
    </div>
  );
}

export function AvailabilityMatrixGrid({
  rowHeaderLabel,
  emptyMessage = 'Không có khung giờ hoạt động trong khoảng thời gian đã chọn.',
  children,
}: {
  rowHeaderLabel: string;
  emptyMessage?: string;
  children: ReactNode;
}) {
  const { columns } = useAvailabilityMatrixContext();

  if (columns.length === 0) {
    return <p className="matrix-empty">{emptyMessage}</p>;
  }

  return (
    <div className="matrix-scroll">
      <table className="matrix-table">
        <thead>
          <tr>
            <th scope="col" className="matrix-sticky-col">
              {rowHeaderLabel}
            </th>
            {columns.map((column) => (
              <th scope="col" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AvailabilityMatrixSlotCell({ slot }: { slot: AvailabilitySlot }) {
  const { isSelected, onToggleSlot } = useAvailabilityMatrixContext();
  const selected = isSelected(slot);
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

  const tooltip = slot.maintenanceReason
    ? `Bảo trì: ${slot.maintenanceReason}`
    : `${slot.date} ${slot.startTime}-${slot.endTime} · ${SLOT_STATUS_LABEL[slot.status]}`;

  return (
    <td>
      <button
        type="button"
        className={`slot-btn ${statusClass}`}
        disabled={!isAvailable}
        aria-pressed={selected}
        title={tooltip}
        onClick={() => onToggleSlot(slot)}
      >
        {isAvailable ? (
          <>
            <strong className="slot-price">
              {formatCompactPrice(slot.price)}
            </strong>
            <span className={`tier-tag tier-${slot.pricingType.toLowerCase()}`}>
              {PRICING_TIER_LABEL[slot.pricingType]}
            </span>
          </>
        ) : (
          <span className="slot-state-text">
            {SLOT_STATUS_LABEL[slot.status]}
          </span>
        )}
      </button>
    </td>
  );
}

export function AvailabilityMatrixRow({
  rowLabel,
  rowMeta,
  cells,
}: {
  rowLabel: string;
  rowMeta?: string;
  cells: ReadonlyArray<AvailabilitySlot>;
}) {
  return (
    <tr>
      <th scope="row" className="matrix-sticky-col matrix-row-head">
        <span>{rowLabel}</span>
        {rowMeta && <small>{rowMeta}</small>}
      </th>
      {cells.map((slot) => (
        <AvailabilityMatrixSlotCell
          key={`${slot.date}-${slot.startTime}`}
          slot={slot}
        />
      ))}
    </tr>
  );
}

export function AvailabilityMatrixSummary({ children }: { children?: ReactNode }) {
  const { selectedSlots, totalPrice, selectionNotice } =
    useAvailabilityMatrixContext();

  const first = selectedSlots[0];
  const last = selectedSlots[selectedSlots.length - 1];

  return (
    <div className="matrix-summary">
      {selectionNotice && (
        <p className="booking-notice" role="status">
          {selectionNotice}
        </p>
      )}
      {selectedSlots.length === 0 ? (
        <p className="summary-hint">
          Nhấn vào các ô <strong>Trống</strong> liên tiếp nhau để chọn 1 hoặc
          nhiều giờ đặt sân.
        </p>
      ) : (
        <div className="summary-content">
          <div className="summary-details">
            <span className="summary-pill">
              {selectedSlots.length} khung giờ liên tiếp
            </span>
            <p className="summary-time">
              Ngày <strong>{first.date}</strong> ·{' '}
              <strong>
                {first.startTime} – {last.endTime}
              </strong>
            </p>
            <p className="summary-total">
              Tổng dự kiến: <strong>{formatVnd(totalPrice)}</strong>
            </p>
          </div>
          {children && <div className="summary-actions">{children}</div>}
        </div>
      )}
    </div>
  );
}
