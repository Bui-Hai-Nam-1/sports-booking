import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles, AppRole } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CreateCourtDto } from './dto/court.dto';
import { CreateVenueDto, SetOpeningHoursDto, UpdateVenueDto } from './dto/venue.dto';
import { VenueApprovalDto } from './dto/venue-approval.dto';
import { VenuesService } from './venues.service';

interface UserRequest extends Request {
  user: { id: string; role: AppRole };
}

interface OptionalUserRequest extends Request {
  user?: { id: string; role: AppRole };
}

@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  listPublic() {
    return this.venues.listPublicVenues();
  }

  @Get('mine')
  @Roles('CUSTOMER', 'OWNER')
  @UseGuards(RolesGuard)
  listMine(@Req() request: UserRequest) {
    return this.venues.listOwnerVenues(request.user.id);
  }

  @Get('pending')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  listPending() {
    return this.venues.listPendingVenues();
  }

  @Post()
  @Roles('CUSTOMER', 'OWNER')
  @UseGuards(RolesGuard)
  create(@Req() request: UserRequest, @Body() dto: CreateVenueDto) {
    return this.venues.createVenue(request.user.id, dto);
  }

  @Patch(':venueId/approval')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  approve(@Param('venueId') venueId: string, @Body() dto: VenueApprovalDto) {
    return this.venues.setApproval(venueId, dto);
  }

  @Patch(':venueId')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  update(
    @Req() request: UserRequest,
    @Param('venueId') venueId: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venues.updateVenue(request.user.id, venueId, dto);
  }

  @Delete(':venueId')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  deactivate(@Req() request: UserRequest, @Param('venueId') venueId: string) {
    return this.venues.deactivateVenue(request.user.id, venueId);
  }

  @Get(':venueId/courts')
  listCourts(@Param('venueId') venueId: string) {
    return this.venues.listVenueCourts(venueId);
  }

  @Post(':venueId/courts')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  createCourt(
    @Req() request: UserRequest,
    @Param('venueId') venueId: string,
    @Body() dto: CreateCourtDto,
  ) {
    return this.venues.createCourt(request.user.id, venueId, dto);
  }

  @Get(':venueId/opening-hours')
  getOpeningHours(@Param('venueId') venueId: string, @Req() request: OptionalUserRequest) {
    const ownerId = request.user?.role === 'OWNER' ? request.user.id : undefined;
    return this.venues.getOpeningHours(venueId, ownerId);
  }

  @Put(':venueId/opening-hours')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  setOpeningHours(
    @Req() request: UserRequest,
    @Param('venueId') venueId: string,
    @Body() dto: SetOpeningHoursDto,
  ) {
    return this.venues.replaceOpeningHours(request.user.id, venueId, dto.hours);
  }
}
