import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/auth/roles.guard';
import { CourtsController } from './courts.controller';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [VenuesController, CourtsController],
  providers: [VenuesService, RolesGuard],
  exports: [VenuesService],
})
export class VenuesModule {}
