
import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '../layouts/AppLayout';
import { AdminLayout } from '../layouts/AdminLayout';

import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminUserDetailPage } from '../pages/AdminUserDetailPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },

      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },

      {
        path: 'customer/account',
        element: (
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <div>Trang tài khoản khách hàng</div>
          </ProtectedRoute>
        ),
      },

      {
        path: 'owner/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['OWNER']}>
            <div>Trang quản lý chủ sân</div>
          </ProtectedRoute>
        ),
      },

      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },

      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'dashboard',
            element: <AdminDashboardPage />,
          },
          {
            path: 'users',
            element: <AdminUsersPage />,
          },
          {
            path: 'users/:id',
            element: <AdminUserDetailPage />,
          },
        ],
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
