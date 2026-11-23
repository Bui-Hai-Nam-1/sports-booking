
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(keyword: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          {
            fullName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id },
        });

        if (!user) {
          throw new NotFoundException('Không tìm thấy người dùng');
        }

        // Không cho phép hạ quyền ADMIN cuối cùng đang hoạt động.
        if (
        user.role === UserRole.ADMIN &&
        user.isActive
        ) {
          const activeAdmins = await tx.user.count({
            where: {
              role: UserRole.ADMIN,
              isActive: true,
            },
          });

          if (activeAdmins <= 1) {
            throw new ForbiddenException(
              'Không thể hạ quyền ADMIN cuối cùng đang hoạt động',
            );
          }
        }

        const updatedUser = await tx.user.update({
          where: { id },
          data: { role: dto.role as UserRole },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return {
          message: 'Cập nhật vai trò thành công',
          user: updatedUser,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    adminId: string,
  ) {
    // Không cho ADMIN tự khóa tài khoản của mình.
    if (id === adminId && dto.isActive === false) {
      throw new ForbiddenException(
        'Bạn không thể tự vô hiệu hóa tài khoản của mình',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id },
        });

        if (!user) {
          throw new NotFoundException('Không tìm thấy người dùng');
        }

        // Không cho khóa ADMIN cuối cùng đang hoạt động.
        if (
          user.role === UserRole.ADMIN &&
          user.isActive &&
          dto.isActive === false
        ) {
          const activeAdmins = await tx.user.count({
            where: {
              role: UserRole.ADMIN,
              isActive: true,
            },
          });

          if (activeAdmins <= 1) {
            throw new ForbiddenException(
              'Không thể vô hiệu hóa ADMIN cuối cùng đang hoạt động',
            );
          }
        }

        const updatedUser = await tx.user.update({
          where: { id },
          data: { isActive: dto.isActive },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return {
          message: dto.isActive
            ? 'Kích hoạt tài khoản thành công'
            : 'Vô hiệu hóa tài khoản thành công',
          user: updatedUser,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
