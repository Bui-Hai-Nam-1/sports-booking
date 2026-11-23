
import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import api from '../lib/api';
import type { UserRole } from '../features/auth/authSlice';
import { Link } from 'react-router-dom';
interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiMessage {
  message: string;
  user: AdminUser;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Lấy danh sách người dùng
  const fetchUsers = async (searchKeyword = '') => {
    setLoading(true);
    setError('');

    try {
      const response = searchKeyword.trim()
        ? await api.get<AdminUser[]>('/users/search', {
            params: { keyword: searchKeyword.trim() },
          })
        : await api.get<AdminUser[]>('/users');

      setUsers(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  // Tìm kiếm người dùng
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    void fetchUsers(keyword);
  };

  // Đổi vai trò
  const handleRoleChange = async (
    userId: string,
    role: 'CUSTOMER' | 'OWNER',
  ) => {
    setUpdatingId(userId);
    setError('');
    setMessage('');

    try {
      const response = await api.patch<ApiMessage>(
        `/users/${userId}/role`,
        { role },
      );

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === userId
            ? { ...user, ...response.data.user }
            : user,
        ),
      );

      setMessage(response.data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  // Khóa hoặc mở khóa tài khoản
  const handleStatusChange = async (user: AdminUser) => {
    const nextStatus = !user.isActive;

    const confirmed = window.confirm(
      nextStatus
        ? `Bạn có muốn mở khóa tài khoản ${user.email}?`
        : `Bạn có muốn khóa tài khoản ${user.email}?`,
    );

    if (!confirmed) return;

    setUpdatingId(user.id);
    setError('');
    setMessage('');

    try {
      const response = await api.patch<ApiMessage>(
        `/users/${user.id}/status`,
        { isActive: nextStatus },
      );

      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === user.id
            ? { ...item, ...response.data.user }
            : item,
        ),
      );

      setMessage(response.data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  function getErrorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return (
        err.response?.data?.message ||
        'Có lỗi xảy ra. Vui lòng thử lại.'
      );
    }

    return 'Không thể kết nối đến máy chủ.';
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-header">
        <div>
          <h1>Quản lý người dùng</h1>
          <p>Quản lý tài khoản và phân quyền người dùng.</p>
        </div>

        <div className="admin-users-count">
          Tổng số: <strong>{users.length}</strong> người dùng
        </div>
      </div>

      <form className="admin-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Nhập tên hoặc email người dùng..."
        />

        <button type="submit" disabled={loading}>
          Tìm kiếm
        </button>

        <button
          type="button"
          className="admin-reset-button"
          onClick={() => {
            setKeyword('');
            setMessage('');
            void fetchUsers();
          }}
        >
          Làm mới
        </button>
      </form>

      {message && (
        <div className="admin-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="admin-message error">
          {error}
        </div>
      )}

      {loading ? (
        <p className="admin-loading">Đang tải danh sách người dùng...</p>
      ) : users.length === 0 ? (
        <p className="admin-empty">Không tìm thấy người dùng.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>

                  <td>
                    <select
                      value={user.role}
                      disabled={updatingId === user.id}
                      onChange={(event) =>
                        handleRoleChange(
                          user.id,
                          event.target.value as 'CUSTOMER' | 'OWNER',
                        )
                      }
                    >
                      {user.role === 'ADMIN' && (
                        <option value="ADMIN" disabled>
                          ADMIN
                        </option>
                      )}

                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="OWNER">OWNER</option>
                    </select>
                  </td>

                  <td>
                    <span
                      className={
                        user.isActive
                          ? 'admin-status active'
                          : 'admin-status inactive'
                      }
                    >
                      {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>

                  <td>
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>

                  <td>
  <div className="admin-action-buttons">
    <button
      type="button"
      className={
        user.isActive
          ? 'admin-lock-button'
          : 'admin-unlock-button'
      }
      disabled={updatingId === user.id}
      onClick={() => handleStatusChange(user)}
    >
      {updatingId === user.id
        ? 'Đang xử lý...'
        : user.isActive
          ? 'Khóa'
          : 'Mở khóa'}
    </button>

    <Link
      to={`/admin/users/${user.id}`}
      className="admin-detail-link"
      title="Xem chi tiết"
      aria-label={`Xem chi tiết ${user.fullName}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </Link>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
