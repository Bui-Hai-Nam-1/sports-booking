
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
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await api.get('/auth/profile');

        if (cancelled) return;

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
        if (!cancelled) {
          setProfileError('Không thể tải thông tin cá nhân.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  async function handleUpdateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');

    if (!form.fullName.trim() || !form.email.trim()) {
      setProfileError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    setSavingProfile(true);

    try {
      const response = await api.patch('/auth/profile', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
      });

      const profile = response.data.user;

      const updatedUser: AuthUser = {
        id: profile.id ?? user?.id ?? '',
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role ?? user?.role ?? 'CUSTOMER',
      };

      dispatch(updateUser(updatedUser));

      setForm({
        fullName: updatedUser.fullName,
        email: updatedUser.email,
      });

      setProfileMessage('Thông tin cá nhân đã được cập nhật.');
    } catch {
      setProfileError(
        'Cập nhật thất bại. Email có thể đã được sử dụng hoặc thông tin không hợp lệ.',
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setSavingPassword(true);

    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Mật khẩu đã được thay đổi thành công.');
    } catch {
      setPasswordError(
        'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.',
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="sb-profile-loading">
        <div className="sb-profile-spinner" />
        <p>Đang tải hồ sơ của bạn...</p>
      </div>
    );
  }

  const avatarLetter =
    form.fullName.trim().charAt(0).toUpperCase() || 'U';

  const roleLabel: Record<string, string> = {
    CUSTOMER: 'Khách hàng',
    OWNER: 'Chủ sân',
    ADMIN: 'Quản trị viên',
  };

  return (
    <div className="sb-profile-page">
      <div className="sb-profile-top-heading">
        <div>
          <span className="sb-profile-eyebrow">
            SPORTS BOOKING / ACCOUNT
          </span>
          <h1>Hồ sơ cá nhân</h1>
          <p>Quản lý thông tin và bảo mật tài khoản của bạn.</p>
        </div>
      </div>

      <section className="sb-profile-hero">
        <div className="sb-profile-hero-decoration" />
        <div className="sb-profile-hero-main">
          <div className="sb-profile-avatar">
            {avatarLetter}
            <span className="sb-profile-avatar-online" />
          </div>

          <div className="sb-profile-hero-info">
            <span className="sb-profile-hero-label">
              TÀI KHOẢN CỦA BẠN
            </span>
            <h2>{form.fullName || 'Người dùng'}</h2>
            <p>{form.email}</p>
            <div className="sb-profile-hero-tags">
              <span className="sb-profile-role-tag">
                {roleLabel[user?.role ?? 'CUSTOMER'] ?? user?.role}
              </span>
              <span className="sb-profile-active-tag">
                <span />
                Đang hoạt động
              </span>
            </div>
          </div>
        </div>

        <div className="sb-profile-hero-side">
          <span>SPORTS BOOKING</span>
          <strong>YOUR ACCOUNT</strong>
          <small>Thông tin thành viên</small>
        </div>
      </section>

      <div className="sb-profile-layout">
        <aside className="sb-profile-sidebar">
          <div className="sb-profile-sidebar-title">
            QUẢN LÝ TÀI KHOẢN
          </div>

          <a className="sb-profile-nav-item active" href="#personal-info">
            <span className="sb-profile-nav-icon">♙</span>
            <span>
              <strong>Thông tin cá nhân</strong>
              <small>Họ tên và email</small>
            </span>
          </a>

          <a className="sb-profile-nav-item" href="#security">
            <span className="sb-profile-nav-icon">♢</span>
            <span>
              <strong>Bảo mật tài khoản</strong>
              <small>Thay đổi mật khẩu</small>
            </span>
          </a>

          <div className="sb-profile-sidebar-note">
            <span>✦</span>
            <strong>Bảo vệ tài khoản</strong>
            <p>
              Không chia sẻ mật khẩu của bạn với người khác.
            </p>
          </div>
        </aside>

        <main className="sb-profile-main">
          <section
            className="sb-profile-card"
            id="personal-info"
          >
            <div className="sb-profile-card-heading">
              <div className="sb-profile-card-icon">
                <span>♙</span>
              </div>
              <div>
                <h2>Thông tin cá nhân</h2>
                <p>
                  Cập nhật thông tin được sử dụng trong tài khoản.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="sb-profile-form-grid">
                <div className="sb-profile-field">
                  <label htmlFor="profile-fullname">
                    Họ và tên
                  </label>
                  <input
                    id="profile-fullname"
                    type="text"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    placeholder="Nhập họ và tên"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="sb-profile-field">
                  <label htmlFor="profile-email">
                    Địa chỉ email
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="Nhập địa chỉ email"
                    required
                  />
                </div>

                <div className="sb-profile-field">
                  <label>Vai trò tài khoản</label>
                  <div className="sb-profile-readonly">
                    {roleLabel[user?.role ?? 'CUSTOMER'] ?? user?.role}
                    <span>Không thể tự thay đổi</span>
                  </div>
                </div>

                <div className="sb-profile-field">
                  <label>Trạng thái</label>
                  <div className="sb-profile-readonly">
                    <span className="sb-profile-inline-status" />
                    Đang hoạt động
                  </div>
                </div>
              </div>

              {profileMessage && (
                <div className="sb-profile-alert success">
                  <span>✓</span>
                  {profileMessage}
                </div>
              )}

              {profileError && (
                <div className="sb-profile-alert error">
                  <span>!</span>
                  {profileError}
                </div>
              )}

              <div className="sb-profile-form-footer">
                <p>Kiểm tra thông tin trước khi lưu thay đổi.</p>
                <button
                  type="submit"
                  className="sb-profile-button"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  {!savingProfile && <span>→</span>}
                </button>
              </div>
            </form>
          </section>

          <section
            className="sb-profile-card"
            id="security"
          >
            <div className="sb-profile-card-heading">
              <div className="sb-profile-card-icon security">
                <span>♢</span>
              </div>
              <div>
                <h2>Bảo mật tài khoản</h2>
                <p>
                  Đặt mật khẩu mới để bảo vệ tài khoản của bạn.
                </p>
              </div>
            </div>

            <div className="sb-profile-security-note">
              <span>ⓘ</span>
              <p>
                Mật khẩu mới nên có ít nhất 8 ký tự. Hãy chọn mật
                khẩu mà bạn chưa sử dụng cho tài khoản khác.
              </p>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="sb-profile-field">
                <label htmlFor="current-password">
                  Mật khẩu hiện tại
                </label>
                <div className="sb-profile-password-wrap">
                  <input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) =>
                      setCurrentPassword(e.target.value)
                    }
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                  >
                    {showCurrent ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>

              <div className="sb-profile-form-grid">
                <div className="sb-profile-field">
                  <label htmlFor="new-password">
                    Mật khẩu mới
                  </label>
                  <div className="sb-profile-password-wrap">
                    <input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                      placeholder="Ít nhất 8 ký tự"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div className="sb-profile-field">
                  <label htmlFor="confirm-password">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="sb-profile-password-wrap">
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Nhập lại mật khẩu mới"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
              </div>

              {passwordMessage && (
                <div className="sb-profile-alert success">
                  <span>✓</span>
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div className="sb-profile-alert error">
                  <span>!</span>
                  {passwordError}
                </div>
              )}

              <div className="sb-profile-form-footer">
                <p>Không chia sẻ mật khẩu với bất kỳ ai.</p>
                <button
                  type="submit"
                  className="sb-profile-button dark"
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  {!savingPassword && <span>→</span>}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
