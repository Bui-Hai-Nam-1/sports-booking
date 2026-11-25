import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ComplaintQueryDto } from './dto/complaint-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post('complaints')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.ADMIN)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.complaintsService.create(user.id, dto);
  }

  @Get('complaints/me')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.ADMIN)
  async getMyComplaints(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ComplaintQueryDto,
  ) {
    return this.complaintsService.getMyComplaints(user.id, query);
  }

  @Get('complaints/:id')
  async getComplaintDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.complaintsService.getComplaintDetail(id, user);
  }

  @Get('admin/complaints')
  @Roles(UserRole.ADMIN)
  async getAdminComplaints(@Query() query: ComplaintQueryDto) {
    return this.complaintsService.getAdminComplaints(query);
  }

  @Patch('admin/complaints/:id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    return this.complaintsService.updateStatus(id, admin.id, dto);
  }
}
