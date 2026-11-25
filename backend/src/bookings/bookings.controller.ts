import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('bookings/me')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.ADMIN)
  async getMyBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BookingQueryDto,
  ) {
    return this.bookingsService.getMyBookings(user.id, query);
  }

  @Get('bookings/:id')
  async getBookingDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.getBookingDetail(id, user);
  }

  @Patch('bookings/:id/cancel')
  @Roles(UserRole.CUSTOMER)
  async cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.cancelBooking(id, user.id);
  }

  @Get('owner/bookings')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getOwnerBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BookingQueryDto,
  ) {
    return this.bookingsService.getOwnerBookings(user.id, query);
  }

  @Patch('owner/bookings/:id/confirm')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async confirmBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.confirmBooking(id, user.id);
  }

  @Patch('owner/bookings/:id/reject')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async rejectBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectBookingDto,
  ) {
    return this.bookingsService.rejectBooking(id, user.id, dto);
  }

  @Patch('owner/bookings/:id/complete')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async completeBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.completeBooking(id, user.id);
  }
}
