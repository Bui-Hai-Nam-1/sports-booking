import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { BookingsService } from './bookings.service';
import {
  CheckAvailabilityDto,
  CreateBookingDto,
} from './dto/create-booking.dto';
import {
  CancelBookingDto,
  ListBookingsQueryDto,
  UpdateBookingStatusDto,
} from './dto/manage-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  checkAvailability(@Body() dto: CheckAvailabilityDto) {
    return this.bookingsService.checkSlotAvailability(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'OWNER', 'ADMIN')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(user, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'OWNER', 'ADMIN')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.listMyBookings(user, query);
  }

  @Get('owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  listForOwner(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.listManagedBookings(user, query);
  }

  @Get(':bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'OWNER', 'ADMIN')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingsService.getBookingById(user, bookingId);
  }

  @Patch(':bookingId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'OWNER', 'ADMIN')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(user, bookingId, dto);
  }

  @Patch(':bookingId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(user, bookingId, dto);
  }
}
