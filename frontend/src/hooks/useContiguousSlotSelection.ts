import { useCallback, useMemo, useState } from 'react';
import type { SlotStatus } from '../types/booking';

export interface BookableTimeSlot {
  startAt: string;
  endAt: string;
  startTime?: string;
  endTime?: string;
  price: number;
  status: SlotStatus;
}

export interface UseContiguousSlotSelectionResult<TSlot extends BookableTimeSlot> {
  selectedSlots: ReadonlyArray<TSlot>;
  selectionNotice: string | null;
  totalPrice: number;
  slotCount: number;
  isSelected: (slot: TSlot) => boolean;
  toggleSlot: (slot: TSlot) => void;
  replaceSelection: (slots: ReadonlyArray<TSlot>) => void;
  clearSelection: () => void;
}

/**
 * Generic hook enforcing contiguous hourly slot selection for multi-slot booking.
 */
export function useContiguousSlotSelection<TSlot extends BookableTimeSlot>(
  maxSlots = 12,
): UseContiguousSlotSelectionResult<TSlot> {
  const [selectedSlots, setSelectedSlots] = useState<TSlot[]>([]);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  const isSelected = useCallback(
    (slot: TSlot) => selectedSlots.some((item) => item.startAt === slot.startAt),
    [selectedSlots],
  );

  const toggleSlot = useCallback(
    (slot: TSlot) => {
      if (slot.status !== 'AVAILABLE') {
        setSelectionNotice('Chỉ có thể chọn các khung giờ đang trống.');
        return;
      }

      setSelectionNotice(null);
      setSelectedSlots((prev) => {
        const sorted = [...prev].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );
        const existingIndex = sorted.findIndex(
          (item) => item.startAt === slot.startAt,
        );

        if (existingIndex !== -1) {
          // Removing an edge slot keeps remaining slots contiguous; clicking middle restarts from it.
          if (existingIndex === 0 || existingIndex === sorted.length - 1) {
            return sorted.filter((_, idx) => idx !== existingIndex);
          }
          setSelectionNotice(
            'Đã đặt lại lựa chọn tại khung giờ vừa nhấn để giữ dãy giờ liên tiếp.',
          );
          return [slot];
        }

        if (sorted.length === 0) {
          return [slot];
        }

        const firstStart = new Date(sorted[0].startAt).getTime();
        const lastEnd = new Date(sorted[sorted.length - 1].endAt).getTime();
        const slotStart = new Date(slot.startAt).getTime();
        const slotEnd = new Date(slot.endAt).getTime();

        const isAdjacentBefore = slotEnd === firstStart;
        const isAdjacentAfter = slotStart === lastEnd;

        if (!isAdjacentBefore && !isAdjacentAfter) {
          setSelectionNotice(
            'Các khung giờ không liền nhau — đã chuyển sang chọn khung giờ mới.',
          );
          return [slot];
        }

        if (sorted.length >= maxSlots) {
          setSelectionNotice(`Tối đa ${maxSlots} khung giờ liên tiếp mỗi đơn.`);
          return sorted;
        }

        return isAdjacentBefore ? [slot, ...sorted] : [...sorted, slot];
      });
    },
    [maxSlots],
  );

  const replaceSelection = useCallback((slots: ReadonlyArray<TSlot>) => {
    setSelectionNotice(null);
    setSelectedSlots(
      [...slots].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionNotice(null);
    setSelectedSlots([]);
  }, []);

  const totalPrice = useMemo(
    () => selectedSlots.reduce((sum, slot) => sum + slot.price, 0),
    [selectedSlots],
  );

  return {
    selectedSlots,
    selectionNotice,
    totalPrice,
    slotCount: selectedSlots.length,
    isSelected,
    toggleSlot,
    replaceSelection,
    clearSelection,
  };
}
