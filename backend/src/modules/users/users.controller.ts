import {
  Controller,
  Get,
  UseGuards,
  Param,
  Patch,
  Body,
  Query,
  Req,
} from '@nestjs/common';

import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // Tìm kiếm người dùng
  @Get('search')
  searchUsers(@Query('keyword') keyword: string) {
    return this.usersService.searchUsers(keyword ?? '');
  }

  // ADMIN đổi vai trò người dùng
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(id, dto);
  }

  // Xem chi tiết người dùng
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Danh sách người dùng
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
  // ADMIN khóa hoặc mở khóa tài khoản
@Patch(':id/status')
updateStatus(
  @Param('id') id: string,
  @Body() dto: UpdateUserStatusDto,
  @Req() req: { user: { userId: string } },
) {
  return this.usersService.updateStatus(
    id,
    dto,
    req.user.userId,
  );
}
}
