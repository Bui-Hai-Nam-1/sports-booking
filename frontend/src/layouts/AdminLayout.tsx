
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { logout } from '../features/auth/authSlice';

export function AdminLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const user = useSelector((state: RootState) => state.auth.user);

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <div className="sb-admin">
      <aside className="sb-admin-sidebar">
        <NavLink to="/admin/dashboard" className="sb-admin-brand">
          <span className="sb-admin-brand-icon">S</span>
          <span>
            <strong>SPORTS BOOKING</strong>
            <small>Management System</small>
          </span>
        </NavLink>

        <div className="sb-admin-menu-label">MENU</div>

        <nav className="sb-admin-nav">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `sb-admin-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span>▦</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/users"
            end
            className={({ isActive }) =>
              `sb-admin-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span>♙</span>
            Quản lý người dùng
          </NavLink>
        </nav>

        <div className="sb-admin-sidebar-bottom">
          <div className="sb-admin-user">
            <div className="sb-admin-avatar">
              {user?.fullName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="sb-admin-user-info">
              <strong>{user?.fullName || 'Administrator'}</strong>
              <small>Quản trị viên</small>
            </div>
          </div>

          <button
            type="button"
            className="sb-admin-logout"
            onClick={handleLogout}
          >
            ↪ Đăng xuất
          </button>
        </div>
      </aside>

      <div className="sb-admin-main">
        <header className="sb-admin-topbar">
          <div>
            <span className="sb-admin-topbar-label">SPORTS BOOKING</span>
            <h2>Khu vực quản trị</h2>
          </div>

          <div className="sb-admin-topbar-account">
            <span className="sb-admin-status-dot" />
            <span>{user?.fullName || 'Admin'}</span>
          </div>
        </header>

        <main className="sb-admin-content">
          <Outlet />
        </main>

        <footer className="sb-admin-footer">
          © {new Date().getFullYear()} Sports Booking. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
