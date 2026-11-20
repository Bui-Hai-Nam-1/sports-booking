import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <section className="container"><h1>Không tìm thấy trang</h1><Link to="/">Về trang chủ</Link></section>;
}
