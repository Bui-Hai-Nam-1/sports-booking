import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/auth/authenticated-user';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import {
  CreateCourtDto,
  CreateMaintenanceDto,
  CreatePriceRuleDto,
  CreateVenueDto,
  OwnerApprovalDto,
  SearchVenuesQueryDto,
  UpdateCourtDto,
  UpdatePriceRuleDto,
  UpdateVenueDto,
} from './venues.dto';
import { VenuesService } from './venues.service';

@Controller()
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get('venues')
  listPublic(@Query() query: SearchVenuesQueryDto) {
    return this.venuesService.listPublic(query);
  }

  @Get('venues/mine')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  listOwned(@CurrentUser() user: AuthenticatedUser) {
    return this.venuesService.listOwned(user);
  }

  @Get('venues/:venueId')
  getPublicVenue(@Param('venueId') venueId: string) {
    return this.venuesService.getPublicVenue(venueId);
  }

  @Post('venues')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  createVenue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVenueDto,
  ) {
    return this.venuesService.createVenue(user, dto);
  }

  @Patch('venues/:venueId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  updateVenue(
    @Param('venueId') venueId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.updateVenue(venueId, user, dto);
  }

  @Delete('venues/:venueId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deactivateVenue(
    @Param('venueId') venueId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.venuesService.deactivateVenue(venueId, user);
  }

  @Post('venues/:venueId/courts')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  createCourt(
    @Param('venueId') venueId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCourtDto,
  ) {
    return this.venuesService.createCourt(venueId, user, dto);
  }

  @Patch('courts/:courtId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  updateCourt(
    @Param('courtId') courtId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.venuesService.updateCourt(courtId, user, dto);
  }

  @Delete('courts/:courtId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deactivateCourt(
    @Param('courtId') courtId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.venuesService.deactivateCourt(courtId, user);
  }

  @Post('courts/:courtId/pricing')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  createPriceRule(
    @Param('courtId') courtId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePriceRuleDto,
  ) {
    return this.venuesService.createPriceRule(courtId, user, dto);
  }

  @Patch('pricing/:ruleId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  updatePriceRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePriceRuleDto,
  ) {
    return this.venuesService.updatePriceRule(ruleId, user, dto);
  }

  @Delete('pricing/:ruleId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deletePriceRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.venuesService.deletePriceRule(ruleId, user);
  }

  @Get('courts/:courtId/maintenance')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  listMaintenance(
    @Param('courtId') courtId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.venuesService.listMaintenance(courtId, user);
  }

  @Post('courts/:courtId/maintenance')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  createMaintenance(
    @Param('courtId') courtId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMaintenanceDto,
  ) {
    return this.venuesService.createMaintenance(courtId, user, dto);
  }

  @Delete('maintenance/:maintenanceId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deleteMaintenance(
    @Param('maintenanceId') maintenanceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.venuesService.deleteMaintenance(maintenanceId, user);
  }
}

@Controller('admin/owners')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class OwnerApprovalsController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get('pending')
  listPending() {
    return this.venuesService.listPendingOwners();
  }

  @Patch(':ownerId/approval')
  review(
    @Param('ownerId') ownerId: string,
    @CurrentUser() reviewer: AuthenticatedUser,
    @Body() dto: OwnerApprovalDto,
  ) {
    return this.venuesService.reviewOwner(ownerId, reviewer.id, dto);
  }
}
