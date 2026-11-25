import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintsService } from './complaints.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ComplaintStatus, UserRole } from '@prisma/client';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ComplaintsService', () => {
  let service: ComplaintsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      booking: { findUnique: jest.fn() },
      complaint: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
  });

  // Scenario 17: Cannot complain about another person's booking
  it('Scenario 17: should throw ForbiddenException when submitting complaint for someone else booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-1',
      userId: 'other-user',
    });

    await expect(
      service.create('cust-1', {
        bookingId: 'b-1',
        subject: 'Sân bị ướt',
        description: 'Mặt sân trơn trượt nguy hiểm',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // Scenario 17b: Prevent duplicate open complaints on the same booking
  it('Scenario 17b: should throw ConflictException if an active complaint already exists', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-1',
      userId: 'cust-1',
    });
    prisma.complaint.findFirst.mockResolvedValue({
      id: 'comp-existing',
      status: ComplaintStatus.OPEN,
    });

    await expect(
      service.create('cust-1', {
        bookingId: 'b-1',
        subject: 'Khiếu nại lần 2',
        description: 'Vẫn chưa thấy ai dọn sân',
      }),
    ).rejects.toThrow(ConflictException);
  });

  // Scenario 18: Admin resolves complaint validly
  it('Scenario 18: admin can resolve complaint with resolution note and resolvedAt timestamp', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'comp-1',
      status: ComplaintStatus.OPEN,
    });
    prisma.complaint.update.mockResolvedValue({
      id: 'comp-1',
      status: ComplaintStatus.RESOLVED,
      resolution: 'Đã hoàn tiền và kiểm tra sân',
      assignedAdminId: 'admin-1',
    });

    const res = await service.updateStatus('comp-1', 'admin-1', {
      status: ComplaintStatus.RESOLVED,
      resolution: 'Đã hoàn tiền và kiểm tra sân',
    });

    expect(res.status).toBe(ComplaintStatus.RESOLVED);
    expect(prisma.complaint.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ComplaintStatus.RESOLVED,
          assignedAdminId: 'admin-1',
          resolvedAt: expect.any(Date),
        }),
      }),
    );
  });

  // Scenario 19: Access control for complaints detail
  it('Scenario 19: non-owner customer cannot read complaint of another user', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'comp-1',
      complainantId: 'cust-1',
    });

    await expect(
      service.getComplaintDetail('comp-1', {
        id: 'cust-2',
        email: 'c2@test.com',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(ForbiddenException);

    // Admin CAN read
    const adminRead = await service.getComplaintDetail('comp-1', {
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });
    expect(adminRead.id).toBe('comp-1');
  });

  // Scenario 20: Invalid complaint status transition rejected
  it('Scenario 20: should reject invalid status transition (e.g. from RESOLVED to OPEN)', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'comp-closed',
      status: ComplaintStatus.RESOLVED,
    });

    await expect(
      service.updateStatus('comp-closed', 'admin-1', {
        status: ComplaintStatus.OPEN,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
