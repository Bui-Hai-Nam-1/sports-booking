import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { BookingSearchPage } from '../pages/BookingSearchPage';
import { HomePage } from '../pages/HomePage';
import { MyBookingsPage } from '../pages/MyBookingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'bookings', element: <BookingSearchPage /> },
      { path: 'bookings/my', element: <MyBookingsPage initialTab="mine" /> },
      { path: 'bookings/manage', element: <MyBookingsPage initialTab="owner" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
