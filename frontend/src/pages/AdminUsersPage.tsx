
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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

interface ApiMessage {
  message: string;
  user: AdminUser;
}

type RoleFilter = 'ALL' | UserRole;
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole =
        roleFilter === 'ALL' || user.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive);

      return matchesRole && matchesStatus;
    });
  }, [users, roleFilter, statusFilter]);

  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    void fetchUsers(keyword);
  };

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
      void fetchUsers(keyword);
    } finally {
      setUpdatingId(null);
    }
  };

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
      void fetchUsers(keyword);
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

  function resetFilters() {
    setKeyword('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setMessage('');
    void fetchUsers();
  }

  return (
    <div className="sb-users-page">
      <div className="sb-users-heading">
        <div>
          <span className="sb-page-eyebrow">QUẢN TRỊ HỆ THỐNG</span>
          <h1>Quản lý người dùng</h1>
          <p>Quản lý tài khoản, vai trò và trạng thái người dùng.</p>
        </div>

        <div className="sb-users-heading-count">
          <span>Tổng người dùng</span>
          <strong>{users.length}</strong>
        </div>
      </div>

      <div className="sb-users-stats">
        <div className="sb-users-stat-card">
          <div className="sb-users-stat-icon">♙</div>
          <div>
            <span>Tổng tài khoản</span>
            <strong>{users.length}</strong>
          </div>
        </div>

        <div className="sb-users-stat-card">
          <div className="sb-users-stat-icon green">✓</div>
          <div>
            <span>Đang hoạt động</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="sb-users-stat-card">
          <div className="sb-users-stat-icon orange">!</div>
          <div>
            <span>Đã khóa</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      <section className="sb-users-panel">
        <div className="sb-users-panel-heading">
          <div>
            <h2>Danh sách tài khoản</h2>
            <p>Tìm kiếm và quản lý tài khoản trong hệ thống.</p>
          </div>
          <span className="sb-users-result-count">
            {filteredUsers.length} kết quả
          </span>
        </div>

        <form className="sb-users-toolbar" onSubmit={handleSearch}>
          <div className="sb-users-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              aria-label="Tìm theo tên hoặc email"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as RoleFilter)
            }
            aria-label="Lọc theo vai trò"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="CUSTOMER">Customer</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            aria-label="Lọc theo trạng thái"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đã khóa</option>
          </select>

          <button
            type="submit"
            className="sb-users-search-button"
            disabled={loading}
          >
            Tìm kiếm
          </button>

          <button
            type="button"
            className="sb-users-reset-button"
            onClick={resetFilters}
            disabled={loading}
          >
            Làm mới
          </button>
        </form>

        {message && (
          <div className="sb-users-alert success" role="status">
            <span>✓</span> {message}
          </div>
        )}

        {error && (
          <div className="sb-users-alert error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="sb-users-empty">
            <span className="sb-users-spinner" />
            <p>Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="sb-users-empty">
            <span className="sb-users-empty-icon">⌕</span>
            <strong>Không tìm thấy người dùng</strong>
            <p>Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
            <button type="button" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="sb-users-table-wrap">
            <table className="sb-users-table">
              <thead>
                <tr>
                  <th>NGƯỜI DÙNG</th>
                  <th>VAI TRÒ</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY TẠO</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="sb-users-person">
                        <div className="sb-users-person-avatar">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="sb-users-person-info">
                          <strong>{user.fullName}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <select
                        className="sb-users-role-select"
                        value={user.role}
                        disabled={
                          updatingId === user.id || user.role === 'ADMIN'
                        }
                        onChange={(event) =>
                          handleRoleChange(
                            user.id,
                            event.target.value as 'CUSTOMER' | 'OWNER',
                          )
                        }
                        aria-label={`Vai trò của ${user.fullName}`}
                      >
                        {user.role === 'ADMIN' && (
                          <option value="ADMIN">ADMIN</option>
                        )}
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="OWNER">OWNER</option>
                      </select>
                    </td>

                    <td>
                      <span
                        className={`sb-users-status ${
                          user.isActive ? 'active' : 'inactive'
                        }`}
                      >
                        <span />
                        {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>

                    <td>
                      <span className="sb-users-date">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>

                    <td>
                      <div className="sb-users-actions">
                        <button
                          type="button"
                          className={`sb-users-status-button ${
                            user.isActive ? 'lock' : 'unlock'
                          }`}
                          disabled={updatingId === user.id}
                          onClick={() => void handleStatusChange(user)}
                        >
                          {updatingId === user.id
                            ? 'Đang xử lý...'
                            : user.isActive
                              ? 'Khóa'
                              : 'Mở khóa'}
                        </button>

                        <Link
                          to={`/admin/users/${user.id}`}
                          className="sb-users-view-link"
                          aria-label={`Xem chi tiết ${user.fullName}`}
                          title="Xem chi tiết"
                        >
                          Xem
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
