
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { ReactNode } from 'react';
import type { RootState } from '../store';
import type { UserRole } from '../features/auth/authSlice';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: ReactNode;
}

export function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const { accessToken, user } = useSelector(
    (state: RootState) => state.auth,
  );

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
