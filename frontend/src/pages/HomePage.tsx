export function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">ĐẶT SÂN THỂ THAO TRỰC TUYẾN</p>
      <h1>Tìm sân phù hợp, đặt lịch dễ dàng.</h1>
      <p>Khung giao diện ban đầu. Các thành viên sẽ phát triển từng module theo phân công.</p>
      <div className="feature-grid" id="courts">
        <article className="feature-card"><h2>Tìm sân</h2><p>Lọc theo môn thể thao, khu vực, ngày và giờ.</p></article>
        <article className="feature-card"><h2>Đặt lịch</h2><p>Xem khung giờ trống và gửi yêu cầu đặt sân.</p></article>
        <article className="feature-card"><h2>Quản lý sân</h2><p>Dành cho chủ sân quản lý sân và bảng giá.</p></article>
      </div>
    </section>
  );
}
