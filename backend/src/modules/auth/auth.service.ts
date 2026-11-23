
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { randomBytes, createHash } from 'crypto';
import { MailService } from './mail.service';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // Đăng ký tài khoản
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      message: 'Đăng ký thành công',
      user,
    };
  }

  // Đăng nhập
async login(dto: LoginDto) {
  const email = dto.email.trim().toLowerCase();

  const user = await this.prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedException(
      'Email hoặc mật khẩu không chính xác',
    );
  }

  const isPasswordValid = await bcrypt.compare(
    dto.password,
    user.password,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedException(
      'Email hoặc mật khẩu không chính xác',
    );
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = await this.jwtService.signAsync(payload);

  return {
    message: 'Đăng nhập thành công',
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}


  // Lấy thông tin cá nhân từ database
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return {
      message: 'Lấy thông tin cá nhân thành công',
      user,
    };
  }

  // Cập nhật thông tin cá nhân
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        'Không tìm thấy người dùng',
      );
    }

    let email: string | undefined;

    if (dto.email !== undefined) {
      email = dto.email.trim().toLowerCase();

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(
          'Email đã được sử dụng',
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && {
          fullName: dto.fullName.trim(),
        }),
        ...(email !== undefined && { email }),
      },
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
      message: 'Cập nhật thông tin thành công',
      user: updatedUser,
    };
  }

  // Đổi mật khẩu
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        'Không tìm thấy người dùng',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Mật khẩu hiện tại không chính xác',
      );
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      12,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Đổi mật khẩu thành công',
    };
  }

  // Yêu cầu đặt lại mật khẩu
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    // Không tiết lộ email có tồn tại hay không
    const response = {
      message:
        'Nếu email tồn tại, hệ thống sẽ gửi liên kết đặt lại mật khẩu.',
    };

    if (!user || !user.isActive) {
      return response;
    }

    // Tạo token ngẫu nhiên, chỉ lưu mã băm vào database
    const token = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    const resetUrl =
      `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        user.fullName,
        resetUrl,
      );
    } catch {
      // Không giữ token nếu gửi email thất bại
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });

      throw new InternalServerErrorException(
        'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.',
      );
    }

    return response;
  }

  // Đặt lại mật khẩu bằng token
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Liên kết không hợp lệ hoặc đã hết hạn.',
      );
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      12,
    );

    // Chỉ cho phép sử dụng token một lần
    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
        isActive: true,
      },
      data: {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'Liên kết không hợp lệ hoặc đã hết hạn.',
      );
    }

    return {
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    };
  }

}
