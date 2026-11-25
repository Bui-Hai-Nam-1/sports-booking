# Module quản lý sân (Thành viên 2)

## Nghiệp vụ

- Người dùng gửi đăng ký cụm sân; đăng ký mới ở trạng thái `PENDING` và chỉ xuất hiện công khai sau khi Admin duyệt. Khi duyệt, tài khoản đăng ký được nâng lên vai trò `OWNER` trong cùng transaction.
- Chủ sân sửa thông tin, ảnh, môn thể thao; tạo, cập nhật, khóa/mở hoặc ngừng sử dụng sân con. Xóa sân con/cụm sân là xóa mềm để giữ lịch đặt và đánh giá đã phát sinh.
- Giờ hoạt động được cấu hình theo thứ trong tuần.
- Bảng giá gắn với từng sân con, hỗ trợ `STANDARD`, `WEEKEND`, `PEAK`, ngày áp dụng và khoảng giờ.
- Lịch bảo trì không được giao nhau với một lịch bảo trì hoặc booking `PENDING`/`CONFIRMED` hiện có.

## API

| Method | Đường dẫn | Quyền | Mục đích |
|---|---|---|---|
| `GET` | `/api/venues` | Công khai | Danh sách cụm sân đã duyệt |
| `GET` | `/api/venues/:venueId/courts` | Công khai | Sân con đang hoạt động |
| `GET` | `/api/venues/:venueId/opening-hours` | Công khai | Giờ hoạt động |
| `GET` | `/api/courts/:courtId/pricing` | Công khai | Bảng giá |
| `GET` | `/api/courts/:courtId/maintenance` | Công khai | Khoảng thời gian bảo trì |
| `GET`, `POST` | `/api/venues` (`GET /mine`) | Khách / Chủ sân | Cụm sân của tôi / gửi đăng ký cụm sân |
| `PATCH`, `DELETE` | `/api/venues/:venueId` | Chủ sân | Cập nhật / ngừng cụm sân |
| `GET`, `POST` | `/api/venues/:venueId/courts` | Công khai / Chủ sân | Xem / tạo sân con |
| `PATCH`, `DELETE` | `/api/courts/:courtId` | Chủ sân | Cập nhật / khóa sân |
| `GET`, `PUT` | `/api/venues/:venueId/opening-hours` | Công khai / Chủ sân | Xem / thay thế lịch mở cửa |
| `POST`, `DELETE` | `/api/courts/:courtId/pricing[/:ruleId]` | Chủ sân | Quản lý mức giá |
| `POST`, `DELETE` | `/api/courts/:courtId/maintenance[/:blockId]` | Chủ sân | Quản lý lịch bảo trì |
| `GET` | `/api/venues/pending` | Admin | Danh sách cụm sân chờ duyệt |
| `PATCH` | `/api/venues/:venueId/approval` | Admin | Duyệt hoặc từ chối |

Các route quản lý lấy `user.id` và `user.role` từ `request.user`; không nhận `ownerId` từ body/query. Module Auth cần xác thực request và gắn payload theo hợp đồng `{ id: string, role: 'CUSTOMER' | 'OWNER' | 'ADMIN' }`. Hiện tại starter chưa có module Auth nên các route được bảo vệ sẽ trả `401` cho đến khi tích hợp Auth; không nên thay bằng header nhận diện người dùng không được xác thực. Sau khi chủ mới được duyệt, Auth cần làm mới/đọc lại role từ tài khoản thay vì tiếp tục dựa vào claim cũ của token.

## Database và chạy

Các model mới được định nghĩa trong `backend/prisma/schema.prisma`. Từ thư mục `backend`, chạy `npm run prisma:generate` và `npx prisma migrate dev` để cập nhật Prisma Client và PostgreSQL. Migration có sẵn tại `backend/prisma/migrations/20261123003400_stadium_management`.

Giao diện chủ sân ở `/owner/venues`. Nút **Thêm mới sân** mở form đăng ký dạng popup; ảnh JPEG/PNG/WebP/GIF (tối đa 12 ảnh, 10 MB mỗi ảnh) và video MP4/WebM/MOV (tối đa 3 video, 100 MB mỗi video) được upload tới `/api/venues/media`. Tệp lưu tại `backend/uploads` và được phục vụ qua `/api/venues/media/:filename`. Thư mục upload được gitignore; môi trường deploy cần mount persistent volume hoặc thay bằng object storage để giữ tệp qua lần triển khai. Form duyệt Admin gọi các API `/venues/pending` và `/venues/:venueId/approval`; API vẫn là nơi kiểm tra quyền, không dựa vào việc ẩn/hiện nút trên frontend.

Backend bật strict TypeScript, DTO validation qua `ValidationPipe`, response timing qua interceptor và lỗi chuẩn hóa qua exception filter. Frontend bổ sung hai generic hooks (`useAsyncResource<T>`, `useMutation<TInput, TOutput>`) và Compound Component cho tabs. Bộ unit test nghiệp vụ sân chạy bằng `npm run test:cov` trong `backend`; hiện có 22 test case và threshold statement coverage tối thiểu 50% cho service.
