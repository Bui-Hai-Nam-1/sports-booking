
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import api from '../lib/api';
import type { UserRole } from '../features/auth/authSlice';

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function AdminUserDetailPage() {
  const { id } = useParams();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get<AdminUser>(`/users/${id}`);

        if (!cancelled) {
          setUser(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          if (axios.isAxiosError(err)) {
            setError(
              err.response?.data?.message ||
              'Không thể tải thông tin người dùng.',
            );
          } else {
            setError('Có lỗi xảy ra. Vui lòng thử lại.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (id) {
      void fetchUser();
    } else {
      setError('Không tìm thấy mã người dùng.');
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  const formatDate = (value: string) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 'Không có dữ liệu'
      : date.toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="sb-detail-loading">
        <span className="sb-users-spinner" />
        <p>Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="sb-detail-page">
        <Link to="/admin/users" className="sb-detail-back">
          ← Quay lại danh sách
        </Link>

        <div className="sb-detail-error">
          <span>!</span>
          <h2>Không thể tải thông tin</h2>
          <p>{error || 'Không tìm thấy người dùng.'}</p>
          <Link to="/admin/users">Trở về danh sách người dùng</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-detail-page">
      <Link to="/admin/users" className="sb-detail-back">
        ← Quay lại danh sách
      </Link>

      <div className="sb-detail-heading">
        <div>
          <span className="sb-page-eyebrow">QUẢN TRỊ HỆ THỐNG</span>
          <h1>Chi tiết người dùng</h1>
          <p>Xem thông tin tài khoản và trạng thái hoạt động.</p>
        </div>

        <span
          className={`sb-users-status ${
            user.isActive ? 'active' : 'inactive'
          }`}
        >
          <span />
          {user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
        </span>
      </div>

      <section className="sb-detail-profile-card">
        <div className="sb-detail-profile-main">
          <div className="sb-detail-avatar">
            {user.fullName.charAt(0).toUpperCase()}
          </div>

          <div className="sb-detail-profile-info">
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <span className="sb-detail-role">{user.role}</span>
          </div>
        </div>

        <div className="sb-detail-profile-caption">
          <span className="sb-detail-caption-icon">✓</span>
          <div>
            <strong>Thông tin tài khoản</strong>
            <p>Dữ liệu được lấy từ hệ thống Sports Booking.</p>
          </div>
        </div>
      </section>

      <section className="sb-detail-information-card">
        <div className="sb-detail-section-heading">
          <div>
            <h2>Thông tin chi tiết</h2>
            <p>Các thông tin cơ bản của tài khoản người dùng.</p>
          </div>
        </div>

        <div className="sb-detail-information-grid">
          <div className="sb-detail-field full">
            <span>Mã người dùng</span>
            <strong className="sb-detail-id">{user.id}</strong>
          </div>

          <div className="sb-detail-field">
            <span>Họ và tên</span>
            <strong>{user.fullName}</strong>
          </div>

          <div className="sb-detail-field">
            <span>Địa chỉ email</span>
            <strong>{user.email}</strong>
          </div>

          <div className="sb-detail-field">
            <span>Vai trò tài khoản</span>
            <strong>{user.role}</strong>
          </div>

          <div className="sb-detail-field">
            <span>Trạng thái tài khoản</span>
            <strong
              className={user.isActive ? 'sb-detail-active' : 'sb-detail-inactive'}
            >
              {user.isActive ? 'Hoạt động' : 'Đã khóa'}
            </strong>
          </div>

          <div className="sb-detail-field">
            <span>Ngày tạo tài khoản</span>
            <strong>{formatDate(user.createdAt)}</strong>
          </div>

          <div className="sb-detail-field">
            <span>Cập nhật gần nhất</span>
            <strong>{formatDate(user.updatedAt)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
