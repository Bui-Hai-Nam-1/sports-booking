
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
    <section className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Đăng ký tài khoản</h1>
        <p>Tạo tài khoản Sports Booking</p>

        {error && <p className="auth-error">{error}</p>}

        <label htmlFor="fullName">Họ và tên</label>
        <input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={100}
          required
        />

        <label htmlFor="registerEmail">Email</label>
        <input
          id="registerEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="registerPassword">Mật khẩu</label>
        <input
          id="registerPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>

        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </section>
  );
}
