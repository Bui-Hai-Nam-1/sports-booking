import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { setPreset } from '../../store/dashboardFiltersSlice';
import type { DateRangePreset } from '../../store/dashboardFiltersSlice';
import { fetchOwnerDashboard } from '../../features/dashboard/api';
import type { OwnerDashboardData } from '../../features/dashboard/api';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { RatingStars } from '../../components/common/RatingStars';
import { StatusBadge } from '../../components/common/StatusBadge';

export function OwnerDashboardPage() {
  const dispatch = useDispatch();
  const { preset, from, to } = useSelector((state: RootState) => state.dashboardFilters);

  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOwnerDashboard({ from, to });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải số liệu thống kê chủ sân');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: '7days', label: '7 ngày qua' },
    { id: '30days', label: '30 ngày qua' },
    { id: 'thisMonth', label: 'Tháng này' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Dashboard Thống kê Chủ Sân</h2>
          <p className="text-muted">Tổng quan doanh thu, lượt đặt sân và chất lượng dịch vụ của cụm sân</p>
        </div>

        {/* Date presets filter */}
        <div className="preset-buttons">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn btn-sm ${preset === p.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => dispatch(setPreset(p.id))}
            >
              {p.label}
            </button>
          ))}
          <Link to="/reports/revenue" className="btn btn-outline btn-sm">
            Chi tiết doanh thu &rarr;
          </Link>
        </div>
      </div>

      {loading && <LoadingState message="Đang cập nhật số liệu dashboard..." />}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {data && !loading && (
        <>
          {/* KPI Cards Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-title">Tổng đơn đặt trong kỳ</span>
              <span className="kpi-value">{data.totalBookings}</span>
              <span className="kpi-sub text-muted">Bao gồm mọi trạng thái</span>
            </div>

            <div className="kpi-card highlight-warning">
              <span className="kpi-title">Đơn chờ duyệt (PENDING)</span>
              <span className="kpi-value text-warning">{data.pendingBookings}</span>
              <Link to="/owner/bookings" className="kpi-link">
                Xử lý đơn &rarr;
              </Link>
            </div>

            <div className="kpi-card highlight-success">
              <span className="kpi-title">Đơn hoàn thành (COMPLETED)</span>
              <span className="kpi-value text-success">{data.completedBookings}</span>
              <span className="kpi-sub text-muted">Lượt đã sử dụng sân</span>
            </div>

            <div className="kpi-card highlight-primary">
              <span className="kpi-title">Doanh thu hoàn thành</span>
              <span className="kpi-value text-primary">
                {Number(data.totalRevenue).toLocaleString('vi-VN')} đ
              </span>
              <span className="kpi-sub text-muted">Chỉ tính đơn COMPLETED</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">Điểm đánh giá trung bình</span>
              <div className="kpi-rating-row">
                <span className="kpi-value">{data.averageRating.toFixed(1)}</span>
                <RatingStars value={Math.round(data.averageRating)} readOnly size="sm" />
              </div>
              <span className="kpi-sub text-muted">{data.totalReviews} lượt đánh giá</span>
            </div>
          </div>

          {/* Court breakdown table */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3>Thống kê chi tiết theo từng sân</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên sân</th>
                    <th>Cụm sân</th>
                    <th>Môn thể thao</th>
                    <th style={{ textAlign: 'right' }}>Số đơn hoàn thành</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu ghi nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {data.courtStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                        Chưa có sân nào phát sinh đơn hoàn thành trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    data.courtStats.map((c) => (
                      <tr key={c.courtId}>
                        <td><strong>{c.courtName}</strong></td>
                        <td>{c.venueName}</td>
                        <td>{c.sportType}</td>
                        <td style={{ textAlign: 'right' }}>{c.completedBookingsCount}</td>
                        <td style={{ textAlign: 'right' }} className="price-tag font-bold">
                          {Number(c.revenue).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Bookings */}
          {data.recentBookings.length > 0 && (
            <div className="dashboard-section">
              <h3>Đơn đặt sân gần đây</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Sân</th>
                      <th>Ngày đặt</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.user?.fullName}</td>
                        <td>{b.court?.name}</td>
                        <td>{new Date(b.createdAt).toLocaleString('vi-VN')}</td>
                        <td><StatusBadge status={b.status} type="booking" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
