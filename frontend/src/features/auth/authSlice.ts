
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'CUSTOMER' | 'OWNER' | 'ADMIN';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
}

const savedToken = localStorage.getItem('accessToken');
const savedUser = localStorage.getItem('user');

const initialState: AuthState = {
  accessToken: savedToken,
  user: savedUser ? JSON.parse(savedUser) as AuthUser : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{
        accessToken: string;
        user: AuthUser;
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;

      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },

    logout: (state) => {
      state.accessToken = null;
      state.user = null;

      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    },

    updateUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
  },
});

export const { loginSuccess, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
