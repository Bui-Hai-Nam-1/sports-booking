
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import type { AppDispatch } from '../store';
import api from '../lib/api';
import { loginSuccess } from '../features/auth/authSlice';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: 'CUSTOMER' | 'OWNER' | 'ADMIN';
  };
}

export function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      dispatch(loginSuccess({
        accessToken: response.data.accessToken,
        user: response.data.user,
        }));

        const role = response.data.user.role;

        if (role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
        } else if (role === 'OWNER') {
        navigate('/owner/dashboard', { replace: true });
        } else {
        navigate('/', { replace: true });
        }
    } catch {
      setError('Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="sb-auth-page">
      <section className="sb-auth-visual">
        <div className="sb-auth-brand">
          {/* Giữ phần nhận diện thương hiệu hiện tại của dự án */}
          <span className="sb-auth-brand-name">SPORTS BOOKING</span>
        </div>

        <div className="sb-auth-visual-content">
          <span className="sb-auth-eyebrow">
            THE GAME STARTS HERE
          </span>

          <h1>
            Sân chơi của bạn.
            <br />
            <span>Trận đấu của bạn.</span>
          </h1>

          <p>
            Khám phá sân thể thao, đặt lịch dễ dàng
            và sẵn sàng cho những trận đấu tuyệt vời.
          </p>

          <div className="sb-auth-photo-grid">
            <div className="sb-auth-photo sb-auth-photo-football">
              <span>BÓNG ĐÁ</span>
            </div>
            <div className="sb-auth-photo sb-auth-photo-badminton">
              <span>CẦU LÔNG</span>
            </div>
            <div className="sb-auth-photo sb-auth-photo-tennis">
              <span>TENNIS</span>
            </div>
          </div>
        </div>

        <div className="sb-auth-visual-footer">
          <span>SPORTS BOOKING</span>
          <span>ONE PLATFORM. EVERY SPORT.</span>
        </div>
      </section>

      <section className="sb-auth-form-side">
        <div className="sb-auth-form-wrap">
          <div className="sb-auth-mobile-brand">
            SPORTS BOOKING
          </div>

          <div className="sb-auth-heading">
            <span className="sb-auth-eyebrow sb-auth-green">
              CHÀO MỪNG TRỞ LẠI
            </span>
            <h2>Đăng nhập</h2>
            <p>
              Đăng nhập để tiếp tục trải nghiệm Sports Booking.
            </p>
          </div>

          <form className="sb-auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="sb-auth-error" role="alert">
                {error}
              </div>
            )}

            <div className="sb-auth-field">
              <label htmlFor="email">Địa chỉ email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="sb-auth-field">
              <div className="sb-auth-label-row">
                <label htmlFor="password">Mật khẩu</label>

                <Link to="/forgot-password">
                    Quên mật khẩu?
                </Link>
              </div>

              <div className="sb-auth-password">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="sb-auth-show-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="sb-auth-submit"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="sb-auth-switch">
            Chưa có tài khoản?
            <Link to="/register"> Tạo tài khoản ngay</Link>
          </div>

          <div className="sb-auth-bottom-note">
            Bằng việc đăng nhập, bạn tiếp tục sử dụng nền tảng
            Sports Booking.
          </div>
        </div>
      </section>
    </main>
  );
}
