import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('owner/revenue')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getOwnerRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RevenueQueryDto,
  ) {
    return this.reportsService.getOwnerRevenueReport(user.id, query);
  }

  @Get('admin/revenue')
  @Roles(UserRole.ADMIN)
  async getAdminRevenue(@Query() query: RevenueQueryDto) {
    return this.reportsService.getAdminRevenueReport(query);
  }
}
