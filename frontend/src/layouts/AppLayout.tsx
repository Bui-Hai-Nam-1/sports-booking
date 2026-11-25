import { Outlet, Link } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">Sports Booking</Link>
        <nav aria-label="Điều hướng chính">
          <Link to="/">Trang chủ</Link>
          <Link to="/bookings">Tìm sân</Link>
          <Link to="/bookings/my">Đơn đặt</Link>
          <a href="#login">Đăng nhập</a>
        </nav>
      </header>
      <main className="container"><Outlet /></main>
      <footer className="site-footer">© {new Date().getFullYear()} Sports Booking</footer>
    </div>
  );
}
