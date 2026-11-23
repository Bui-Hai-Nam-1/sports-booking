
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
}
