
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { FormEvent } from 'react';
import api from '../lib/api';
import type { RootState, AppDispatch } from '../store';
import { updateUser } from '../features/auth/authSlice';
import type { AuthUser } from '../features/auth/authSlice';

interface ProfileForm {
  fullName: string;
  email: string;
}

export function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const [form, setForm] = useState<ProfileForm>({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Lấy thông tin mới nhất từ backend
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get('/auth/profile');

        const profile = response.data.user;

        const updatedUser: AuthUser = {
            id: profile.id,
            fullName: profile.fullName,
            email: profile.email,
            role: profile.role,
        };

        setForm({
            fullName: updatedUser.fullName,
            email: updatedUser.email,
        });

        dispatch(updateUser(updatedUser));
      } catch {
        setError('Không thể tải thông tin cá nhân.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Cập nhật thông tin cá nhân
  async function handleUpdateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      const response = await api.patch('/auth/profile', form);

      const updatedUser: AuthUser = {
        ...user!,
        ...response.data.user,
      };

      dispatch(updateUser(updatedUser));
      setMessage('Cập nhật thông tin thành công!');
    } catch (err: unknown) {
      setError('Cập nhật thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSaving(false);
    }
  }

  // Đổi mật khẩu
  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setMessage('Đổi mật khẩu thành công!');
    } catch {
      setError('Đổi mật khẩu thất bại. Hãy kiểm tra mật khẩu hiện tại.');
    }
  }

  if (loading) {
    return <p>Đang tải thông tin...</p>;
  }

  return (
    <section className="profile-page">
      <h1>Thông tin cá nhân</h1>

      <p>
        Vai trò: <strong>{user?.role}</strong>
      </p>

      <form onSubmit={handleUpdateProfile}>
        <h2>Cập nhật hồ sơ</h2>

        <label>Họ và tên</label>
        <input
          value={form.fullName}
          onChange={(e) =>
            setForm({ ...form, fullName: e.target.value })
          }
          required
        />

        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          required
        />

        <button type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>

      <hr />

      <form onSubmit={handleChangePassword}>
        <h2>Đổi mật khẩu</h2>

        <label>Mật khẩu hiện tại</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <label>Mật khẩu mới</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
        />

        <button type="submit">
          Đổi mật khẩu
        </button>
      </form>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </section>
  );
}
