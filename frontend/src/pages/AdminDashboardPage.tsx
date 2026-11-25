
import { useEffect, useState } from 'react';
import api from '../lib/api';
import axios from 'axios';
import type { UserRole } from '../features/auth/authSlice';
import { Link } from 'react-router-dom';

interface UserStats {
  totalUsers: number;
  customers: number;
  owners: number;
  admins: number;
  activeUsers: number;
  inactiveUsers: number;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        // Lấy danh sách người dùng hiện có từ API Admin.
        const response = await api.get<AdminUser[]>('/users');

        if (cancelled) return;

        const users = response.data;

        setStats({
          totalUsers: users.length,
          customers: users.filter((user) => user.role === 'CUSTOMER').length,
          owners: users.filter((user) => user.role === 'OWNER').length,
          admins: users.filter((user) => user.role === 'ADMIN').length,
          activeUsers: users.filter((user) => user.isActive).length,
          inactiveUsers: users.filter((user) => !user.isActive).length,
        });

        setRecentUsers(
          [...users]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .slice(0, 5),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            axios.isAxiosError(err)
              ? err.response?.data?.message || 'Không thể tải dữ liệu Dashboard.'
              : 'Có lỗi xảy ra khi tải Dashboard.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="sb-dashboard-loading">
        <span className="sb-users-spinner" />
        <p>Đang tải tổng quan hệ thống...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="sb-dashboard-error">
        <h2>Không thể tải Dashboard</h2>
        <p>{error || 'Không có dữ liệu.'}</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Tổng người dùng',
      value: stats.totalUsers,
      icon: '♙',
      color: 'blue',
    },
    {
      title: 'Khách hàng',
      value: stats.customers,
      icon: '♧',
      color: 'green',
    },
    {
      title: 'Chủ sân',
      value: stats.owners,
      icon: '⌂',
      color: 'purple',
    },
    {
      title: 'Tài khoản bị khóa',
      value: stats.inactiveUsers,
      icon: '!',
      color: 'orange',
    },
  ];

  return (
    <div className="sb-dashboard">
      <div className="sb-dashboard-heading">
        <div>
          <span className="sb-page-eyebrow">SPORTS BOOKING OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>Chào mừng bạn đến với trang quản trị hệ thống.</p>
        </div>

        <Link to="/admin/users" className="sb-dashboard-primary-button">
          Quản lý người dùng →
        </Link>
      </div>

      <div className="sb-dashboard-stats">
        {cards.map((card) => (
          <div className="sb-dashboard-stat" key={card.title}>
            <div className={`sb-dashboard-stat-icon ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <span>{card.title}</span>
              <strong>{card.value.toLocaleString('vi-VN')}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="sb-dashboard-grid">
        <section className="sb-dashboard-panel">
          <div className="sb-dashboard-panel-heading">
            <div>
              <h2>Phân bố tài khoản</h2>
              <p>Số lượng người dùng theo vai trò</p>
            </div>
          </div>

          <div className="sb-dashboard-role-list">
            <div className="sb-dashboard-role">
              <div className="sb-dashboard-role-label">
                <span>Khách hàng</span>
                <strong>{stats.customers}</strong>
              </div>
              <div className="sb-dashboard-progress">
                <span
                  style={{
                    width: `${stats.totalUsers ? (stats.customers / stats.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="sb-dashboard-role">
              <div className="sb-dashboard-role-label">
                <span>Chủ sân</span>
                <strong>{stats.owners}</strong>
              </div>
              <div className="sb-dashboard-progress purple">
                <span
                  style={{
                    width: `${stats.totalUsers ? (stats.owners / stats.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="sb-dashboard-role">
              <div className="sb-dashboard-role-label">
                <span>Quản trị viên</span>
                <strong>{stats.admins}</strong>
              </div>
              <div className="sb-dashboard-progress orange">
                <span
                  style={{
                    width: `${stats.totalUsers ? (stats.admins / stats.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="sb-dashboard-panel">
          <div className="sb-dashboard-panel-heading">
            <div>
              <h2>Trạng thái tài khoản</h2>
              <p>Tình trạng hoạt động hiện tại</p>
            </div>
          </div>

          <div className="sb-dashboard-status-summary">
            <div>
              <span className="sb-dashboard-status-dot active" />
              <span>Đang hoạt động</span>
              <strong>{stats.activeUsers}</strong>
            </div>
            <div>
              <span className="sb-dashboard-status-dot inactive" />
              <span>Đã khóa</span>
              <strong>{stats.inactiveUsers}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="sb-dashboard-panel sb-dashboard-recent">
        <div className="sb-dashboard-panel-heading">
          <div>
            <h2>Người dùng mới nhất</h2>
            <p>Các tài khoản được tạo gần đây</p>
          </div>

          <Link to="/admin/users">Xem tất cả →</Link>
        </div>

        {recentUsers.length === 0 ? (
          <p className="sb-dashboard-no-data">Chưa có người dùng.</p>
        ) : (
          <div className="sb-dashboard-recent-list">
            {recentUsers.map((user) => (
              <div className="sb-dashboard-recent-item" key={user.id}>
                <div className="sb-users-person-avatar">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>

                <div className="sb-dashboard-recent-info">
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </div>

                <span className="sb-dashboard-recent-role">
                  {user.role}
                </span>

                <span
                  className={`sb-users-status ${user.isActive ? 'active' : 'inactive'}`}
                >
                  <span />
                  {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
