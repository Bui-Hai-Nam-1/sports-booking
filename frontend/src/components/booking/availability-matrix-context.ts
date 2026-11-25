import { createContext, useContext } from 'react';
import type { AvailabilitySlot } from '../../types/booking';

export interface AvailabilityMatrixContextValue {
  columns: ReadonlyArray<string>;
  selectedSlots: ReadonlyArray<AvailabilitySlot>;
  totalPrice: number;
  selectionNotice: string | null;
  isSelected: (slot: AvailabilitySlot) => boolean;
  onToggleSlot: (slot: AvailabilitySlot) => void;
}

export const AvailabilityMatrixContext =
  createContext<AvailabilityMatrixContextValue | null>(null);

export function formatVnd(amount: number | string): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  return `${new Intl.NumberFormat('vi-VN').format(Number.isFinite(numeric) ? numeric : 0)} đ`;
}

export function useAvailabilityMatrixContext(): AvailabilityMatrixContextValue {
  const ctx = useContext(AvailabilityMatrixContext);
  if (!ctx) {
    throw new Error(
      'AvailabilityMatrix sub-components must be rendered inside <AvailabilityMatrix.Root>',
    );
  }
  return ctx;
}
