import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminDashboard } from '../../features/dashboard/api';
import type { AdminDashboardData } from '../../features/dashboard/api';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminDashboard();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dashboard quản trị viên');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Dashboard Quản Trị Hệ Thống (Admin)</h2>
          <p className="text-muted">Tổng quan toàn bộ hệ thống đặt sân, người dùng và khiếu nại</p>
        </div>

        <div>
          <Link to="/reports/revenue" className="btn btn-outline btn-sm">
            Xem báo cáo doanh thu toàn hệ thống &rarr;
          </Link>
        </div>
      </div>

      {loading && <LoadingState message="Đang tải dữ liệu toàn hệ thống..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {data && !loading && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-title">Tổng người dùng</span>
              <span className="kpi-value text-primary">{data.totalUsers}</span>
              <span className="kpi-sub text-muted">Khách, chủ sân, admin</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">Cụm sân / Sân thể thao</span>
              <span className="kpi-value">
                {data.totalVenues} <span className="text-sm text-muted">cụm</span> / {data.totalCourts} <span className="text-sm text-muted">sân</span>
              </span>
              <span className="kpi-sub text-muted">Quy mô toàn mạng lưới</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">Tổng đơn đặt toàn sàn</span>
              <span className="kpi-value">{data.totalBookings}</span>
              <span className="kpi-sub text-muted">{data.completedBookings} đơn hoàn thành</span>
            </div>

            <div className="kpi-card highlight-primary">
              <span className="kpi-title">Tổng giá trị đơn hoàn thành</span>
              <span className="kpi-value text-primary">
                {Number(data.totalRevenue).toLocaleString('vi-VN')} đ
              </span>
              <span className="kpi-sub text-muted">Doanh thu giao dịch thành công</span>
            </div>

            <div className="kpi-card highlight-warning">
              <span className="kpi-title">Khiếu nại chưa xử lý</span>
              <span className="kpi-value text-warning">{data.openComplaints}</span>
              <Link to="/admin/complaints" className="kpi-link">
                Xử lý khiếu nại &rarr;
              </Link>
            </div>
          </div>

          <div className="dashboard-grid-2">
            {/* Recent Bookings */}
            <div className="dashboard-section">
              <h3>Đơn đặt sân mới nhất</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Sân</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBookings.length === 0 ? (
                      <tr><td colSpan={4} className="text-center">Chưa có đơn đặt nào</td></tr>
                    ) : (
                      data.recentBookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.user?.fullName}</td>
                          <td>{b.court?.name}</td>
                          <td>{new Date(b.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td><StatusBadge status={b.status} type="booking" /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Complaints */}
            <div className="dashboard-section">
              <h3>Khiếu nại mới nhận</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Người khiếu nại</th>
                      <th>Tiêu đề</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentComplaints.length === 0 ? (
                      <tr><td colSpan={4} className="text-center">Chưa có khiếu nại nào</td></tr>
                    ) : (
                      data.recentComplaints.map((c) => (
                        <tr key={c.id}>
                          <td>{c.complainant?.fullName}</td>
                          <td>{c.subject}</td>
                          <td>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td><StatusBadge status={c.status} type="complaint" /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
