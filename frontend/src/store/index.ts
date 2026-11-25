import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './authSlice';
import { dashboardFiltersReducer } from './dashboardFiltersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboardFilters: dashboardFiltersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
