
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

      navigate('/');
    } catch (err: unknown) {
      setError('Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Đăng nhập</h1>
        <p>Đăng nhập vào tài khoản Sports Booking</p>

        {error && <p className="auth-error">{error}</p>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Nhập email"
          required
        />

        <label htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </form>
    </section>
  );
}
