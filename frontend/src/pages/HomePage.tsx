import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">HỆ THỐNG ĐẶT SÂN THỂ THAO TRỰC TUYẾN</p>
      <h1>Tìm sân phù hợp, đặt lịch & quản lý dễ dàng.</h1>
      <p>
        Nền tảng kết nối người chơi và các cụm sân thể thao trên toàn quốc. Đầy đủ tính năng đánh giá sân sau khi chơi, quản lý đơn đặt, báo cáo doanh thu và xử lý khiếu nại minh bạch.
      </p>

      <div className="feature-grid" id="courts">
        <article className="feature-card">
          <h2>Dành cho Khách hàng</h2>
          <p>Xem lại lịch sử các lượt đặt, viết đánh giá và chấm điểm chất lượng sân, gửi khiếu nại khi có sự cố phát sinh.</p>
          <div className="mt-1">
            <Link to="/my/bookings" className="btn btn-outline btn-sm">
              Lịch sử đặt sân &rarr;
            </Link>
          </div>
        </article>

        <article className="feature-card">
          <h2>Dành cho Chủ sân</h2>
          <p>Xác nhận hoặc từ chối đơn đặt sân, theo dõi doanh thu thực tế, biểu đồ ngày/tháng và điểm số đánh giá từ khách.</p>
          <div className="mt-1">
            <Link to="/owner/dashboard" className="btn btn-outline btn-sm">
              Dashboard Chủ Sân &rarr;
            </Link>
          </div>
        </article>

        <article className="feature-card">
          <h2>Quản trị hệ thống (Admin)</h2>
          <p>Theo dõi quy mô mạng lưới, tổng doanh thu hoàn thành toàn sàn, tiếp nhận và điều tra giải quyết khiếu nại.</p>
          <div className="mt-1">
            <Link to="/admin/dashboard" className="btn btn-outline btn-sm">
              Dashboard Admin &rarr;
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
