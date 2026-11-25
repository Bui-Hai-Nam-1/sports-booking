import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Pre-configured demo profiles for testing and role switching
export const DEMO_PROFILES: Record<string, { user: User; token: string }> = {
  CUSTOMER: {
    user: {
      id: 'cust-demo-1',
      fullName: 'Nguyễn Văn Khách',
      email: 'khachhang@gmail.com',
      role: 'CUSTOMER',
    },
    token: btoa(
      JSON.stringify({
        id: 'cust-demo-1',
        email: 'khachhang@gmail.com',
        role: 'CUSTOMER',
        fullName: 'Nguyễn Văn Khách',
      }),
    ),
  },
  OWNER_1: {
    user: {
      id: 'owner-demo-1',
      fullName: 'Trần Văn Chủ Sân A',
      email: 'chusan_a@gmail.com',
      role: 'OWNER',
    },
    token: btoa(
      JSON.stringify({
        id: 'owner-demo-1',
        email: 'chusan_a@gmail.com',
        role: 'OWNER',
        fullName: 'Trần Văn Chủ Sân A',
      }),
    ),
  },
  OWNER_2: {
    user: {
      id: 'owner-demo-2',
      fullName: 'Lê Văn Chủ Sân B',
      email: 'chusan_b@gmail.com',
      role: 'OWNER',
    },
    token: btoa(
      JSON.stringify({
        id: 'owner-demo-2',
        email: 'chusan_b@gmail.com',
        role: 'OWNER',
        fullName: 'Lê Văn Chủ Sân B',
      }),
    ),
  },
  ADMIN: {
    user: {
      id: 'admin-demo-1',
      fullName: 'Quản Trị Viên Hệ Thống',
      email: 'admin@sportsbooking.vn',
      role: 'ADMIN',
    },
    token: btoa(
      JSON.stringify({
        id: 'admin-demo-1',
        email: 'admin@sportsbooking.vn',
        role: 'ADMIN',
        fullName: 'Quản Trị Viên Hệ Thống',
      }),
    ),
  },
};

const savedRole = localStorage.getItem('demo_active_role') || 'CUSTOMER';
const initialProfile = DEMO_PROFILES[savedRole] || DEMO_PROFILES.CUSTOMER;

const initialState: AuthState = {
  user: initialProfile.user,
  token: initialProfile.token,
  isAuthenticated: true,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('auth_token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('auth_token');
    },
    switchDemoRole: (state, action: PayloadAction<string>) => {
      const profile = DEMO_PROFILES[action.payload] || DEMO_PROFILES.CUSTOMER;
      state.user = profile.user;
      state.token = profile.token;
      state.isAuthenticated = true;
      localStorage.setItem('demo_active_role', action.payload);
      localStorage.setItem('auth_token', profile.token);
    },
  },
});

export const { setCredentials, logout, switchDemoRole } = authSlice.actions;
export const authReducer = authSlice.reducer;
