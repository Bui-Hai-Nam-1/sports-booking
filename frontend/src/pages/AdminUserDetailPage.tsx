
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import axios from 'axios';
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
    const fetchUser = async () => {
      try {
        const response = await api.get<AdminUser>(`/users/${id}`);
        setUser(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(
            err.response?.data?.message ||
            'Không thể tải thông tin người dùng.',
          );
        } else {
          setError('Có lỗi xảy ra.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void fetchUser();
    } else {
      setError('Không tìm thấy mã người dùng.');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return <p className="admin-detail-loading">Đang tải thông tin...</p>;
  }

  if (error || !user) {
    return (
      <div className="admin-user-detail">
        <p className="admin-message error">
          {error || 'Không tìm thấy người dùng.'}
        </p>
        <Link to="/admin/users">Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="admin-user-detail">
      <Link to="/admin/users" className="admin-back-link">
        ← Quay lại danh sách
      </Link>

      <h1>Chi tiết người dùng</h1>

      <div className="admin-detail-card">
        <div className="admin-user-heading">
            <div className="admin-detail-avatar">
                {user.fullName.charAt(0).toUpperCase()}
            </div>

            <div className="admin-user-heading-info">
                <h2>{user.fullName}</h2>
                <p className="admin-detail-email">{user.email}</p>
            </div>
        </div>

        <div className="admin-detail-information">
          <div>
            <span>Mã người dùng</span>
            <strong>{user.id}</strong>
          </div>

          <div>
            <span>Họ và tên</span>
            <strong>{user.fullName}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>

          <div>
            <span>Vai trò</span>
            <strong>{user.role}</strong>
          </div>

          <div>
            <span>Trạng thái</span>
            <strong className={user.isActive ? 'detail-active' : 'detail-inactive'}>
              {user.isActive ? 'Hoạt động' : 'Đã khóa'}
            </strong>
          </div>

          <div>
            <span>Ngày tạo</span>
            <strong>
              {new Date(user.createdAt).toLocaleString('vi-VN')}
            </strong>
          </div>

          <div>
            <span>Cập nhật gần nhất</span>
            <strong>
              {new Date(user.updatedAt).toLocaleString('vi-VN')}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
