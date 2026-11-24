import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { switchDemoRole } from '../store/authSlice';
import { USER_ROLE_LABELS } from '../types';

export function AppLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);

  const role = user?.role || 'CUSTOMER';

  function handleRoleChange(selectedKey: string) {
    dispatch(switchDemoRole(selectedKey));
  }

  // Active role key detection
  const activeProfileKey =
    role === 'ADMIN'
      ? 'ADMIN'
      : role === 'OWNER'
        ? user?.id === 'owner-demo-2'
          ? 'OWNER_2'
          : 'OWNER_1'
        : 'CUSTOMER';

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span>⚽</span> Sports Booking
        </Link>

        {/* Dynamic Navigation according to Role */}
        <nav aria-label="Điều hướng chính">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Trang chủ
          </Link>

          {role === 'CUSTOMER' && (
            <>
              <Link
                to="/my/bookings"
                className={location.pathname.startsWith('/my/bookings') ? 'active' : ''}
              >
                Lịch sử đặt sân
              </Link>
              <Link
                to="/complaints/me"
                className={location.pathname === '/complaints/me' ? 'active' : ''}
              >
                Khiếu nại của tôi
              </Link>
            </>
          )}

          {role === 'OWNER' && (
            <>
              <Link
                to="/owner/dashboard"
                className={location.pathname === '/owner/dashboard' ? 'active' : ''}
              >
                Dashboard Chủ Sân
              </Link>
              <Link
                to="/owner/bookings"
                className={location.pathname === '/owner/bookings' ? 'active' : ''}
              >
                Quản lý đơn
              </Link>
              <Link
                to="/reports/revenue"
                className={location.pathname === '/reports/revenue' ? 'active' : ''}
              >
                Doanh thu
              </Link>
            </>
          )}

          {role === 'ADMIN' && (
            <>
              <Link
                to="/admin/dashboard"
                className={location.pathname === '/admin/dashboard' ? 'active' : ''}
              >
                Dashboard Admin
              </Link>
              <Link
                to="/admin/complaints"
                className={location.pathname === '/admin/complaints' ? 'active' : ''}
              >
                Xử lý khiếu nại
              </Link>
              <Link
                to="/reports/revenue"
                className={location.pathname === '/reports/revenue' ? 'active' : ''}
              >
                Doanh thu hệ thống
              </Link>
            </>
          )}
        </nav>

        {/* Demo Role Switcher Header Tool */}
        <div className="header-user-panel">
          <div className="role-switcher">
            <span className="text-muted text-sm">Vai trò thử nghiệm:</span>
            <select
              className="form-select"
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              value={activeProfileKey}
              onChange={(e) => handleRoleChange(e.target.value)}
              aria-label="Chọn vai trò người dùng"
            >
              <option value="CUSTOMER">Khách hàng (Nguyễn Văn Khách)</option>
              <option value="OWNER_1">Chủ sân 1 (Trần Văn Chủ Sân A)</option>
              <option value="OWNER_2">Chủ sân 2 (Lê Văn Chủ Sân B)</option>
              <option value="ADMIN">Quản trị viên (Admin)</option>
            </select>
          </div>
          <span className="role-badge-pill">{USER_ROLE_LABELS[role]}</span>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer className="site-footer">
        © {new Date().getFullYear()} Sports Booking – Phân hệ Thành viên 4: Reviews, Dashboard, Reports & Integration
      </footer>
    </div>
  );
}
