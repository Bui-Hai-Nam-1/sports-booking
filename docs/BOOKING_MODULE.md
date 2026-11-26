# Module Đặt lịch & Xử lý trùng lịch (Thành viên 3)

## 1. Phạm vi nghiệp vụ
Module `Bookings & Availability` phụ trách luồng đặt sân cốt lõi của hệ thống:
- Tìm kiếm cụm sân/sân con theo **môn thể thao**, **khu vực/tên sân**, **ngày**, và **khoảng giờ**.
- Hiển thị **lịch trống dạng lưới** theo cả 2 góc nhìn:
  - **Sân × Khung giờ** (`GET /api/availability/venues/:venueId/grid`)
  - **Ngày × Khung giờ** nhiều ngày (`GET /api/availability/courts/:courtId/grid`)
- Tính giá từng khung giờ theo quy tắc của Thành viên 2 (`STANDARD`, `WEEKEND`, `PEAK`), hỗ trợ cả giá cố định (`pricePerHour`) lẫn phụ thu phần trăm (`increasePercent`).
- Kiểm tra sân trống & báo giá phía server (`POST /api/bookings/check`).
- Đặt **một hoặc nhiều khung giờ liên tiếp** (`POST /api/bookings`).
- **Chống 2 người đặt cùng sân, cùng giờ** bằng giao dịch cơ sở dữ liệu.
- **Hủy lịch theo quy định** (`PATCH /api/bookings/:bookingId/cancel`) và **Quản lý trạng thái đơn** (`PATCH /api/bookings/:bookingId/status`).

---

## 2. Cơ chế chống trùng lịch đồng thời (Concurrency Control)
Khi `POST /api/bookings` chạy trong `BookingsService.createBooking`:
1. Mở Prisma `$transaction` với mức cô lập **`Serializable`**.
2. Khóa tuần tự theo `courtId` bằng PostgreSQL advisory lock: `SELECT pg_advisory_xact_lock(hashtext(courtId))` (các sân khác nhau không khóa chéo nhau).
3. Kiểm tra lại trong transaction:
   - Sân (`Court`) đang `isActive = true`, cụm sân (`Venue`) đang `APPROVED` và `isActive = true`.
   - Khung giờ nằm trong `VenueOpeningHour` và tính lại `totalPrice` phía server.
   - Không chồng lấn `MaintenanceBlock` theo khoảng nửa mở `[startAt, endAt)`.
   - Không chồng lấn `Booking` có trạng thái `PENDING` hoặc `CONFIRMED`.
4. Nếu có xung đột hoặc bắt được mã lỗi Prisma `P2034` / `P2002`, server trả về `409 ConflictException` và frontend tự động làm mới lưới lịch trống.

---

## 3. Quy định hủy lịch & State Machine trạng thái
- **Quy định hủy lịch (`assertCancellationAllowed`):**
  - Chỉ được hủy đơn ở trạng thái `PENDING` hoặc `CONFIRMED`, và chưa tới `startAt`.
  - Khách hàng (`CUSTOMER`) phải hủy **trước giờ bắt đầu tối thiểu 2 tiếng** (`CANCELLATION_DEADLINE_HOURS = 2`).
  - Chủ sân (`OWNER` của cụm sân) / `ADMIN` có thể hủy trước giờ bắt đầu và bắt buộc ghi `cancelReason`.
- **State Machine (`BOOKING_STATUS_TRANSITIONS`):**
  - `PENDING` → `CONFIRMED` | `REJECTED` | `CANCELLED`
  - `CONFIRMED` → `COMPLETED` (chỉ sau khi qua `endAt`) | `CANCELLED`
  - `COMPLETED`, `CANCELLED`, `REJECTED`: trạng thái kết thúc (terminal).

---

## 4. Danh sách API Backend (`/api`)

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| `GET` | `/api/availability/search` | Công khai | Tìm cụm sân/sân trống theo môn, khu vực, ngày, giờ |
| `GET` | `/api/availability/courts/:courtId/grid` | Công khai | Lưới **Ngày × Khung giờ** (`days=1..14`) |
| `GET` | `/api/availability/venues/:venueId/grid` | Công khai | Lưới **Sân con × Khung giờ** trong ngày |
| `POST` | `/api/bookings/check` | Công khai | Kiểm tra tính khả dụng & báo giá chi tiết |
| `POST` | `/api/bookings` | `CUSTOMER` / `OWNER` / `ADMIN` | Tạo đơn đặt 1 hoặc nhiều giờ liên tiếp |
| `GET` | `/api/bookings/me` | Đã đăng nhập | Danh sách đơn của tôi (lọc `status`, `dateFrom`, `dateTo`) |
| `GET` | `/api/bookings/owner` | `OWNER` / `ADMIN` | Danh sách đơn tại các sân quản lý |
| `GET` | `/api/bookings/:bookingId` | Chủ đơn / Chủ sân / `ADMIN` | Chi tiết đơn đặt |
| `PATCH` | `/api/bookings/:bookingId/cancel` | Chủ đơn / Chủ sân / `ADMIN` | Hủy đơn theo quy định |
| `PATCH` | `/api/bookings/:bookingId/status` | `OWNER` / `ADMIN` | Xác nhận, từ chối, hoàn thành, hủy đơn |

---

## 5. Đáp ứng yêu cầu kỹ thuật chung
- **TypeScript strict, generic, utility types & type guard:**
  - `backend/tsconfig.json` & `frontend/tsconfig.app.json` bật `"strict": true`.
  - Generic types: `ApiSuccessResponse<T>`, `PaginatedResponse<T>`, `GridMatrix<TRowKey, TCell>`.
  - Utility types: `Pick`, `Omit`, `Partial`, `Record`, `Readonly`, `EntitySummary<T, K>`.
  - Type guards: `isAppRole`, `isJwtTokenPayload`, `normalizeAuthenticatedUser`, `isBookingStatus`, `isSlotStatus`, `isPricingType`, `isValidDateString`, `isValidTimeString`, `isApiEnvelope`, `isApiClientError`, `areSlotsContiguous`.
- **≥ 2 Custom Hook Generic (Frontend):**
  - `useBookingQuery<TParams, TResult>`
  - `useContiguousSlotSelection<TSlot extends BookableTimeSlot>`
  - `useBookingAction<TInput, TOutput>`
- **Redux Toolkit:** `frontend/src/features/booking/bookingSlice.ts` + `frontend/src/store/index.ts`.
- **React Pattern (Compound Component):** `AvailabilityMatrix` (`Root`, `Header`, `Legend`, `Grid`, `Row`, `SlotCell`, `Summary`).
- **Unit Tests & Coverage:** `npm run test:cov` trong `backend/` đạt **27/27 test cases** (yêu cầu ≥ 15) và **>85% statement coverage** trên `src/bookings/` (yêu cầu ≥ 50%).
- **RBAC + Backend Pipeline:** `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`, DTO `class-validator`, `ValidationPipe`, `ApiResponseInterceptor`, `HttpExceptionFilter`.

---

## 6. Ghi chú tích hợp nhóm (TV1, TV2, TV4)
- `normalizeAuthenticatedUser` hỗ trợ cả `request.user.userId` (TV1) và `request.user.id` (TV2).
- `frontend/src/lib/api.ts` đọc token từ cả `accessToken` (TV1) và `auth_token` (TV4), đồng thời unwrap `{ success: true, data }`.
- Frontend routes của TV3 đặt tại `/bookings`, `/bookings/my`, `/bookings/manage` để tách biệt sạch với `/owner/venues` (TV2) và `/my/bookings`, `/owner/bookings` (TV4).
