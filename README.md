# Sports Booking – Starter

//test branch
Khung dự án đặt lịch sân thể thao, tách riêng Frontend và Backend.

## Công nghệ
- Frontend: React, Vite, TypeScript, React Router, Redux Toolkit, Axios
- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL
- Kiến trúc: SPA + NestJS REST API (kiến trúc B trong đề bài)

## Cấu trúc
```text
sports-booking/
├── frontend/
├── backend/
├── docs/
├── .gitignore
└── README.md
```

## 1. Yêu cầu cài đặt
- Node.js LTS (khuyến nghị Node 20 trở lên)
- npm
- PostgreSQL

## 2. Chạy Backend
```bash
cd backend
cp .env.example .env
# Sửa DATABASE_URL trong .env theo PostgreSQL trên máy bạn
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```
Backend mặc định chạy tại `http://localhost:3000`; kiểm tra `GET /api/health`.

## 3. Chạy Frontend
Mở terminal khác:
```bash
cd frontend
npm install
npm run dev
```
Frontend mặc định chạy tại `http://localhost:5173`.

## 4. Quy tắc Git nhóm
- Không commit file `.env`, `node_modules`, `dist`.
- Mỗi thành viên tạo branch riêng từ `main`.
- Commit theo tính năng, ví dụ `feat(booking): add availability endpoint`.
- Tạo Pull Request, ít nhất một người review trước khi merge.
- Không tự ý sửa/xóa module của thành viên khác nếu chưa trao đổi.

## 5. Module và phân công đề xuất
| Module | Phụ trách |
|---|---|
| Auth, Users, RBAC | Thành viên 1 |
| Venues, Courts, Pricing | Thành viên 2 |
| Booking, Availability | Thành viên 3 |
| Reviews, Dashboard, Reports | Thành viên 4 |

## 6. Việc cần làm tiếp theo
1. Cả nhóm thống nhất quy ước dữ liệu và API.
2. Hoàn thiện schema database trong `backend/prisma/schema.prisma`.
3. Chốt giao diện và luồng nghiệp vụ.
4. Triển khai từng module trên branch riêng.
