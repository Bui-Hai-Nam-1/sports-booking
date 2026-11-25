import { Controller, Get, Param, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import {
  CourtAvailabilityGridQueryDto,
  SearchAvailabilityDto,
  VenueAvailabilityGridQueryDto,
} from './dto/search-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('search')
  search(@Query() query: SearchAvailabilityDto) {
    return this.availabilityService.searchAvailableVenues(query);
  }

  @Get('courts/:courtId/grid')
  getCourtGrid(
    @Param('courtId') courtId: string,
    @Query() query: CourtAvailabilityGridQueryDto,
  ) {
    return this.availabilityService.getCourtAvailabilityGrid(courtId, query);
  }

  @Get('venues/:venueId/grid')
  getVenueGrid(
    @Param('venueId') venueId: string,
    @Query() query: VenueAvailabilityGridQueryDto,
  ) {
    return this.availabilityService.getVenueAvailabilityGrid(venueId, query);
  }
}
