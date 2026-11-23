import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AppRole, Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CreateMaintenanceBlockDto } from './dto/maintenance.dto';
import { CreatePricingRuleDto } from './dto/pricing.dto';
import { UpdateCourtDto } from './dto/court.dto';
import { VenuesService } from './venues.service';

interface UserRequest extends Request {
  user: { id: string; role: AppRole };
}

interface OptionalUserRequest extends Request {
  user?: { id: string; role: AppRole };
}

@Controller('courts')
export class CourtsController {
  constructor(private readonly venues: VenuesService) {}

  @Patch(':courtId')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  update(
    @Req() request: UserRequest,
    @Param('courtId') courtId: string,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.venues.updateCourt(request.user.id, courtId, dto);
  }

  @Delete(':courtId')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  deactivate(@Req() request: UserRequest, @Param('courtId') courtId: string) {
    return this.venues.deactivateCourt(request.user.id, courtId);
  }

  @Get(':courtId/pricing')
  listPricing(@Param('courtId') courtId: string, @Req() request: OptionalUserRequest) {
    const ownerId = request.user?.role === 'OWNER' ? request.user.id : undefined;
    return this.venues.listPricingRules(courtId, ownerId);
  }

  @Post(':courtId/pricing')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  createPricing(
    @Req() request: UserRequest,
    @Param('courtId') courtId: string,
    @Body() dto: CreatePricingRuleDto,
  ) {
    return this.venues.createPricingRule(request.user.id, courtId, dto);
  }

  @Delete(':courtId/pricing/:ruleId')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  deletePricing(
    @Req() request: UserRequest,
    @Param('courtId') courtId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.venues.deletePricingRule(request.user.id, courtId, ruleId);
  }

  @Get(':courtId/maintenance')
  listMaintenance(@Param('courtId') courtId: string, @Req() request: OptionalUserRequest) {
    const ownerId = request.user?.role === 'OWNER' ? request.user.id : undefined;
    return this.venues.listMaintenanceBlocks(courtId, ownerId);
  }

  @Post(':courtId/maintenance')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  createMaintenance(
    @Req() request: UserRequest,
    @Param('courtId') courtId: string,
    @Body() dto: CreateMaintenanceBlockDto,
  ) {
    return this.venues.createMaintenanceBlock(request.user.id, courtId, dto);
  }

  @Delete(':courtId/maintenance/:blockId')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  deleteMaintenance(
    @Req() request: UserRequest,
    @Param('courtId') courtId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.venues.deleteMaintenanceBlock(request.user.id, courtId, blockId);
  }
}
