import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { extractErrorMessage } from '../../lib/api';
import {
  cancelBooking,
  createBooking,
  listMyBookings,
  type ListBookingsParams,
} from '../../lib/bookingApi';
import {
  isApiClientError,
  type AvailabilitySlot,
  type BookingRecord,
  type CancelBookingPayload,
  type CreateBookingPayload,
  type PaginationMeta,
} from '../../types/booking';

export type GridViewMode = 'venue' | 'court';

export interface BookingFilterState {
  sportType: string;
  area: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface BookingState {
  filters: BookingFilterState;
  selectedVenueId: string | null;
  selectedCourtId: string | null;
  gridMode: GridViewMode;
  selectedSlots: AvailabilitySlot[];
  lastCreatedBooking: BookingRecord | null;
  myBookings: BookingRecord[];
  myBookingsMeta: PaginationMeta | null;
  myBookingsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  createStatus: 'idle' | 'submitting' | 'succeeded' | 'failed';
  error: string | null;
  lastErrorStatus: number | null;
}

function getTodayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const initialState: BookingState = {
  filters: {
    sportType: '',
    area: '',
    date: getTodayLocalIso(),
    startTime: '',
    endTime: '',
  },
  selectedVenueId: null,
  selectedCourtId: null,
  gridMode: 'venue',
  selectedSlots: [],
  lastCreatedBooking: null,
  myBookings: [],
  myBookingsMeta: null,
  myBookingsStatus: 'idle',
  createStatus: 'idle',
  error: null,
  lastErrorStatus: null,
};

export const submitBookingThunk = createAsyncThunk<
  BookingRecord,
  CreateBookingPayload,
  { rejectValue: { message: string; status: number | null } }
>('booking/submit', async (payload, { rejectWithValue }) => {
  try {
    return await createBooking(payload);
  } catch (reason) {
    return rejectWithValue({
      message: extractErrorMessage(reason),
      status: isApiClientError(reason) ? (reason.status ?? null) : null,
    });
  }
});

export const fetchMyBookingsThunk = createAsyncThunk<
  { items: BookingRecord[]; meta: PaginationMeta },
  ListBookingsParams | undefined,
  { rejectValue: string }
>('booking/fetchMine', async (params, { rejectWithValue }) => {
  try {
    const result = await listMyBookings(params);
    return {
      items: [...result.items],
      meta: result.meta,
    };
  } catch (reason) {
    return rejectWithValue(extractErrorMessage(reason));
  }
});

export const cancelMyBookingThunk = createAsyncThunk<
  BookingRecord,
  { bookingId: string; payload: CancelBookingPayload },
  { rejectValue: string }
>('booking/cancelMine', async ({ bookingId, payload }, { rejectWithValue }) => {
  try {
    return await cancelBooking(bookingId, payload);
  } catch (reason) {
    return rejectWithValue(extractErrorMessage(reason));
  }
});

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSearchFilters: (
      state,
      action: PayloadAction<Partial<BookingFilterState>>,
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetSearchFilters: (state) => {
      state.filters = {
        sportType: '',
        area: '',
        date: getTodayLocalIso(),
        startTime: '',
        endTime: '',
      };
    },
    selectVenue: (state, action: PayloadAction<string | null>) => {
      state.selectedVenueId = action.payload;
      state.selectedSlots = [];
      state.error = null;
      state.lastErrorStatus = null;
    },
    selectCourt: (state, action: PayloadAction<string | null>) => {
      state.selectedCourtId = action.payload;
      state.selectedSlots = [];
      state.error = null;
      state.lastErrorStatus = null;
    },
    setGridMode: (state, action: PayloadAction<GridViewMode>) => {
      state.gridMode = action.payload;
      state.selectedSlots = [];
    },
    setSelectedSlots: (state, action: PayloadAction<AvailabilitySlot[]>) => {
      state.selectedSlots = [...action.payload].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      );
    },
    clearSlotSelection: (state) => {
      state.selectedSlots = [];
    },
    clearBookingError: (state) => {
      state.error = null;
      state.lastErrorStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitBookingThunk.pending, (state) => {
        state.createStatus = 'submitting';
        state.error = null;
        state.lastErrorStatus = null;
      })
      .addCase(submitBookingThunk.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.lastCreatedBooking = action.payload;
        state.selectedSlots = [];
        state.myBookings = [action.payload, ...state.myBookings];
      })
      .addCase(submitBookingThunk.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload?.message ?? 'Đặt sân thất bại.';
        state.lastErrorStatus = action.payload?.status ?? null;
      })
      .addCase(fetchMyBookingsThunk.pending, (state) => {
        state.myBookingsStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchMyBookingsThunk.fulfilled, (state, action) => {
        state.myBookingsStatus = 'succeeded';
        state.myBookings = action.payload.items;
        state.myBookingsMeta = action.payload.meta;
      })
      .addCase(fetchMyBookingsThunk.rejected, (state, action) => {
        state.myBookingsStatus = 'failed';
        state.error = action.payload ?? 'Không thể tải danh sách đơn đặt.';
      })
      .addCase(cancelMyBookingThunk.fulfilled, (state, action) => {
        state.myBookings = state.myBookings.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(cancelMyBookingThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Không thể hủy đơn đặt.';
      });
  },
});

export const {
  setSearchFilters,
  resetSearchFilters,
  selectVenue,
  selectCourt,
  setGridMode,
  setSelectedSlots,
  clearSlotSelection,
  clearBookingError,
} = bookingSlice.actions;

export default bookingSlice.reducer;
