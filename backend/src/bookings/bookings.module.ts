import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [AvailabilityController, BookingsController],
  providers: [AvailabilityService, BookingsService],
  exports: [AvailabilityService, BookingsService],
})
export class BookingsModule {}
