import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { MyBookingsPage } from '../pages/bookings/MyBookingsPage';
import { BookingDetailPage } from '../pages/bookings/BookingDetailPage';
import { MyComplaintsPage } from '../pages/complaints/MyComplaintsPage';
import { OwnerBookingsPage } from '../pages/owner/OwnerBookingsPage';
import { OwnerDashboardPage } from '../pages/dashboard/OwnerDashboardPage';
import { AdminDashboardPage } from '../pages/dashboard/AdminDashboardPage';
import { AdminComplaintsPage } from '../pages/admin/AdminComplaintsPage';
import { RevenueReportPage } from '../pages/reports/RevenueReportPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      // Customer Routes
      { path: 'my/bookings', element: <MyBookingsPage /> },
      { path: 'my/bookings/:id', element: <BookingDetailPage /> },
      { path: 'complaints/me', element: <MyComplaintsPage /> },
      // Owner Routes
      { path: 'owner/bookings', element: <OwnerBookingsPage /> },
      { path: 'owner/dashboard', element: <OwnerDashboardPage /> },
      // Admin Routes
      { path: 'admin/dashboard', element: <AdminDashboardPage /> },
      { path: 'admin/complaints', element: <AdminComplaintsPage /> },
      // Revenue Reports (shared for Owner and Admin)
      { path: 'reports/revenue', element: <RevenueReportPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
