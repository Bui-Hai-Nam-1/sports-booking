
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword.length > 64) {
      setError('Mật khẩu không được vượt quá 64 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      navigate('/login', {
        replace: true,
        state: {
          message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.',
        },
      });
    } catch {
      setError(
        'Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="sb-auth-page">
      <section className="sb-auth-visual">
        <div className="sb-auth-brand">
          <span className="sb-auth-brand-name">
            SPORTS BOOKING
          </span>
        </div>

        <div className="sb-auth-visual-content">
          <span className="sb-auth-eyebrow">
            SECURE YOUR ACCOUNT
          </span>

          <h1>
            Một khởi đầu mới.
            <br />
            <span>Sẵn sàng trở lại sân.</span>
          </h1>

          <p>
            Tạo mật khẩu mới để bảo vệ tài khoản
            và tiếp tục trải nghiệm Sports Booking.
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
              CREATE NEW PASSWORD
            </span>

            <h2>Đặt lại mật khẩu</h2>

            <p>
              Hãy tạo mật khẩu mới có ít nhất 8 ký tự.
            </p>
          </div>

          <form
            className="sb-auth-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="sb-auth-error" role="alert">
                {error}
              </div>
            )}

            {!token && (
              <div className="sb-auth-error" role="alert">
                Liên kết đặt lại mật khẩu không hợp lệ.
              </div>
            )}

            <div className="sb-auth-field">
              <label htmlFor="new-password">
                Mật khẩu mới
              </label>

              <div className="sb-auth-password">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={64}
                  required
                />

                <button
                  type="button"
                  className="sb-auth-show-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="sb-auth-field">
              <label htmlFor="confirm-password">
                Xác nhận mật khẩu mới
              </label>

              <div className="sb-auth-password">
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={64}
                  required
                />

                <button
                  type="button"
                  className="sb-auth-show-password"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="sb-auth-submit"
              disabled={loading || !token}
            >
              {loading ? 'Đang cập nhật...' : 'Xác nhận mật khẩu mới'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="sb-auth-switch">
            <Link to="/login">Quay lại đăng nhập</Link>
          </div>

          <div className="sb-auth-bottom-note">
            Vì lý do bảo mật, liên kết chỉ sử dụng được một lần
            và hết hạn sau 15 phút.
          </div>
        </div>
      </section>
    </main>
  );
}
