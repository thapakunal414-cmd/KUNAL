export type ServiceCategory =
  | 'Food'
  | 'Laundry'
  | 'Printing'
  | 'Transport'
  | 'Stationery';

export type CampusArea =
  | 'DBS Campus Gate'
  | 'Selaqui Market'
  | 'Chakrata Road'
  | 'Prem Nagar';

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  priceInr: number;
  unitLabel: string;
}

export interface ServiceReview {
  id: string;
  studentName: string;
  hostelOrArea: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  category: ServiceCategory;
  area: CampusArea;
  distanceLabel: string;
  turnaroundLabel: string;
  turnaroundMinutes: number;
  operatingHours: string;
  summary: string;
  studentDeal: string;
  verifiedSince: string;
  verificationChecklist: string[];
  paymentMethods: string[];
  imageUrl: string;
  basePriceInr: number;
  baseUnitLabel: string;
  rating: number;
  reviewCount: number;
  packages: ServicePackage[];
  reviews: ServiceReview[];
}

export interface CartItem {
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  packageId: string;
  packageName: string;
  unitPriceInr: number;
  unitLabel: string;
  quantity: number;
  timeSlot: string;
  imageUrl: string;
}

export type BookingStatus = 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';

export interface BookingRecord {
  id: string;
  studentName: string;
  hostelAddress: string;
  phone: string;
  paymentMethod: 'UPI' | 'Hostel Gate COD';
  promoCode: string | null;
  subtotalInr: number;
  discountInr: number;
  convenienceFeeInr: number;
  totalInr: number;
  status: BookingStatus;
  createdAt: string;
  estimatedFulfillment: string;
  items: CartItem[];
  pointsEarned?: number;
  rewardVoucherCode?: string | null;
  reviewedServiceIds?: string[];
}

export interface RewardTier {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  discountInr: number;
}

export interface RedeemedVoucher {
  code: string;
  tierId: string;
  title: string;
  discountInr: number;
  pointsSpent: number;
  redeemedAt: string;
  usedInBookingId: string | null;
}

export interface LoyaltyLedgerEntry {
  id: string;
  label: string;
  pointsDelta: number;
  bookingId?: string;
  createdAt: string;
}

export interface LoyaltyState {
  availablePoints: number;
  lifetimePoints: number;
  completedOrdersCount: number;
  tiers: RewardTier[];
  vouchers: RedeemedVoucher[];
  ledger: LoyaltyLedgerEntry[];
}

export interface PartnerApplication {
  id: string;
  businessName: string;
  ownerName: string;
  category: ServiceCategory;
  area: CampusArea;
  phone: string;
  startingPriceInr: number;
  serviceSummary: string;
  studentDeal: string;
  createdAt: string;
}

export interface PilotSummary {
  verifiedProviders: number;
  totalBookings: number;
  completedBookings: number;
  averageRating: number;
  totalStudentSavingsInr: number;
}
