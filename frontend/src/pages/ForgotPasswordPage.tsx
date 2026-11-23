
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post(
        '/auth/forgot-password',
        { email },
      );

      setSuccess(response.data.message);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể gửi yêu cầu. Vui lòng thử lại.';

      setError(message);
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
            YOUR ACCOUNT. YOUR GAME.
          </span>

          <h1>
            Tiếp tục hành trình.
            <br />
            <span>Đừng bỏ lỡ trận đấu.</span>
          </h1>

          <p>
            Khôi phục quyền truy cập tài khoản để tiếp tục
            khám phá và đặt sân thể thao yêu thích.
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
              ACCOUNT RECOVERY
            </span>

            <h2>Quên mật khẩu?</h2>

            <p>
              Nhập email đã đăng ký. Chúng tôi sẽ gửi
              liên kết giúp bạn đặt lại mật khẩu.
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

            {success && (
              <div className="sb-auth-success" role="status">
                {success}
              </div>
            )}

            <div className="sb-auth-field">
              <label htmlFor="forgot-email">
                Địa chỉ email
              </label>

              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                required
              />
            </div>

            <button
              type="submit"
              className="sb-auth-submit"
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="sb-auth-switch">
            Nhớ lại mật khẩu?
            <Link to="/login"> Quay lại đăng nhập</Link>
          </div>

          <div className="sb-auth-bottom-note">
            Liên kết đặt lại mật khẩu chỉ có hiệu lực
            trong 15 phút.
          </div>
        </div>
      </section>
    </main>
  );
}
