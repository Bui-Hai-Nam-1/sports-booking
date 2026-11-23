
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminUserDetailPage } from '../pages/AdminUserDetailPage';

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
        path: 'admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <div>Trang quản trị Admin</div>
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
        path: 'admin/users',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminUsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users/:id',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminUserDetailPage />
          </ProtectedRoute>
        ),
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
