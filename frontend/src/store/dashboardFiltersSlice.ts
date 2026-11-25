import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type DateRangePreset = 'today' | '7days' | '30days' | 'thisMonth' | 'custom';

export interface DashboardFiltersState {
  preset: DateRangePreset;
  from: string;
  to: string;
  selectedVenueId: string;
  groupBy: 'day' | 'month';
}

function getInitialDates(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  let fromDate = new Date();

  switch (preset) {
    case 'today':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;
    case '7days':
      fromDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      fromDate.setHours(0, 0, 0, 0);
      break;
    case 'thisMonth':
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;
    case '30days':
    default:
      fromDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      fromDate.setHours(0, 0, 0, 0);
      break;
  }

  return { from: fromDate.toISOString(), to };
}

const initialDates = getInitialDates('30days');

const initialState: DashboardFiltersState = {
  preset: '30days',
  from: initialDates.from,
  to: initialDates.to,
  selectedVenueId: '',
  groupBy: 'day',
};

export const dashboardFiltersSlice = createSlice({
  name: 'dashboardFilters',
  initialState,
  reducers: {
    setPreset: (state, action: PayloadAction<DateRangePreset>) => {
      state.preset = action.payload;
      if (action.payload !== 'custom') {
        const { from, to } = getInitialDates(action.payload);
        state.from = from;
        state.to = to;
      }
    },
    setCustomDates: (state, action: PayloadAction<{ from: string; to: string }>) => {
      state.preset = 'custom';
      state.from = action.payload.from;
      state.to = action.payload.to;
    },
    setSelectedVenueId: (state, action: PayloadAction<string>) => {
      state.selectedVenueId = action.payload;
    },
    setGroupBy: (state, action: PayloadAction<'day' | 'month'>) => {
      state.groupBy = action.payload;
    },
    resetFilters: (state) => {
      const dates = getInitialDates('30days');
      state.preset = '30days';
      state.from = dates.from;
      state.to = dates.to;
      state.selectedVenueId = '';
      state.groupBy = 'day';
    },
  },
});

export const {
  setPreset,
  setCustomDates,
  setSelectedVenueId,
  setGroupBy,
  resetFilters,
} = dashboardFiltersSlice.actions;

export const dashboardFiltersReducer = dashboardFiltersSlice.reducer;
