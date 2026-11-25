import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import {
  setPreset,
  setGroupBy,
  setCustomDates,
} from '../../store/dashboardFiltersSlice';
import type { DateRangePreset } from '../../store/dashboardFiltersSlice';
import {
  fetchOwnerRevenueReport,
  fetchAdminRevenueReport,
} from '../../features/reports/api';
import type { RevenueReportData } from '../../features/reports/api';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

export function RevenueReportPage() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { preset, from, to, groupBy } = useSelector(
    (state: RootState) => state.dashboardFilters,
  );

  const [data, setData] = useState<RevenueReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = isAdmin
        ? await fetchAdminRevenueReport({ from, to, groupBy })
        : await fetchOwnerRevenueReport({ from, to, groupBy });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải báo cáo doanh thu');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, from, to, groupBy]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: '7days', label: '7 ngày' },
    { id: '30days', label: '30 ngày' },
    { id: 'thisMonth', label: 'Tháng này' },
  ];

  const maxRevenue = data
    ? Math.max(...data.buckets.map((b) => b.revenue), 1)
    : 1;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Báo cáo doanh thu {isAdmin ? '(Toàn hệ thống)' : '(Chủ sân)'}</h2>
          <p className="text-muted">
            Doanh thu được tính dựa trên tổng giá trị các đơn đặt sân đã hoàn thành (COMPLETED) theo giờ Việt Nam
          </p>
        </div>

        {/* Group By Switcher */}
        <div className="btn-group">
          <button
            type="button"
            className={`btn btn-sm ${groupBy === 'day' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => dispatch(setGroupBy('day'))}
          >
            Theo ngày
          </button>
          <button
            type="button"
            className={`btn btn-sm ${groupBy === 'month' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => dispatch(setGroupBy('month'))}
          >
            Theo tháng
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
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
        </div>

        <div className="filter-item">
          <label htmlFor="rev-from" className="filter-label">Từ:</label>
          <input
            id="rev-from"
            type="date"
            className="form-input"
            value={from ? from.slice(0, 10) : ''}
            onChange={(e) => {
              if (e.target.value) {
                dispatch(
                  setCustomDates({
                    from: new Date(`${e.target.value}T00:00:00Z`).toISOString(),
                    to,
                  }),
                );
              }
            }}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="rev-to" className="filter-label">Đến:</label>
          <input
            id="rev-to"
            type="date"
            className="form-input"
            value={to ? to.slice(0, 10) : ''}
            onChange={(e) => {
              if (e.target.value) {
                dispatch(
                  setCustomDates({
                    from,
                    to: new Date(`${e.target.value}T23:59:59Z`).toISOString(),
                  }),
                );
              }
            }}
          />
        </div>
      </div>

      {loading && <LoadingState message="Đang kết xuất báo cáo doanh thu..." />}
      {error && <ErrorState message={error} onRetry={loadReport} />}

      {data && !loading && (
        <>
          {/* Summary Row */}
          <div className="kpi-grid">
            <div className="kpi-card highlight-primary">
              <span className="kpi-title">Tổng doanh thu hoàn thành</span>
              <span className="kpi-value text-primary">
                {Number(data.totalRevenue).toLocaleString('vi-VN')} {data.currency}
              </span>
              <span className="kpi-sub text-muted">Khoảng thời gian đã chọn</span>
            </div>

            <div className="kpi-card highlight-success">
              <span className="kpi-title">Số lượt đặt hoàn thành</span>
              <span className="kpi-value text-success">{data.totalCompletedBookings}</span>
              <span className="kpi-sub text-muted">Giao dịch thành công</span>
            </div>
          </div>

          {/* Visual Chart Bars */}
          <div className="dashboard-section">
            <h3>Biểu đồ doanh thu theo thời gian</h3>
            <div className="chart-bar-container">
              {data.buckets.map((b) => {
                const heightPercent = Math.max((b.revenue / maxRevenue) * 100, 4);
                return (
                  <div key={b.period} className="chart-bar-column">
                    <div className="chart-bar-tooltip">
                      <strong>{b.period}</strong>
                      <div>{Number(b.revenue).toLocaleString('vi-VN')} đ</div>
                      <div className="text-muted text-sm">{b.bookingsCount} đơn</div>
                    </div>
                    <div
                      className={`chart-bar ${b.revenue > 0 ? 'active' : 'zero'}`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="chart-bar-label">{b.period.slice(-5)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Table */}
          <div className="dashboard-section">
            <h3>Bảng số liệu chi tiết</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ ({groupBy === 'day' ? 'Ngày' : 'Tháng'})</th>
                    <th style={{ textAlign: 'right' }}>Số đơn hoàn thành</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu ghi nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buckets.map((b) => (
                    <tr key={b.period}>
                      <td><strong>{b.period}</strong></td>
                      <td style={{ textAlign: 'right' }}>{b.bookingsCount}</td>
                      <td style={{ textAlign: 'right' }} className="price-tag font-bold">
                        {Number(b.revenue).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
