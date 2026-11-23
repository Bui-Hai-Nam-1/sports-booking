
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { logout } from '../features/auth/authSlice';

export function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector((state: RootState) => state.auth.user);

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register';

  const isAdminPage = location.pathname.startsWith('/admin');

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      {!isAuthPage && !isAdminPage && (
        <header className="site-header">
          <Link className="brand" to="/">
            Sports Booking
          </Link>

          <nav aria-label="Điều hướng chính">
            <Link to="/">Trang chủ</Link>

            {user ? (
              <>
                <Link to="/profile">Hồ sơ</Link>
                <span>{user.fullName} ({user.role})</span>
                <button type="button" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Đăng nhập</Link>
                <Link to="/register">Đăng ký</Link>
              </>
            )}
          </nav>
        </header>
      )}

      <main className={isAuthPage || isAdminPage ? '' : 'container'}>
        <Outlet />
      </main>

      {!isAuthPage && !isAdminPage && (
        <footer className="site-footer">
          © {new Date().getFullYear()} Sports Booking
        </footer>
      )}
    </div>
  );
}
