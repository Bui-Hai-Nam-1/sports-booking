import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/auth/roles.guard';
import {
  OwnerApprovalsController,
  VenuesController,
} from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [VenuesController, OwnerApprovalsController],
  providers: [VenuesService, RolesGuard],
})
export class VenuesModule {}
