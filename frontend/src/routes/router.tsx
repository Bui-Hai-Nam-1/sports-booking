import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminUserDetailPage } from '../pages/AdminUserDetailPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { BookingSearchPage } from '../pages/BookingSearchPage';
import { VenueManagementPage } from '../pages/VenueManagementPage';
import { OwnerApprovalPage } from '../pages/OwnerApprovalPage';
import { MyBookingsPage } from '../pages/bookings/MyBookingsPage';
import { BookingDetailPage } from '../pages/bookings/BookingDetailPage';
import { MyComplaintsPage } from '../pages/complaints/MyComplaintsPage';
import { OwnerBookingsPage } from '../pages/owner/OwnerBookingsPage';
import { OwnerDashboardPage } from '../pages/dashboard/OwnerDashboardPage';
import { AdminDashboardPage } from '../pages/dashboard/AdminDashboardPage';
import { AdminComplaintsPage } from '../pages/admin/AdminComplaintsPage';
import { RevenueReportPage } from '../pages/reports/RevenueReportPage';

export const router = createBrowserRouter([{
  path: '/',
  element: <AppLayout />,
  errorElement: <NotFoundPage />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'login', element: <LoginPage /> },
    { path: 'register', element: <RegisterPage /> },
    { path: 'forgot-password', element: <ForgotPasswordPage /> },
    { path: 'reset-password', element: <ResetPasswordPage /> },
    { path: 'bookings', element: <BookingSearchPage /> },
    { path: 'profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
    { path: 'customer/account', element: <ProtectedRoute allowedRoles={['CUSTOMER']}><div>Trang tài khoản khách hàng</div></ProtectedRoute> },
    { path: 'my/bookings', element: <ProtectedRoute allowedRoles={['CUSTOMER','OWNER','ADMIN']}><MyBookingsPage /></ProtectedRoute> },
    { path: 'my/bookings/:id', element: <ProtectedRoute allowedRoles={['CUSTOMER','OWNER','ADMIN']}><BookingDetailPage /></ProtectedRoute> },
    { path: 'complaints/me', element: <ProtectedRoute allowedRoles={['CUSTOMER','OWNER','ADMIN']}><MyComplaintsPage /></ProtectedRoute> },
    { path: 'owner/dashboard', element: <ProtectedRoute allowedRoles={['OWNER','ADMIN']}><OwnerDashboardPage /></ProtectedRoute> },
    { path: 'owner/bookings', element: <ProtectedRoute allowedRoles={['OWNER','ADMIN']}><OwnerBookingsPage /></ProtectedRoute> },
    { path: 'owner/venues', element: <ProtectedRoute allowedRoles={['OWNER']}><VenueManagementPage /></ProtectedRoute> },
    { path: 'owner/approval', element: <ProtectedRoute allowedRoles={['ADMIN']}><OwnerApprovalPage /></ProtectedRoute> },
    { path: 'reports/revenue', element: <ProtectedRoute allowedRoles={['OWNER','ADMIN']}><RevenueReportPage /></ProtectedRoute> },
    { path: 'admin', element: <ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>, children: [
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'users/:id', element: <AdminUserDetailPage /> },
      { path: 'complaints', element: <AdminComplaintsPage /> },
    ]},
    { path: '*', element: <NotFoundPage /> },
  ],
}]);
