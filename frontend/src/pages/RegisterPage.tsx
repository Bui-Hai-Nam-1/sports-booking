
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
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
      await api.post('/auth/register', {
        fullName,
        email,
        password,
      });

      navigate('/login', {
        state: { message: 'Đăng ký thành công. Hãy đăng nhập!' },
      });
    } catch {
      setError('Đăng ký thất bại. Email có thể đã được sử dụng.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="sb-auth-page">
      <section className="sb-auth-visual">
        <div className="sb-auth-brand">
          <span className="sb-auth-brand-name">SPORTS BOOKING</span>
        </div>

        <div className="sb-auth-visual-content">
          <span className="sb-auth-eyebrow">
            FIND YOUR GAME
          </span>

          <h1>
            Bắt đầu hành trình.
            <br />
            <span>Chinh phục sân chơi.</span>
          </h1>

          <p>
            Tạo tài khoản để khám phá các sân thể thao
            và kết nối với những người cùng đam mê.
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
              THAM GIA CÙNG CHÚNG TÔI
            </span>
            <h2>Tạo tài khoản</h2>
            <p>
              Điền thông tin bên dưới để bắt đầu.
            </p>
          </div>

          <form className="sb-auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="sb-auth-error" role="alert">
                {error}
              </div>
            )}

            <div className="sb-auth-field">
              <label htmlFor="fullName">Họ và tên</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                maxLength={100}
                required
              />
            </div>

            <div className="sb-auth-field">
              <label htmlFor="registerEmail">Địa chỉ email</label>
              <input
                id="registerEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="sb-auth-field">
              <label htmlFor="registerPassword">Mật khẩu</label>

              <div className="sb-auth-password">
                <input
                  id="registerPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
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
              {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="sb-auth-switch">
            Đã có tài khoản?
            <Link to="/login"> Đăng nhập</Link>
          </div>

          <div className="sb-auth-bottom-note">
            Tham gia cộng đồng Sports Booking và sẵn sàng
            cho trận đấu tiếp theo.
          </div>
        </div>
      </section>
    </main>
  );
}
