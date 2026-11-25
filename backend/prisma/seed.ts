import { PrismaClient, UserRole, BookingStatus, ComplaintStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Bắt đầu khởi tạo dữ liệu mẫu (Seed Demo Data) ---');

  // 1. Users (CUSTOMER, 2 OWNERS for cross-access testing, ADMIN)
  const customer = await prisma.user.upsert({
    where: { email: 'khachhang@gmail.com' },
    update: {},
    create: {
      id: 'cust-demo-1',
      fullName: 'Nguyễn Văn Khách',
      email: 'khachhang@gmail.com',
      password: 'demo_hashed_password',
      role: UserRole.CUSTOMER,
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: 'chusan_a@gmail.com' },
    update: {},
    create: {
      id: 'owner-demo-1',
      fullName: 'Trần Văn Chủ Sân A',
      email: 'chusan_a@gmail.com',
      password: 'demo_hashed_password',
      role: UserRole.OWNER,
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'chusan_b@gmail.com' },
    update: {},
    create: {
      id: 'owner-demo-2',
      fullName: 'Lê Văn Chủ Sân B',
      email: 'chusan_b@gmail.com',
      password: 'demo_hashed_password',
      role: UserRole.OWNER,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sportsbooking.vn' },
    update: {},
    create: {
      id: 'admin-demo-1',
      fullName: 'Quản Trị Viên Hệ Thống',
      email: 'admin@sportsbooking.vn',
      password: 'demo_hashed_password',
      role: UserRole.ADMIN,
    },
  });

  // 2. Venues & Courts
  const venue1 = await prisma.venue.upsert({
    where: { id: 'venue-cg-1' },
    update: {},
    create: {
      id: 'venue-cg-1',
      name: 'Cụm Sân Thể Thao Cầu Giấy',
      address: 'Số 10 Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
      description: 'Cụm sân cỏ nhân tạo và cầu lông tiêu chuẩn chất lượng cao',
      ownerId: owner1.id,
    },
  });

  const venue2 = await prisma.venue.upsert({
    where: { id: 'venue-tx-2' },
    update: {},
    create: {
      id: 'venue-tx-2',
      name: 'Cụm Sân Thể Thao Thanh Xuân',
      address: 'Số 25 Khuất Duy Tiến, Thanh Xuân, Hà Nội',
      description: 'Sân quần vợt tennis và bóng rổ chuyên nghiệp',
      ownerId: owner2.id,
    },
  });

  const court1 = await prisma.court.upsert({
    where: { id: 'court-cg-foot-1' },
    update: {},
    create: {
      id: 'court-cg-foot-1',
      name: 'Sân Bóng Đá Cầu Giấy 7 Người',
      sportType: 'FOOTBALL',
      isActive: true,
      venueId: venue1.id,
    },
  });

  const court2 = await prisma.court.upsert({
    where: { id: 'court-cg-badm-2' },
    update: {},
    create: {
      id: 'court-cg-badm-2',
      name: 'Sân Cầu Lông Thảm Gỗ VIP 1',
      sportType: 'BADMINTON',
      isActive: true,
      venueId: venue1.id,
    },
  });

  const court3 = await prisma.court.upsert({
    where: { id: 'court-tx-ten-1' },
    update: {},
    create: {
      id: 'court-tx-ten-1',
      name: 'Sân Tennis Mặt Cứng Thanh Xuân',
      sportType: 'TENNIS',
      isActive: true,
      venueId: venue2.id,
    },
  });

  // 3. Bookings with all 5 statuses
  const pastDate1 = new Date(Date.now() - 3 * 24 * 3600 * 1000); // 3 days ago
  const pastDate1End = new Date(pastDate1.getTime() + 2 * 3600 * 1000);

  const pastDate2 = new Date(Date.now() - 1 * 24 * 3600 * 1000); // 1 day ago
  const pastDate2End = new Date(pastDate2.getTime() + 2 * 3600 * 1000);

  const futureDate = new Date(Date.now() + 2 * 24 * 3600 * 1000); // 2 days in future
  const futureDateEnd = new Date(futureDate.getTime() + 2 * 3600 * 1000);

  // Completed Booking with Review
  const bookingCompleted1 = await prisma.booking.upsert({
    where: { id: 'booking-completed-1' },
    update: {},
    create: {
      id: 'booking-completed-1',
      startAt: pastDate1,
      endAt: pastDate1End,
      totalPrice: 400000,
      status: BookingStatus.COMPLETED,
      userId: customer.id,
      courtId: court1.id,
    },
  });

  // Completed Booking with Complaint
  const bookingCompleted2 = await prisma.booking.upsert({
    where: { id: 'booking-completed-2' },
    update: {},
    create: {
      id: 'booking-completed-2',
      startAt: pastDate2,
      endAt: pastDate2End,
      totalPrice: 350000,
      status: BookingStatus.COMPLETED,
      userId: customer.id,
      courtId: court2.id,
    },
  });

  // Completed Booking for Owner 2 (for cross-owner isolation test)
  await prisma.booking.upsert({
    where: { id: 'booking-completed-owner2' },
    update: {},
    create: {
      id: 'booking-completed-owner2',
      startAt: pastDate1,
      endAt: pastDate1End,
      totalPrice: 600000,
      status: BookingStatus.COMPLETED,
      userId: customer.id,
      courtId: court3.id,
    },
  });

  // Pending Booking (for Owner 1 to accept/reject)
  await prisma.booking.upsert({
    where: { id: 'booking-pending-1' },
    update: {},
    create: {
      id: 'booking-pending-1',
      startAt: futureDate,
      endAt: futureDateEnd,
      totalPrice: 400000,
      status: BookingStatus.PENDING,
      userId: customer.id,
      courtId: court1.id,
    },
  });

  // Confirmed Booking
  await prisma.booking.upsert({
    where: { id: 'booking-confirmed-1' },
    update: {},
    create: {
      id: 'booking-confirmed-1',
      startAt: futureDate,
      endAt: futureDateEnd,
      totalPrice: 300000,
      status: BookingStatus.CONFIRMED,
      userId: customer.id,
      courtId: court2.id,
    },
  });

  // Cancelled Booking
  await prisma.booking.upsert({
    where: { id: 'booking-cancelled-1' },
    update: {},
    create: {
      id: 'booking-cancelled-1',
      startAt: pastDate1,
      endAt: pastDate1End,
      totalPrice: 200000,
      status: BookingStatus.CANCELLED,
      userId: customer.id,
      courtId: court1.id,
    },
  });

  // Rejected Booking
  await prisma.booking.upsert({
    where: { id: 'booking-rejected-1' },
    update: {},
    create: {
      id: 'booking-rejected-1',
      startAt: pastDate2,
      endAt: pastDate2End,
      totalPrice: 300000,
      status: BookingStatus.REJECTED,
      userId: customer.id,
      courtId: court1.id,
    },
  });

  // 4. Sample Review
  await prisma.review.upsert({
    where: { bookingId: bookingCompleted1.id },
    update: {},
    create: {
      id: 'review-seed-1',
      rating: 5,
      comment: 'Mặt sân cỏ mới rất êm chân, dàn đèn chiếu sáng ban đêm rõ nét, nước giải khát đầy đủ!',
      userId: customer.id,
      courtId: court1.id,
      bookingId: bookingCompleted1.id,
    },
  });

  // 5. Sample Complaints
  await prisma.complaint.upsert({
    where: { id: 'complaint-seed-1' },
    update: {},
    create: {
      id: 'complaint-seed-1',
      bookingId: bookingCompleted2.id,
      complainantId: customer.id,
      subject: 'Mặt sàn gỗ cầu lông bị dột nước mưa',
      description: 'Lúc 19h tối hôm qua trời mưa to, góc cuối sân bị dột nước gây trơn trượt nguy hiểm.',
      status: ComplaintStatus.OPEN,
    },
  });

  console.log('--- Hoàn tất khởi tạo dữ liệu mẫu thành công ---');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
