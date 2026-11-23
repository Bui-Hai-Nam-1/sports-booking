export type VenueStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PricingType = 'STANDARD' | 'WEEKEND' | 'PEAK';

export interface Court {
  id: string;
  name: string;
  sportType: string;
  isActive: boolean;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  description: string | null;
  imageUrls: string[];
  sportTypes: string[];
  status: VenueStatus;
  isActive: boolean;
  courts?: Court[];
}

export interface OpeningHour {
  weekday: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface PricingRule {
  id: string;
  type: PricingType;
  pricePerHour: string | number;
  weekday: number | null;
  startsAt: string;
  endsAt: string;
}

export interface MaintenanceBlock {
  id: string;
  startAt: string;
  endAt: string;
  reason: string;
}
