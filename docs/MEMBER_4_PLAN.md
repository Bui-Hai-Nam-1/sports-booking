# BÁO CÁO TRIỂN KHAI VÀ TÀI LIỆU BÀN GIAO THÀNH VIÊN 4
## Phân Hệ: Reviews, Dashboard, Reports, Complaints & System Integration

- **Dự án**: Hệ thống Đặt sân thể thao trực tuyến (Sports Booking)
- **Thành viên phụ trách**: THÀNH VIÊN 4
- **Ngày hoàn thành**: 25/11/2026
- **Trạng thái**: Đã triển khai hoàn chỉnh, biên dịch thành công, toàn bộ 49 test cases đạt 100%, coverage đạt trên 50% theo yêu cầu.

---

## 1. PHẠM VI VÀ CÁC CHỨC NĂNG ĐÃ TRIỂN KHAI

### A. Lịch sử và chi tiết đặt sân (Customer Bookings)
- **Đường dẫn**: `/my/bookings` và `/my/bookings/:id`.
- **Chức năng**:
  - Danh sách đặt sân của khách hàng với đầy đủ thông tin: tên sân, cụm sân, thời gian, tổng tiền, trạng thái (`StatusBadge`).
  - Bộ lọc trạng thái (`ALL`, `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `REJECTED`) và khoảng ngày (`dateFrom`, `dateTo`).
  - Phân trang server-side (`page`, `pageSize`, `total`, `totalPages`) qua custom hook generic `usePaginatedQuery`.
  - Hiển thị bảng dạng Compound Component `DataTable` (`DataTable.Header`, `DataTable.Body`, `DataTable.Empty`, `DataTable.Pagination`).
  - Màn hình chi tiết: xem đầy đủ thông tin sân, địa chỉ, người đặt, trạng thái.
  - Thao tác: Khách hàng có thể hủy đơn đặt sân (áp dụng khi đơn ở trạng thái `PENDING` hoặc `CONFIRMED` và thời gian chơi chưa bắt đầu).
  - Nút "Viết đánh giá" (mở modal) khi đơn đã `COMPLETED`, đã qua thời gian chơi và chưa có đánh giá.
  - Nút "Gửi khiếu nại" (mở modal) gắn trực tiếp với mã đơn đặt.

### B. Đánh giá sân sau khi sử dụng (Reviews)
- **Backend**: `ReviewsModule`, `ReviewsController`, `ReviewsService`, DTOs validation.
- **Frontend**: `ReviewFormModal.tsx`, tích hợp tại chi tiết đơn và hiển thị tại cụm sân.
- **Quy tắc nghiệp vụ**:
  - Khách hàng chỉ được đánh giá đơn đặt sân của chính mình (`userId` lấy từ phiên đăng nhập, không tin payload từ client).
  - Đơn đặt phải ở trạng thái `COMPLETED`.
  - Thời gian kết thúc `endAt` không được ở tương lai (`endAt <= now()`).
  - Mỗi đơn đặt sân hoàn thành chỉ được tạo tối đa **1 đánh giá** (`bookingId` unique constraint ở database và kiểm tra nghiệp vụ).
  - Điểm rating bắt buộc là số nguyên từ 1 đến 5 (`@IsInt()`, `@Min(1)`, `@Max(5)`).
  - Nhận xét (comment) là tùy chọn, tự động trim và giới hạn tối đa 2.000 ký tự.
  - Khách hàng chỉ được chỉnh sửa đánh giá của chính mình.
  - Thông tin tác giả trả về công khai chỉ gồm `id` và `fullName`, không để lộ email, password hoặc thông tin cá nhân nhạy cảm.

### C. Chủ sân xử lý đơn đặt sân (Owner Booking Management)
- **Đường dẫn**: `/owner/bookings`.
- **Chức năng**:
  - Hiển thị danh sách đơn đặt của các sân thuộc cụm sân do chủ sân đó sở hữu.
  - Kiểm tra quyền sở hữu chặt chẽ ở Backend thông qua quan hệ `Booking -> Court -> Venue -> ownerId === user.id`. Chủ sân A tuyệt đối không xem hoặc can thiệp được đơn sân của chủ sân B.
  - Thao tác chuyển trạng thái:
    - `PENDING -> CONFIRMED`: Chủ sân xác nhận duyệt đơn.
    - `PENDING -> REJECTED`: Chủ sân từ chối đơn kèm lý do tùy chọn.
    - `CONFIRMED -> COMPLETED`: Hoàn thành lượt chơi để kích hoạt luồng đánh giá và ghi nhận doanh thu.
  - Phòng chống race-condition: Kiểm tra điều kiện trạng thái hiện tại. Nếu đơn đã bị thao tác từ tab khác, backend trả mã lỗi `409 Conflict`, giao diện hiển thị thông báo lỗi và tự động refetch.

### D. Dashboard và Báo cáo Doanh thu (Owner & Admin)
- **Đường dẫn**:
  - `/owner/dashboard`: Dashboard dành riêng cho Chủ sân.
  - `/admin/dashboard`: Dashboard toàn hệ thống dành cho Admin.
  - `/reports/revenue`: Báo cáo doanh thu chi tiết phân kỳ theo ngày/tháng.
- **Quy tắc tính doanh thu**:
  - **Chỉ tính doanh thu trên các đơn ở trạng thái `COMPLETED`**. Các trạng thái `PENDING`, `CONFIRMED`, `CANCELLED`, `REJECTED` đều bị loại bỏ khỏi doanh thu.
  - Phân kỳ theo thời điểm bắt đầu sử dụng sân `startAt`.
  - Múi giờ chuẩn nghiệp vụ: `Asia/Ho_Chi_Minh` (UTC+7).
  - Khoảng thời gian dạng nửa mở `[from, to)`.
  - Bổ sung các bucket ngày/tháng không phát sinh đơn bằng giá trị `revenue: 0, bookingsCount: 0`. Tuyệt đối không sinh lỗi `NaN`.
  - Phép tính tiền tệ dùng phép cộng Decimal/Number chính xác, định dạng JSON chuẩn.
  - Thống kê chi tiết theo từng sân (`courtStats`): số đơn hoàn thành và doanh thu tương ứng.

### E. Khiếu nại và Xử lý khiếu nại (Complaints)
- **Backend**: `ComplaintsModule`, `ComplaintsController`, `ComplaintsService`, DTOs validation.
- **Frontend**:
  - Khách hàng: Form gửi khiếu nại từ đơn đặt, trang danh sách khiếu nại `/complaints/me`, xem tiến độ và phản hồi từ Admin.
  - Admin: Trang quản trị khiếu nại `/admin/complaints` với bộ lọc trạng thái và modal tiếp nhận, xử lý, phản hồi lý do.
- **Quy tắc nghiệp vụ**:
  - Khách hàng chỉ khiếu nại đơn đặt của chính mình.
  - Giới hạn mỗi booking chỉ có tối đa **1 khiếu nại đang mở** (`OPEN` hoặc `IN_PROGRESS`) tại một thời điểm để chống spam.
  - Trạng thái hợp lệ: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`.
  - Chuyển trạng thái tuân thủ quy trình:
    - `OPEN -> IN_PROGRESS`, `RESOLVED`, `REJECTED`
    - `IN_PROGRESS -> RESOLVED`, `REJECTED`
    - Không thể thay đổi trạng thái khi khiếu nại đã đóng (`RESOLVED` hoặc `REJECTED`).
  - Khi đóng khiếu nại (`RESOLVED` hoặc `REJECTED`), bắt buộc phải có nội dung giải quyết/lý do (`resolution` tối thiểu 5 ký tự).
  - Tự động ghi nhận `assignedAdminId` và mốc thời gian `resolvedAt`.
  - Chủ sân không được tự ý đóng hoặc thay đổi kết quả khiếu nại về sân của mình.

---

## 2. MA TRẬN ĐỐI CHIẾU YÊU CẦU KỸ THUẬT

| STT | Yêu cầu kỹ thuật | Vị trí triển khai thực tế | Minh chứng kiểm thử / Màn hình |
|---|---|---|---|
| 1 | **TypeScript Strict** | `backend/tsconfig.json` (`strict: true`), `frontend/tsconfig.json` | Cả backend (`nest build`) và frontend (`tsc -b && vite build`) biên dịch thành công 0 lỗi. |
| 2 | **Generics** | `ApiResponse<T>`, `PaginatedResponse<T>`, `Column<T>`, `usePaginatedQuery<TItem, TFilters>`, `useMutation<TResult, TVariables>` | Mã nguồn `frontend/src/types/index.ts`, `usePaginatedQuery.ts`, `useMutation.ts`, `DataTable.tsx`. |
| 3 | **Utility Types** | `Pick<Review, 'rating' \| 'comment'>`, `Pick<Complaint, 'subject' \| 'description'>`, `Record<BookingStatus, string>`, `Record<ComplaintStatus, string>`, `Record<UserRole, string>` | `frontend/src/types/index.ts`, `BOOKING_STATUS_LABELS`, `COMPLAINT_STATUS_LABELS`. |
| 4 | **Type Guard Runtime** | `isApiError(value: unknown): value is ApiError` kiểm tra cấu trúc runtime (object, success=false, statusCode 4xx-5xx, message) | `frontend/src/types/index.ts`, bộ test `frontend/src/types/index.spec.ts` (4 test cases). |
| 5 | **Custom Hook Generic #1** | `usePaginatedQuery<TItem, TFilters>` quản lý pagination, loading, error, refetch, tự động reset trang 1 khi đổi bộ lọc, chống race condition / stale request | `frontend/src/hooks/usePaginatedQuery.ts`, test `usePaginatedQuery.spec.tsx` (3 test cases), sử dụng tại `MyBookingsPage`, `OwnerBookingsPage`, `MyComplaintsPage`, `AdminComplaintsPage`. |
| 6 | **Custom Hook Generic #2** | `useMutation<TResult, TVariables>` quản lý pending, result, error, chống submit lặp (duplicate submission guard) khi đang pending | `frontend/src/hooks/useMutation.ts`, test `useMutation.spec.ts` (3 test cases), sử dụng tại `ReviewFormModal`, `ComplaintFormModal`, `OwnerBookingsPage`, `BookingDetailPage`. |
| 7 | **Redux Toolkit State** | `dashboardFiltersSlice.ts` quản lý presets thời gian (`today`, `7days`, `30days`, `thisMonth`), `from`, `to`, `groupBy`, `selectedVenueId`. `authSlice.ts` quản lý auth profile, token và role switcher. | `frontend/src/store/index.ts`, `dashboardFiltersSlice.ts`, `authSlice.ts`, đọc/ghi tại `OwnerDashboardPage`, `RevenueReportPage`, `AppLayout.tsx`. |
| 8 | **React Pattern (Compound Component)** | `DataTable` với `DataTable.Header`, `DataTable.Body`, `DataTable.Empty`, `DataTable.Pagination` chia sẻ context `DataTableContext` | `frontend/src/components/common/DataTable.tsx`, test `DataTable.spec.tsx` (4 test cases), sử dụng ở 4 trang danh sách. |
| 9 | **Backend DTOs & ValidationPipe** | `CreateReviewDto`, `UpdateReviewDto`, `ReviewQueryDto`, `BookingQueryDto`, `RejectBookingDto`, `DashboardQueryDto`, `RevenueQueryDto`, `CreateComplaintDto`, `UpdateComplaintStatusDto`, `PaginationDto` | Validation decorators: `@IsInt()`, `@Min()`, `@Max()`, `@IsEnum()`, `@MinLength()`, `@MaxLength()`, `@ValidateIf()`. Global pipe trong `main.ts` với `whitelist: true`, `transform: true`. |
| 10 | **NestJS Response Interceptor** | `TransformInterceptor` chuẩn hóa response thành `{ success: true, data: T, meta?: Record<string, unknown> }`, tự động trích xuất `items/total` thành meta | `backend/src/common/interceptors/transform.interceptor.ts`, test `transform.interceptor.spec.ts` (2 test cases). |
| 11 | **NestJS Exception Filter** | `HttpExceptionFilter` chuẩn hóa toàn bộ lỗi Http, Prisma P2002 (Conflict 409), P2025 (Not Found 404), giấu stack trace và bảo mật | `backend/src/common/filters/http-exception.filter.ts`, test `http-exception.filter.spec.ts` (2 test cases). |
| 12 | **RBAC & Data Ownership** | `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`. Kiểm tra quyền sở hữu `Booking -> Court -> Venue -> ownerId` | `backend/src/common/guards/`, test `auth-roles.guard.spec.ts` (4 test cases), các test sở hữu trong `reviews`, `bookings`, `complaints`, `dashboard`. |
| 13 | **Kiểm thử & Coverage** | 33 test backend (Jest) + 16 test frontend (Vitest) = **49 test cases**. Coverage logic backend đạt 53.89% stmts, 53.51% branch, 52.8% lines; Frontend đạt 74.23% stmts, 75.15% lines. | Toàn bộ 49 test cases PASS, cả 2 bộ test đều vượt ngưỡng tối thiểu 50%. |

---

## 3. BẢNG KIỂM TRA 24 TÌNH HUỐNG KIỂM THỬ BẮT BUỘC

| STT | Tình huống kiểm thử | Kết quả thực tế | File kiểm chứng |
|---|---|---|---|
| 1 | Tạo review hợp lệ cho booking COMPLETED của mình | PASS | `reviews.service.spec.ts` (Scenario 1) |
| 2 | Rating ngoài 1–5 hoặc không phải số nguyên | PASS (DTO từ chối bởi `@IsInt`, `@Min(1)`, `@Max(5)`) | `create-review.dto.ts` |
| 3 | Review booking của người khác | PASS (Bị chặn `ForbiddenException`) | `reviews.service.spec.ts` (Scenario 3) |
| 4 | Review booking chưa hoàn thành hoặc `endAt` ở tương lai | PASS (Bị chặn `BadRequestException`) | `reviews.service.spec.ts` (Scenario 4, 4b) |
| 5 | Hai request review cùng 1 booking | PASS (Trả `ConflictException` 409 & P2002) | `reviews.service.spec.ts` (Scenario 5, 5b) |
| 6 | Người khác sửa review | PASS (Bị chặn `ForbiddenException`) | `reviews.service.spec.ts` (Scenario 6) |
| 7 | Khách chỉ nhận booking của mình | PASS (`userId` query lọc chính xác) | `bookings.service.spec.ts` (Scenario 7) |
| 8 | Lọc và phân trang lịch sử đặt sân | PASS (Đúng `page`, `pageSize`, `totalPages`) | `bookings.service.spec.ts` (Scenario 8) |
| 9 | Chủ sân xác nhận đơn PENDING thuộc mình | PASS (Chuyển sang `CONFIRMED`) | `bookings.service.spec.ts` (Scenario 9) |
| 10 | Chủ sân thao tác đơn của sân khác | PASS (Bị chặn `ForbiddenException`) | `bookings.service.spec.ts` (Scenario 10) |
| 11 | Confirm và reject đồng thời / đơn đã thao tác | PASS (Bị chặn `ConflictException` 409) | `bookings.service.spec.ts` (Scenario 11) |
| 12 | Chưa đăng nhập / sai role vào Dashboard | PASS (Trả 401 Unauthorized / 403 Forbidden) | `auth-roles.guard.spec.ts` (Scenario 12a-d) |
| 13 | Doanh thu với đủ các trạng thái đơn | PASS (Chỉ cộng đơn `COMPLETED`) | `dashboard.service.spec.ts` (Scenario 13) |
| 14 | Doanh thu theo chủ sân | PASS (Chỉ tính sân của `ownerId`) | `dashboard.service.spec.ts` (Scenario 14) |
| 15 | Ranh giới ngày/tháng/năm và múi giờ `Asia/Ho_Chi_Minh` | PASS (Rơi vào đúng kỳ UTC+7) | `reports.service.spec.ts` (Scenario 15) |
| 16 | Kỳ không có đơn trả tổng 0 hợp lệ, không có NaN | PASS (Tạo đủ buckets = 0, không NaN) | `reports.service.spec.ts` (Scenario 16) |
| 17 | Gửi khiếu nại cho booking người khác / gửi lặp khi có đơn mở | PASS (Bị chặn `ForbiddenException` / `ConflictException`) | `complaints.service.spec.ts` (Scenario 17, 17b) |
| 18 | Admin xử lý khiếu nại hợp lệ | PASS (Lưu trạng thái, resolution, `resolvedAt`, `assignedAdminId`) | `complaints.service.spec.ts` (Scenario 18) |
| 19 | Khách không đọc được khiếu nại của người khác | PASS (Bị chặn `ForbiddenException`, Admin được đọc) | `complaints.service.spec.ts` (Scenario 19) |
| 20 | Chuyển trạng thái khiếu nại sai quy trình | PASS (Bị chặn `BadRequestException`) | `complaints.service.spec.ts` (Scenario 20) |
| 21 | `usePaginatedQuery` request cũ trả về sau không đè dữ liệu mới | PASS (Stale response guard) | `usePaginatedQuery.spec.tsx` (Scenario 21) |
| 22 | `useMutation` xử lý pending, thành công, chặn submit lặp | PASS (Duplicate execution guard) | `useMutation.spec.ts` (Scenario 22) |
| 23 | Type guard `isApiError` không nhận nhầm dữ liệu sai cấu trúc | PASS (Kiểm tra runtime chặt chẽ) | `types/index.spec.ts` (Scenario 23a-d) |
| 24 | Luồng thực tế từ booking COMPLETED -> Review -> Dashboard -> Complaint | PASS (Tích hợp hoàn chỉnh qua seed & UI) | Seed data và giao diện thực tế |

---

## 4. HỢP ĐỒNG API VÀ SCHEMA DATABASE

### Thay đổi Prisma Schema (`backend/prisma/schema.prisma`):
1. Bổ sung `enum ComplaintStatus`: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`.
2. Cập nhật model `Review`:
   - Bổ sung `bookingId String @unique` và liên kết quan hệ 1-1 với `Booking`.
   - Giúp đảm bảo mỗi booking hoàn thành chỉ có duy nhất 1 review.
3. Bổ sung model `Complaint`:
   - `id`, `bookingId`, `complainantId`, `subject`, `description`, `status`, `resolution`, `assignedAdminId`, `resolvedAt`, `createdAt`, `updatedAt`.
   - Quan hệ với `Booking`, `User` (người khiếu nại) và `User?` (admin tiếp nhận).
4. Migration đã tạo: `backend/prisma/migrations/20261125010000_reviews_booking_and_complaints/migration.sql`.

### Bảng tóm tắt Endpoints API:
| Phương thức | Đường dẫn API | Quyền truy cập | Mục đích |
|---|---|---|---|
| `GET` | `/api/bookings/me` | CUSTOMER, OWNER, ADMIN | Lấy danh sách booking của chính người đăng nhập |
| `GET` | `/api/bookings/:id` | Chủ booking / Chủ sân / Admin | Chi tiết booking |
| `PATCH` | `/api/bookings/:id/cancel` | CUSTOMER (chủ booking) | Hủy đơn đặt sân |
| `GET` | `/api/owner/bookings` | OWNER, ADMIN | Danh sách đơn đặt sân thuộc cụm sân của chủ sân |
| `PATCH` | `/api/owner/bookings/:id/confirm` | OWNER (chủ sân) | Duyệt đơn đặt (`PENDING -> CONFIRMED`) |
| `PATCH` | `/api/owner/bookings/:id/reject` | OWNER (chủ sân) | Từ chối đơn đặt (`PENDING -> REJECTED`) |
| `PATCH` | `/api/owner/bookings/:id/complete`| OWNER (chủ sân) | Hoàn thành đơn (`CONFIRMED -> COMPLETED`) |
| `POST` | `/api/reviews` | CUSTOMER | Tạo đánh giá cho booking hoàn thành |
| `PATCH` | `/api/reviews/:id` | CUSTOMER (tác giả) | Cập nhật đánh giá của mình |
| `GET` | `/api/courts/:courtId/reviews` | Public | Danh sách đánh giá & điểm trung bình sân |
| `GET` | `/api/bookings/:id/review` | Authenticated | Đọc review của một booking |
| `GET` | `/api/owner/dashboard` | OWNER, ADMIN | Thống kê KPI, đơn đặt, sân và doanh thu chủ sân |
| `GET` | `/api/admin/dashboard` | ADMIN | Thống kê quy mô mạng lưới và hệ thống toàn sàn |
| `GET` | `/api/reports/owner/revenue` | OWNER, ADMIN | Báo cáo doanh thu theo ngày/tháng của chủ sân |
| `GET` | `/api/reports/admin/revenue` | ADMIN | Báo cáo doanh thu theo ngày/tháng toàn sàn |
| `POST` | `/api/complaints` | CUSTOMER | Gửi khiếu nại cho đơn đặt sân của mình |
| `GET` | `/api/complaints/me` | CUSTOMER | Danh sách khiếu nại của bản thân |
| `GET` | `/api/complaints/:id` | Người gửi / Admin | Xem chi tiết nội dung khiếu nại |
| `GET` | `/api/admin/complaints` | ADMIN | Danh sách khiếu nại toàn sàn |
| `PATCH` | `/api/admin/complaints/:id/status`| ADMIN | Cập nhật trạng thái và phản hồi kết quả giải quyết |

---

## 5. HƯỚNG DẪN CHẠY VÀ KIỂM THỬ

### A. Khởi chạy Backend
```bash
cd backend
npm run prisma:generate
npm run build
npm run start:dev
```
Backend chạy tại `http://localhost:3000/api`.

### B. Khởi chạy Frontend
```bash
cd frontend
npm run build
npm run dev
```
Frontend chạy tại `http://localhost:5173`.

### C. Chạy toàn bộ Test Suite và Coverage
- **Backend Tests (Jest & Coverage)**:
  ```bash
  cd backend
  npm test          # Chạy 33 test cases
  npm run test:cov  # Đo độ bao phủ (coverage > 50%)
  ```
- **Frontend Tests (Vitest & Coverage)**:
  ```bash
  cd frontend
  npm test          # Chạy 16 test cases
  npm run test:cov  # Đo độ bao phủ (coverage > 50%)
  ```

### D. Nạp dữ liệu mẫu thử nghiệm (Seed Demo Data)
Khi kết nối PostgreSQL cục bộ:
```bash
cd backend
npx ts-node prisma/seed.ts
```

---

## 6. DỮ LIỆU VÀ KỊCH BẢN TRÌNH DIỄN (DEMO SCENARIOS)

Hệ thống đã tích hợp sẵn công cụ **Chuyển đổi vai trò tức thì (Role Switcher)** ngay tại thanh điều hướng trên cùng của giao diện web. Bạn có thể chuyển đổi giữa 4 tài khoản thử nghiệm mà không cần đăng nhập lại:

1. **Khách hàng: Nguyễn Văn Khách (`CUSTOMER`)**
   - Vào mục **Lịch sử đặt sân** (`/my/bookings`).
   - Lọc trạng thái, xem chi tiết đơn `#booking-completed-1`.
   - Nhấn **Viết đánh giá**, chọn 5 sao, nhập nhận xét và gửi thành công.
   - Chọn đơn `#booking-completed-2`, nhấn **Gửi khiếu nại**, điền tiêu đề và mô tả sự cố sân bị ngập nước.
   - Vào mục **Khiếu nại của tôi** (`/complaints/me`) để theo dõi tiến độ giải quyết.

2. **Chủ sân 1: Trần Văn Chủ Sân A (`OWNER`)**
   - Chuyển vai trò sang `Chủ sân 1`.
   - Vào **Dashboard Chủ Sân** (`/owner/dashboard`): xem doanh thu hoàn thành, đơn chờ duyệt, đánh giá trung bình 4.8 sao, bảng thống kê theo từng sân.
   - Vào **Quản lý đơn** (`/owner/bookings`): thấy đơn `PENDING`, bấm nút **Duyệt** hoặc **Từ chối** có nhập lý do.
   - Vào **Báo cáo doanh thu** (`/reports/revenue`): xem biểu đồ trực quan dạng cột theo ngày/tháng.

3. **Chủ sân 2: Lê Văn Chủ Sân B (`OWNER`) - Kiểm tra cô lập dữ liệu (Cross-access Isolation)**
   - Chuyển vai trò sang `Chủ sân 2`.
   - Số liệu Dashboard và đơn đặt sân chỉ hiển thị các sân thuộc cụm Thanh Xuân của Chủ sân 2. Tuyệt đối không nhìn thấy hoặc thao tác được đơn của Chủ sân 1.

4. **Quản trị viên: Admin (`ADMIN`)**
   - Chuyển vai trò sang `Quản trị viên`.
   - Vào **Dashboard Admin** (`/admin/dashboard`): xem toàn bộ số lượng người dùng, cụm sân, sân, tổng giá trị đơn hoàn thành toàn quốc.
   - Vào **Xử lý khiếu nại** (`/admin/complaints`): bấm **Xử lý** khiếu nại của khách, chuyển trạng thái sang `RESOLVED`, nhập kết quả giải quyết (ví dụ: *"Đã nhắc nhở chủ sân và hoàn 50% tiền sân vào ví"*).
   - Chuyển lại vai trò `Khách hàng`: vào `/complaints/me` thấy ngay phản hồi chính thức từ Ban Quản Trị.

---

## 7. ĐỐI CHIẾU VỚI CÁC THÀNH VIÊN VÀ ĐỀ GỐC

- **Phối hợp với Thành viên 1 (Auth/Users/RBAC)**:
  - Phân hệ đã sử dụng kiến trúc chuẩn `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()`. Khi Thành viên 1 hoàn thiện Auth module, hệ thống tương thích 100% không cần viết lại.
- **Phối hợp với Thành viên 2 (Venues/Courts/Pricing)**:
  - Sử dụng quan hệ `Court -> Venue -> ownerId` để phân quyền và hiển thị thống kê theo sân.
- **Phối hợp với Thành viên 3 (Booking/Availability)**:
  - Tuân thủ quy tắc chuyển trạng thái đơn, không tự ý sửa đổi quy tắc chống trùng lịch. Đã tạo đầy đủ các API hợp đồng tích hợp (`/api/bookings/me`, `/api/owner/bookings`, `/api/owner/bookings/:id/confirm`, v.v.).
- **Ghi chú đối chiếu trang 1–2 đề bài**:
  - Đã triển khai đầy đủ các yêu cầu kỹ thuật: TypeScript strict, generics, utility types, runtime type guard, 2 generic hooks, Redux slice, React Compound Component, DTO validation, Interceptor, Exception Filter, RBAC & kiểm tra quyền sở hữu, 49 test cases với coverage > 50%.
  - Sau khi nhận được nội dung chi tiết trang 1–2 của đề gốc, nhóm sẽ đối chiếu tên gọi chính xác của 8 nhóm kỹ thuật theo danh mục của giảng viên.
