import express from 'express';
import type {Request, Response} from 'express';
import fs from 'fs';
import path from 'path';
import {createServer as createViteServer} from 'vite';
import type {
  BookingRecord,
  BookingStatus,
  CampusArea,
  LoyaltyLedgerEntry,
  LoyaltyState,
  PartnerApplication,
  RedeemedVoucher,
  RewardTier,
  ServiceCategory,
  ServiceProvider,
  ServiceReview,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusease-db.json');

const CATEGORY_IMAGES: Record<ServiceCategory, string> = {
  Food: '/src/assets/images/service_food_tiffin_1795069868571.jpg',
  Laundry: '/src/assets/images/service_laundry_fold_1795069868711.jpg',
  Printing: '/src/assets/images/service_printing_notes_1795069868299.jpg',
  Transport: '/src/assets/images/service_transport_shuttle_1795069868805.jpg',
  Stationery: '/src/assets/images/service_stationery_kit_1795069868542.jpg',
};

const SEED_SERVICES: ServiceProvider[] = [
  {
    id: 'svc-doon-tiffin',
    name: 'Doon Ghar Ka Tiffin',
    category: 'Food',
    area: 'Selaqui Market',
    distanceLabel: '350m from DBS Main Gate',
    turnaroundLabel: '25 min delivery',
    turnaroundMinutes: 25,
    operatingHours: '7:30 AM – 10:30 PM',
    summary: 'Fresh home-style lunch & dinner thalis packed hygienically for hostel students.',
    studentDeal: 'Save ₹15 on weekly meal packs + free delivery to hostel gates',
    verifiedSince: 'Sept 2026',
    verificationChecklist: [
      'FSSAI registered kitchen inspected',
      'Fixed transparent student menu rates',
      'Direct hostel gate drop-off',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Food,
    basePriceInr: 85,
    baseUnitLabel: 'per meal',
    rating: 4.8,
    reviewCount: 2,
    packages: [
      {
        id: 'pkg-tiffin-veg',
        name: 'Classic Student Veg Thali',
        description: 'Dal tadka, seasonal sabzi, 4 phulkas, jeera rice & salad',
        priceInr: 85,
        unitLabel: 'per meal',
      },
      {
        id: 'pkg-tiffin-paneer',
        name: 'Paneer Special Hostel Meal',
        description: 'Paneer butter masala, yellow dal, 4 rotis, rice & sweet',
        priceInr: 125,
        unitLabel: 'per meal',
      },
      {
        id: 'pkg-tiffin-weekly',
        name: '5-Day Lunch Tiffin Pass',
        description: 'Five consecutive weekday lunches delivered at 1:00 PM',
        priceInr: 395,
        unitLabel: '5 meals',
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        studentName: 'Riya Negi',
        hostelOrArea: 'DBS Girls Hostel',
        rating: 5,
        comment: 'Portions are generous and rotis arrive warm even during evening rush.',
        createdAt: '2026-10-12T13:15:00.000Z',
      },
      {
        id: 'rev-2',
        studentName: 'Aman Bisht',
        hostelOrArea: 'DBS Boys Hostel B',
        rating: 4.6,
        comment: 'Way more reliable than searching random numbers on WhatsApp groups.',
        createdAt: '2026-10-18T19:40:00.000Z',
      },
    ],
  },
  {
    id: 'svc-selaqui-mess',
    name: 'Campus Gate Rolls & Bowls',
    category: 'Food',
    area: 'DBS Campus Gate',
    distanceLabel: '100m from DBS Main Gate',
    turnaroundLabel: '18 min delivery',
    turnaroundMinutes: 18,
    operatingHours: '11:00 AM – 12:30 AM',
    summary: 'Quick student bowls, grilled wraps, and late-night exam study combos.',
    studentDeal: 'Complimentary ginger chai on study combos after 9 PM',
    verifiedSince: 'Sept 2026',
    verificationChecklist: [
      'Clean open kitchen 2 mins from gate',
      'Zero surge pricing during exams',
      'Instant UPI & gate COD accepted',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Food,
    basePriceInr: 65,
    baseUnitLabel: 'per bowl',
    rating: 4.7,
    reviewCount: 2,
    packages: [
      {
        id: 'pkg-gate-roll',
        name: 'Double Paneer / Egg Kathi Roll',
        description: 'Freshly toasted whole-wheat wrap with mint chutney',
        priceInr: 65,
        unitLabel: 'per roll',
      },
      {
        id: 'pkg-gate-rajma',
        name: 'Dehradun Rajma Chawal Bowl',
        description: 'Slow-cooked Pahadi rajma over steamed basmati rice',
        priceInr: 90,
        unitLabel: 'per bowl',
      },
      {
        id: 'pkg-gate-study',
        name: 'Late-Night Study Combo',
        description: '2 Paneer wraps + masala fries + 2 hot teas',
        priceInr: 155,
        unitLabel: 'combo',
      },
    ],
    reviews: [
      {
        id: 'rev-3',
        studentName: 'Siddharth Joshi',
        hostelOrArea: 'Selaqui PG',
        rating: 4.8,
        comment: 'Lifesaver before midnight assignment submissions.',
        createdAt: '2026-10-20T22:10:00.000Z',
      },
      {
        id: 'rev-4',
        studentName: 'Tanvi Verma',
        hostelOrArea: 'DBS Girls Hostel',
        rating: 4.6,
        comment: 'Rajma chawal tastes homemade and price stays fixed at ₹90.',
        createdAt: '2026-10-25T14:05:00.000Z',
      },
    ],
  },
  {
    id: 'svc-hilltop-meals',
    name: 'Hilltop Hygiene Kitchen',
    category: 'Food',
    area: 'Chakrata Road',
    distanceLabel: '1.1 km from DBS Campus',
    turnaroundLabel: '30 min delivery',
    turnaroundMinutes: 30,
    operatingHours: '8:00 AM – 10:00 PM',
    summary: 'Balanced high-protein student meals, poha breakfasts, and clean thalis.',
    studentDeal: '10% student discount on 5-day meal subscriptions',
    verifiedSince: 'Oct 2026',
    verificationChecklist: [
      'Low-oil cooking verified by student panel',
      'Tamper-sealed spill-proof containers',
      'Scheduled slot delivery',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Food,
    basePriceInr: 95,
    baseUnitLabel: 'per meal',
    rating: 4.9,
    reviewCount: 1,
    packages: [
      {
        id: 'pkg-hill-thali',
        name: 'Standard Balanced Thali',
        description: '2 vegetables, dal, 4 rotis, rice & curd',
        priceInr: 95,
        unitLabel: 'per meal',
      },
      {
        id: 'pkg-hill-protein',
        name: 'High-Protein Paneer & Sprouts Box',
        description: 'Grilled paneer tikka, moong salad, brown/white rice',
        priceInr: 135,
        unitLabel: 'per box',
      },
      {
        id: 'pkg-hill-5day',
        name: '5-Day Dinner Subscription',
        description: 'Scheduled 8:00 PM hostel gate dinner delivery',
        priceInr: 430,
        unitLabel: '5 dinners',
      },
    ],
    reviews: [
      {
        id: 'rev-5',
        studentName: 'Karan Mehta',
        hostelOrArea: 'DBS Boys Hostel A',
        rating: 4.9,
        comment: 'Best option if you want clean, lighter food without heavy oil.',
        createdAt: '2026-11-01T20:15:00.000Z',
      },
    ],
  },
  {
    id: 'svc-cleanfold',
    name: 'CleanFold Hostel Laundry',
    category: 'Laundry',
    area: 'DBS Campus Gate',
    distanceLabel: '150m from DBS Main Gate',
    turnaroundLabel: '6 hr same-day',
    turnaroundMinutes: 360,
    operatingHours: '7:00 AM – 9:30 PM',
    summary: 'Weight-based wash, fold, and steam press with hostel gate pickup & drop.',
    studentDeal: 'Free hostel pickup & delivery on all orders ₹100+',
    verifiedSince: 'Sept 2026',
    verificationChecklist: [
      'Separate batch washing per student bag',
      'Digital scale weighed at pickup',
      'Color-safe soft detergent included',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Laundry,
    basePriceInr: 60,
    baseUnitLabel: 'per kg',
    rating: 4.8,
    reviewCount: 2,
    packages: [
      {
        id: 'pkg-cf-kg',
        name: 'Wash & Steam Iron (1 kg)',
        description: 'Washed, dried, crisp-pressed and neatly folded',
        priceInr: 60,
        unitLabel: 'per kg',
      },
      {
        id: 'pkg-cf-3kg',
        name: 'Hostel Weekly Bag (Up to 3 kg)',
        description: 'Wash & fold bundle ideal for weekly hostel clothes',
        priceInr: 145,
        unitLabel: 'per 3 kg bag',
      },
      {
        id: 'pkg-cf-express',
        name: 'Express 4-Hr Interview Uniform Press',
        description: 'Urgent wash & steam press for blazers, shirts & trousers',
        priceInr: 95,
        unitLabel: 'per set',
      },
    ],
    reviews: [
      {
        id: 'rev-6',
        studentName: 'Priya Rawat',
        hostelOrArea: 'DBS Girls Hostel',
        rating: 4.9,
        comment: 'They never mix clothes and returned my formals right before placement interviews.',
        createdAt: '2026-10-14T17:30:00.000Z',
      },
      {
        id: 'rev-7',
        studentName: 'Harsh Chauhan',
        hostelOrArea: 'DBS Boys Hostel B',
        rating: 4.7,
        comment: 'Super clear per-kg pricing with zero surprise charges.',
        createdAt: '2026-10-28T11:20:00.000Z',
      },
    ],
  },
  {
    id: 'svc-selaqui-steam',
    name: 'Selaqui Steam & Wash Co.',
    category: 'Laundry',
    area: 'Selaqui Market',
    distanceLabel: '450m from DBS Main Gate',
    turnaroundLabel: '24 hr turnaround',
    turnaroundMinutes: 1440,
    operatingHours: '8:00 AM – 9:00 PM',
    summary: 'Budget-friendly bulk student laundry, winter hoodies, and bedding care.',
    studentDeal: 'First 1 kg wash free on 5 kg student hostel bundle',
    verifiedSince: 'Sept 2026',
    verificationChecklist: [
      'Tagged garment tracking slip',
      'Anti-bacterial rinse cycle',
      'Dedicated blanket & hoodie dryers',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Laundry,
    basePriceInr: 55,
    baseUnitLabel: 'per kg',
    rating: 4.6,
    reviewCount: 1,
    packages: [
      {
        id: 'pkg-ss-1kg',
        name: 'Standard Wash & Fold (1 kg)',
        description: 'Everyday cottons, tees, and denim washed & folded',
        priceInr: 55,
        unitLabel: 'per kg',
      },
      {
        id: 'pkg-ss-5kg',
        name: '5 kg Hostel Mega Bundle',
        description: 'Includes wash, tumble dry & neat folding (pay for 4 kg)',
        priceInr: 220,
        unitLabel: 'per 5 kg',
      },
      {
        id: 'pkg-ss-blanket',
        name: 'Single Blanket / Quilt Wash',
        description: 'Deep clean and sanitize for Dehradun winter bedding',
        priceInr: 160,
        unitLabel: 'per piece',
      },
    ],
    reviews: [
      {
        id: 'rev-8',
        studentName: 'Devansh Kulkarni',
        hostelOrArea: 'Selaqui Rental Room',
        rating: 4.6,
        comment: 'Cheapest 5 kg bundle around Selaqui and clothes smell fresh.',
        createdAt: '2026-11-02T16:45:00.000Z',
      },
    ],
  },
  {
    id: 'svc-doon-dryclean',
    name: 'Doon Express Garment Care',
    category: 'Laundry',
    area: 'Prem Nagar',
    distanceLabel: '2.4 km from DBS Campus',
    turnaroundLabel: '18 hr turnaround',
    turnaroundMinutes: 1080,
    operatingHours: '8:30 AM – 8:30 PM',
    summary: 'Specialized steam ironing and dry cleaning for MBA blazers, suits, and sarees.',
    studentDeal: '20% student rate on placement blazer dry cleaning',
    verifiedSince: 'Oct 2026',
    verificationChecklist: [
      'Protective hanger garment cover',
      'Campus shuttle collection twice daily',
      'Stain-spot pre-treatment',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Laundry,
    basePriceInr: 90,
    baseUnitLabel: 'per 4 items',
    rating: 4.7,
    reviewCount: 1,
    packages: [
      {
        id: 'pkg-dd-iron',
        name: '4-Piece Crisp Steam Iron',
        description: 'Shirts, kurtas, or formal trousers pressed on hangers',
        priceInr: 90,
        unitLabel: '4 pieces',
      },
      {
        id: 'pkg-dd-suit',
        name: '2-Piece Blazer & Trouser Dry Clean',
        description: 'Full dry clean & steam finish for campus placements',
        priceInr: 185,
        unitLabel: 'per suit',
      },
    ],
    reviews: [
      {
        id: 'rev-9',
        studentName: 'Ananya Sharma',
        hostelOrArea: 'DBS Girls Hostel',
        rating: 4.7,
        comment: 'Got my placement blazer back spotless in under a day.',
        createdAt: '2026-11-04T10:10:00.000Z',
      },
    ],
  },
  {
    id: 'svc-campus-print',
    name: 'Campus Print & Spiral Hub',
    category: 'Printing',
    area: 'DBS Campus Gate',
    distanceLabel: '80m from DBS Main Gate',
    turnaroundLabel: '15 min pickup',
    turnaroundMinutes: 15,
    operatingHours: '7:30 AM – 10:00 PM',
    summary: 'Fast assignment printing, lecture PDFs, spiral binding, and thesis hardbinding.',
    studentDeal: '₹0.80/page B&W bulk student rate + free cover sheet',
    verifiedSince: 'Sept 2026',
    verificationChecklist: [
      '75 GSM crisp A4 laser paper',
      'Instant queue slot without waiting in line',
      'Color & B&W calibrated printers',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Printing,
    basePriceInr: 50,
    baseUnitLabel: 'per 50 pages',
    rating: 4.9,
    reviewCount: 2,
    packages: [
      {
        id: 'pkg-cp-50',
        name: '50-Page B&W Notes + Spiral Bind',
        description: 'Double-sided crisp print with clear acetate cover & spiral',
        priceInr: 50,
        unitLabel: '50 pages',
      },
      {
        id: 'pkg-cp-color',
        name: 'MBA Case Report Color Pack (30 pp)',
        description: 'Full color charts & tables with soft-bind finishing',
        priceInr: 120,
        unitLabel: '30 pages',
      },
      {
        id: 'pkg-cp-thesis',
        name: 'Hardbound Capstone Project Copy',
        description: 'Embossed hard cover binding + 80 pages laser print',
        priceInr: 230,
        unitLabel: 'per copy',
      },
    ],
    reviews: [
      {
        id: 'rev-10',
        studentName: 'Rohan Chauhan',
        hostelOrArea: 'DBS MBA Block',
        rating: 5,
        comment: 'Booked my project binding at 8:30 AM and picked it up right before 9 AM class.',
        createdAt: '2026-10-19T09:10:00.000Z',
      },
      {
        id: 'rev-11',
        studentName: 'Meera Nair',
        hostelOrArea: 'DBS Girls Hostel',
        rating: 4.8,
        comment: 'No more crowded shop waiting or arbitrary ₹3/page pricing.',
        createdAt: '2026-10-30T15:25:00.000Z',
      },
    ],
  },
  {
    id: 'svc-chakrata-xerox',
    name: 'Chakrata Road Xerox & Bind',
    category: 'Printing',
    area: 'Chakrata Road',
    distanceLabel: '900m from DBS Main Gate',
    turnaroundLabel: '35 min delivery',
    turnaroundMinutes: 35,
    operatingHours: '8:30 AM – 9:00 PM',
    summary: 'High-volume semester course packs, A3 architectural posters, and book binding.',
    studentDeal: 'Free spiral binding on orders of 80+ pages',
    verifiedSince: 'Oct 2026',
    verificationChecklist: [
      'High-speed duplex industrial xerox',
      'A3/A4 glossy poster cardstock stock',
      'Batched hostel delivery at 6 PM',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Printing,
    basePriceInr: 45,
    baseUnitLabel: 'per 40 pages',
    rating: 4.6,
    reviewCount: 1,
    packages: [
      {
        id: 'pkg-cx-40',
        name: '40-Page Semester Notes Pack',
        description: 'Crisp duplex B&W laser print with staple bind',
        priceInr: 45,
        unitLabel: '40 pages',
      },
      {
        id: 'pkg-cx-100',
        name: '100-Page Course Reader + Free Spiral',
        description: 'Complete semester module printed & spiral-bound',
        priceInr: 105,
        unitLabel: '100 pages',
      },
      {
        id: 'pkg-cx-a3',
        name: 'A3 Presentation Chart Set (3 Sheets)',
        description: 'Heavy 200 GSM glossy color print for exhibitions',
        priceInr: 150,
        unitLabel: '3 sheets',
      },
    ],
    reviews: [
      {
        id: 'rev-12',
        studentName: 'Nikhil Rawat',
        hostelOrArea: 'Prem Nagar PG',
        rating: 4.6,
        comment: 'Great for thick semester PDFs where per-page rate really matters.',
        createdAt: '2026-11-03T18:00:00.000Z',
      },
    ],
  },
  {
    id: 'svc-selaqui-cabs',
    name: 'Selaqui RideShare & Campus Cabs',
    category: 'Transport',
    area: 'DBS Campus Gate',
    distanceLabel: 'Pickup at DBS Main Gate',
    turnaroundLabel: '10 min pickup',
    turnaroundMinutes: 10,
    operatingHours: '5:00 AM – 11:30 PM',
    summary: 'Fixed-fare student cabs and shared rides to Prem Nagar, ISBT, and Railway Station.',
    studentDeal: 'Flat ₹50 off DBS-to-ISBT or Railway Station cab fares',
    verifiedSince: 'Sept 2026',
    verificationChecklist: [
      'Verified driver IDs & vehicle plates',
      'Locked upfront fare — zero bargaining',
      'Early-morning train/bus pickups guaranteed',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Transport,
    basePriceInr: 70,
    baseUnitLabel: 'per seat',
    rating: 4.8,
    reviewCount: 2,
    packages: [
      {
        id: 'pkg-tr-shared',
        name: 'Shared Cab Seat: DBS to Prem Nagar',
        description: 'Point-to-point campus shuttle seat departing every 30 mins',
        priceInr: 70,
        unitLabel: 'per seat',
      },
      {
        id: 'pkg-tr-isbt',
        name: 'Private Cab: DBS to ISBT Dehradun',
        description: 'AC compact sedan for up to 4 students with luggage',
        priceInr: 340,
        unitLabel: 'per trip',
      },
      {
        id: 'pkg-tr-rail',
        name: 'Private Cab: DBS to Dehradun Railway Stn',
        description: 'Direct campus gate pickup with guaranteed on-time arrival',
        priceInr: 390,
        unitLabel: 'per trip',
      },
    ],
    reviews: [
      {
        id: 'rev-13',
        studentName: 'Ishita Pant',
        hostelOrArea: 'DBS Girls Hostel',
        rating: 4.9,
        comment: 'Took the 5:30 AM cab to Dehradun Station. Driver arrived 10 mins early and fare was fixed.',
        createdAt: '2026-10-22T06:30:00.000Z',
      },
      {
        id: 'rev-14',
        studentName: 'Vikram Saini',
        hostelOrArea: 'DBS Boys Hostel A',
        rating: 4.7,
        comment: 'Splitting the ₹340 ISBT cab with 3 friends makes it cheaper than autos.',
        createdAt: '2026-11-05T14:15:00.000Z',
      },
    ],
  },
  {
    id: 'svc-doon-scooters',
    name: 'Doon Valley E-Scooter Rentals',
    category: 'Transport',
    area: 'Selaqui Market',
    distanceLabel: '400m from DBS Main Gate',
    turnaroundLabel: '15 min handover',
    turnaroundMinutes: 15,
    operatingHours: '7:00 AM – 9:00 PM',
    summary: 'Affordable hourly & daily two-wheeler rentals for Dehradun errands and weekend trips.',
    studentDeal: 'Two ISI helmets included free + ₹0 security deposit with DGU ID',
    verifiedSince: 'Oct 2026',
    verificationChecklist: [
      'Valid student ID replaces cash deposit',
      'Serviced brakes & full charge/fuel check',
      'Roadside assistance around Dehradun',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Transport,
    basePriceInr: 180,
    baseUnitLabel: 'per 4 hrs',
    rating: 4.7,
    reviewCount: 1,
    packages: [
      {
        id: 'pkg-sc-4hr',
        name: '4-Hour Errand Scooter Pass',
        description: 'Ideal for bank visits, shopping in Prem Nagar, or quick errands',
        priceInr: 180,
        unitLabel: '4 hours',
      },
      {
        id: 'pkg-sc-day',
        name: 'Full-Day Campus Commuter Pass',
        description: '8:00 AM to 8:00 PM unlimited local Dehradun km',
        priceInr: 350,
        unitLabel: 'per day',
      },
    ],
    reviews: [
      {
        id: 'rev-15',
        studentName: 'Arjun Thapa',
        hostelOrArea: 'DBS Boys Hostel B',
        rating: 4.7,
        comment: 'Zero cash deposit with my college ID saved so much hassle.',
        createdAt: '2026-11-06T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'svc-vidyarthi-mart',
    name: 'Vidyarthi Book & Stationery Mart',
    category: 'Stationery',
    area: 'Selaqui Market',
    distanceLabel: '350m from DBS Main Gate',
    turnaroundLabel: '25 min delivery',
    turnaroundMinutes: 25,
    operatingHours: '8:00 AM – 9:30 PM',
    summary: 'Curated exam kits, ruled registers, technical pens, and scientific calculators.',
    studentDeal: '12% student savings on exam bundles vs MRP',
    verifiedSince: 'Sept 2026',
    verificationChecklist: [
      'Genuine Classmate, Casio & Pilot stock',
      'Packaged exam-ready bundles',
      'Hostel gate delivery before 9 PM',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Stationery,
    basePriceInr: 75,
    baseUnitLabel: 'per kit',
    rating: 4.8,
    reviewCount: 1,
    packages: [
      {
        id: 'pkg-st-exam',
        name: 'Mid-Sem Exam Starter Kit',
        description: '2 A4 200-page registers, 4 blue/black gel pens & geometry scale',
        priceInr: 95,
        unitLabel: 'per kit',
      },
      {
        id: 'pkg-st-assign',
        name: 'Assignment & Sticky Note Pack',
        description: '40 A4 ruled sheets, 4 highlighters, sticky tabs & kraft folder',
        priceInr: 75,
        unitLabel: 'per pack',
      },
      {
        id: 'pkg-st-calc',
        name: 'Scientific Calculator + Grid Pad',
        description: 'Casio FX-991ES Plus class-approved unit + engineering grid pad',
        priceInr: 480,
        unitLabel: 'bundle',
      },
    ],
    reviews: [
      {
        id: 'rev-16',
        studentName: 'Neha Kandari',
        hostelOrArea: 'DBS Girls Hostel',
        rating: 4.8,
        comment: 'Ordered the exam kit right before internals and got it in 20 minutes.',
        createdAt: '2026-11-08T17:50:00.000Z',
      },
    ],
  },
  {
    id: 'svc-campusdesk-supplies',
    name: 'CampusDesk Supplies & Notebooks',
    category: 'Stationery',
    area: 'Chakrata Road',
    distanceLabel: '1.0 km from DBS Campus',
    turnaroundLabel: '40 min delivery',
    turnaroundMinutes: 40,
    operatingHours: '9:00 AM – 9:00 PM',
    summary: 'Spiral notebooks, project presentation folders, and MBA case-prep packs.',
    studentDeal: 'Free same-evening hostel gate delivery on all stationery packs',
    verifiedSince: 'Oct 2026',
    verificationChecklist: [
      'Thick 70 GSM bleed-free paper',
      'Bulk semester discounts available',
      'Direct hostel drop-off',
    ],
    paymentMethods: ['UPI', 'Hostel Gate COD'],
    imageUrl: CATEGORY_IMAGES.Stationery,
    basePriceInr: 120,
    baseUnitLabel: 'per 3-pack',
    rating: 4.7,
    reviewCount: 1,
    packages: [
      {
        id: 'pkg-cd-3pack',
        name: '3-Pack A4 Spiral Subject Notebooks',
        description: 'Three 180-page spiral-bound ruled notebooks for semester lectures',
        priceInr: 120,
        unitLabel: '3 notebooks',
      },
      {
        id: 'pkg-cd-mba',
        name: 'Presentation & File Folder Set',
        description: '5 clear report folders, binder clips, whiteboard marker & pad',
        priceInr: 165,
        unitLabel: 'per set',
      },
    ],
    reviews: [
      {
        id: 'rev-17',
        studentName: 'Kabir Malhotra',
        hostelOrArea: 'DBS Boys Hostel A',
        rating: 4.7,
        comment: 'Notebook paper quality is great and much cheaper than buying singles.',
        createdAt: '2026-11-10T16:15:00.000Z',
      },
    ],
  },
];

const REWARD_TIERS: RewardTier[] = [
  {
    id: 'tier-25',
    title: '₹20 Campus Snack & Print Voucher',
    description: 'Redeem on any tiffin, roll, or spiral printing order of ₹60+.',
    pointsRequired: 25,
    discountInr: 20,
  },
  {
    id: 'tier-50',
    title: '₹45 Hostel Laundry & Meal Credit',
    description: 'Redeem on wash & iron bags, stationery kits, or meal combos.',
    pointsRequired: 50,
    discountInr: 45,
  },
  {
    id: 'tier-100',
    title: '₹95 Shuttle & Mega Bundle Pass',
    description: 'Redeem on Selaqui–Dehradun cabs or weekly hostel meal plans.',
    pointsRequired: 100,
    discountInr: 95,
  },
];

function computePointsForOrder(totalInr: number): number {
  return Math.max(1, Math.round(totalInr / 10));
}

const SEED_BOOKINGS: BookingRecord[] = [
  {
    id: 'CE-1041',
    studentName: 'Kunal Thapa',
    hostelAddress: 'DBS Boys Hostel · Room B-214',
    phone: '9876543210',
    paymentMethod: 'UPI',
    promoCode: 'FIRSTDEAL',
    subtotalInr: 145,
    discountInr: 30,
    convenienceFeeInr: 0,
    totalInr: 115,
    status: 'Completed',
    createdAt: '2026-11-16T09:30:00.000Z',
    estimatedFulfillment: 'Completed · 6 hr same-day',
    pointsEarned: 12,
    items: [
      {
        serviceId: 'svc-cleanfold',
        serviceName: 'CleanFold Hostel Laundry',
        category: 'Laundry',
        packageId: 'pkg-cf-3kg',
        packageName: 'Hostel Weekly Bag (Up to 3 kg)',
        unitPriceInr: 145,
        unitLabel: 'per 3 kg bag',
        quantity: 1,
        timeSlot: 'Morning 8–10 AM',
        imageUrl: CATEGORY_IMAGES.Laundry,
      },
    ],
  },
  {
    id: 'CE-1042',
    studentName: 'Riya Negi',
    hostelAddress: 'DBS Girls Hostel · Main Gate',
    phone: '9812345678',
    paymentMethod: 'Hostel Gate COD',
    promoCode: null,
    subtotalInr: 135,
    discountInr: 0,
    convenienceFeeInr: 0,
    totalInr: 135,
    status: 'In Progress',
    createdAt: '2026-11-18T12:15:00.000Z',
    estimatedFulfillment: '25 min delivery · Afternoon 1–3 PM',
    items: [
      {
        serviceId: 'svc-doon-tiffin',
        serviceName: 'Doon Ghar Ka Tiffin',
        category: 'Food',
        packageId: 'pkg-tiffin-veg',
        packageName: 'Classic Student Veg Thali',
        unitPriceInr: 85,
        unitLabel: 'per meal',
        quantity: 1,
        timeSlot: 'Afternoon 1–3 PM',
        imageUrl: CATEGORY_IMAGES.Food,
      },
      {
        serviceId: 'svc-campus-print',
        serviceName: 'Campus Print & Spiral Hub',
        category: 'Printing',
        packageId: 'pkg-cp-50',
        packageName: '50-Page B&W Notes + Spiral Bind',
        unitPriceInr: 50,
        unitLabel: '50 pages',
        quantity: 1,
        timeSlot: 'Afternoon 1–3 PM',
        imageUrl: CATEGORY_IMAGES.Printing,
      },
    ],
  },
];

interface StoreState {
  services: ServiceProvider[];
  bookings: BookingRecord[];
  partners: PartnerApplication[];
  vouchers: RedeemedVoucher[];
  ledger: LoyaltyLedgerEntry[];
}

function buildSeedLedger(): LoyaltyLedgerEntry[] {
  return [
    {
      id: 'led-seed-1041',
      label: 'Completed Booking CE-1041 (CleanFold Hostel Laundry)',
      pointsDelta: 12,
      bookingId: 'CE-1041',
      createdAt: '2026-11-16T15:30:00.000Z',
    },
  ];
}

function ensureStore(): StoreState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: StoreState = {
      services: SEED_SERVICES,
      bookings: SEED_BOOKINGS,
      partners: [],
      vouchers: [],
      ledger: buildSeedLedger(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoreState;
    const bookings = Array.isArray(parsed.bookings) ? parsed.bookings : SEED_BOOKINGS;
    let ledger = Array.isArray(parsed.ledger) ? parsed.ledger : buildSeedLedger();

    // Backfill pointsEarned on completed bookings if upgrading an existing store file
    for (const b of bookings) {
      if (b.status === 'Completed' && !b.pointsEarned) {
        const pts = computePointsForOrder(b.totalInr);
        b.pointsEarned = pts;
        if (!ledger.some((l) => l.bookingId === b.id && l.pointsDelta > 0)) {
          ledger.push({
            id: `led-${b.id}`,
            label: `Completed Booking ${b.id}`,
            pointsDelta: pts,
            bookingId: b.id,
            createdAt: b.createdAt,
          });
        }
      }
    }

    return {
      services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : SEED_SERVICES,
      bookings,
      partners: Array.isArray(parsed.partners) ? parsed.partners : [],
      vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [],
      ledger,
    };
  } catch {
    const fallback: StoreState = {
      services: SEED_SERVICES,
      bookings: SEED_BOOKINGS,
      partners: [],
      vouchers: [],
      ledger: buildSeedLedger(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function buildLoyaltyState(store: StoreState): LoyaltyState {
  const lifetimePoints = store.ledger
    .filter((entry) => entry.pointsDelta > 0)
    .reduce((sum, entry) => sum + entry.pointsDelta, 0);
  const spentPoints = store.ledger
    .filter((entry) => entry.pointsDelta < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.pointsDelta), 0);
  const availablePoints = Math.max(0, lifetimePoints - spentPoints);
  const completedOrdersCount = store.bookings.filter((b) => b.status === 'Completed').length;

  return {
    availablePoints,
    lifetimePoints,
    completedOrdersCount,
    tiers: REWARD_TIERS,
    vouchers: [...store.vouchers].sort(
      (a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime(),
    ),
    ledger: [...store.ledger].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}

function saveStore(state: StoreState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Ensure initial store exists on boot
  ensureStore();

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ok: true});
  });

  // Get services with optional category, area, search, and sort filters
  app.get('/api/services', (req: Request, res: Response) => {
    const store = ensureStore();
    const category = typeof req.query.category === 'string' ? req.query.category : 'All';
    const area = typeof req.query.area === 'string' ? req.query.area : 'All';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'recommended';

    let list = [...store.services];

    if (category && category !== 'All') {
      list = list.filter((s) => s.category === category);
    }
    if (area && area !== 'All') {
      list = list.filter((s) => s.area === area);
    }
    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.category.toLowerCase().includes(search) ||
          s.summary.toLowerCase().includes(search) ||
          s.area.toLowerCase().includes(search) ||
          s.packages.some((p) => p.name.toLowerCase().includes(search)),
      );
    }

    if (sort === 'price_asc') {
      list.sort((a, b) => a.basePriceInr - b.basePriceInr);
    } else if (sort === 'rating_desc') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'fastest') {
      list.sort((a, b) => a.turnaroundMinutes - b.turnaroundMinutes);
    }

    res.json({services: list});
  });

  // Submit a verified student review for a service provider
  app.post('/api/services/:id/reviews', (req: Request, res: Response) => {
    const store = ensureStore();
    const service = store.services.find((s) => s.id === req.params.id);
    if (!service) {
      res.status(404).json({error: 'Service provider not found.'});
      return;
    }

    const {studentName, hostelOrArea, rating, comment, bookingId} = req.body as {
      studentName?: string;
      hostelOrArea?: string;
      rating?: number;
      comment?: string;
      bookingId?: string;
    };

    const cleanName = (studentName || '').trim();
    const cleanComment = (comment || '').trim();
    const numericRating = Number(rating);

    if (!cleanName || !cleanComment || Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      res.status(400).json({error: 'Please enter your name, rating (1-5), and a short review.'});
      return;
    }

    let updatedBooking: BookingRecord | null = null;
    if (bookingId) {
      const booking = store.bookings.find((b) => b.id === bookingId);
      if (booking) {
        if (booking.status !== 'Completed') {
          res.status(400).json({error: 'Only completed orders can be reviewed.'});
          return;
        }
        const reviewed = booking.reviewedServiceIds || [];
        if (reviewed.includes(service.id)) {
          res.status(409).json({error: 'You have already reviewed this service for this booking.'});
          return;
        }
        booking.reviewedServiceIds = [...reviewed, service.id];
        updatedBooking = booking;
      }
    }

    const newReview: ServiceReview = {
      id: `rev-${Date.now()}`,
      studentName: cleanName,
      hostelOrArea: (hostelOrArea || 'DBS Campus').trim(),
      rating: numericRating,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
    };

    service.reviews = [newReview, ...service.reviews];
    service.reviewCount = service.reviews.length;
    const avg = service.reviews.reduce((sum, r) => sum + r.rating, 0) / service.reviews.length;
    service.rating = Number(avg.toFixed(1));

    saveStore(store);
    res.status(201).json({service, review: newReview, booking: updatedBooking});
  });

  // Get all bookings
  app.get('/api/bookings', (_req: Request, res: Response) => {
    const store = ensureStore();
    const bookings = [...store.bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    res.json({bookings});
  });

  // Create a booking
  app.post('/api/bookings', (req: Request, res: Response) => {
    const store = ensureStore();
    const {
      studentName,
      hostelAddress,
      phone,
      paymentMethod,
      promoCode,
      items,
    } = req.body as Partial<BookingRecord>;

    if (!studentName?.trim() || !hostelAddress?.trim() || !phone?.trim()) {
      res.status(400).json({error: 'Student name, hostel/PG location, and phone number are required.'});
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({error: 'Your booking bag is empty.'});
      return;
    }

    const subtotalInr = items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
    const normalizedPromo = (promoCode || '').trim().toUpperCase();

    let discountInr = 0;
    let appliedCode: string | null = null;
    const matchedVoucher = store.vouchers.find(
      (v) => v.code.toUpperCase() === normalizedPromo && !v.usedInBookingId,
    );

    if (matchedVoucher) {
      discountInr = Math.min(subtotalInr, matchedVoucher.discountInr);
      appliedCode = matchedVoucher.code;
    } else if (normalizedPromo === 'FIRSTDEAL' && subtotalInr >= 100) {
      discountInr = 30;
      appliedCode = 'FIRSTDEAL';
    }

    const convenienceFeeInr = 0;
    const totalInr = Math.max(0, subtotalInr - discountInr + convenienceFeeInr);

    const nextNum = 1041 + store.bookings.length + 1;
    const firstSlot = items[0]?.timeSlot || 'Next available slot';

    const newBooking: BookingRecord = {
      id: `CE-${nextNum}`,
      studentName: studentName.trim(),
      hostelAddress: hostelAddress.trim(),
      phone: phone.trim(),
      paymentMethod: paymentMethod === 'Hostel Gate COD' ? 'Hostel Gate COD' : 'UPI',
      promoCode: appliedCode,
      rewardVoucherCode: matchedVoucher ? matchedVoucher.code : null,
      subtotalInr,
      discountInr,
      convenienceFeeInr,
      totalInr,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      estimatedFulfillment: `Confirmed · ${firstSlot}`,
      items,
    };

    if (matchedVoucher) {
      matchedVoucher.usedInBookingId = newBooking.id;
    }

    store.bookings.unshift(newBooking);
    saveStore(store);

    res.status(201).json({booking: newBooking, loyalty: buildLoyaltyState(store)});
  });

  // Update booking status (Confirm -> In Progress -> Completed / Cancelled)
  app.patch('/api/bookings/:id', (req: Request, res: Response) => {
    const store = ensureStore();
    const booking = store.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({error: 'Booking not found.'});
      return;
    }

    const {status} = req.body as {status?: BookingStatus};
    const allowed: BookingStatus[] = ['Confirmed', 'In Progress', 'Completed', 'Cancelled'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({error: 'Invalid booking status.'});
      return;
    }

    booking.status = status;
    if (status === 'Completed') {
      booking.estimatedFulfillment = 'Completed at campus gate';
      if (!booking.pointsEarned) {
        const pts = computePointsForOrder(booking.totalInr);
        booking.pointsEarned = pts;
        const primaryService = booking.items[0]?.serviceName || 'Campus Service';
        store.ledger.unshift({
          id: `led-${booking.id}-${Date.now()}`,
          label: `Completed Booking ${booking.id} (${primaryService})`,
          pointsDelta: pts,
          bookingId: booking.id,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (status === 'Cancelled') {
      booking.estimatedFulfillment = 'Cancelled by student';
    } else if (status === 'In Progress') {
      booking.estimatedFulfillment = 'Provider preparing / en route';
    }

    saveStore(store);
    res.json({booking, loyalty: buildLoyaltyState(store)});
  });

  // Loyalty & Rewards endpoints
  app.get('/api/rewards', (_req: Request, res: Response) => {
    const store = ensureStore();
    res.json({loyalty: buildLoyaltyState(store)});
  });

  app.post('/api/rewards/redeem', (req: Request, res: Response) => {
    const store = ensureStore();
    const {tierId} = req.body as {tierId?: string};
    const tier = REWARD_TIERS.find((t) => t.id === tierId);
    if (!tier) {
      res.status(404).json({error: 'Reward tier not found.'});
      return;
    }

    const currentLoyalty = buildLoyaltyState(store);
    if (currentLoyalty.availablePoints < tier.pointsRequired) {
      res.status(400).json({
        error: `You need ${tier.pointsRequired - currentLoyalty.availablePoints} more points to unlock this reward.`,
      });
      return;
    }

    const suffix = String(Date.now()).slice(-4);
    const voucher: RedeemedVoucher = {
      code: `CE-RWD-${tier.discountInr}-${suffix}`,
      tierId: tier.id,
      title: tier.title,
      discountInr: tier.discountInr,
      pointsSpent: tier.pointsRequired,
      redeemedAt: new Date().toISOString(),
      usedInBookingId: null,
    };

    store.vouchers.unshift(voucher);
    store.ledger.unshift({
      id: `led-redeem-${Date.now()}`,
      label: `Redeemed ${tier.title} (${voucher.code})`,
      pointsDelta: -tier.pointsRequired,
      createdAt: new Date().toISOString(),
    });

    saveStore(store);
    res.status(201).json({voucher, loyalty: buildLoyaltyState(store)});
  });

  // Register a new local service provider (Pilot Partner Onboarding)
  app.post('/api/partners', (req: Request, res: Response) => {
    const store = ensureStore();
    const {
      businessName,
      ownerName,
      category,
      area,
      phone,
      startingPriceInr,
      serviceSummary,
      studentDeal,
    } = req.body as Partial<PartnerApplication>;

    if (!businessName?.trim() || !ownerName?.trim() || !phone?.trim() || !serviceSummary?.trim()) {
      res.status(400).json({error: 'Please complete all required business details.'});
      return;
    }

    const validCategories: ServiceCategory[] = ['Food', 'Laundry', 'Printing', 'Transport', 'Stationery'];
    const safeCategory: ServiceCategory = validCategories.includes(category as ServiceCategory)
      ? (category as ServiceCategory)
      : 'Food';

    const validAreas: CampusArea[] = ['DBS Campus Gate', 'Selaqui Market', 'Chakrata Road', 'Prem Nagar'];
    const safeArea: CampusArea = validAreas.includes(area as CampusArea)
      ? (area as CampusArea)
      : 'Selaqui Market';

    const price = Math.max(20, Math.min(5000, Number(startingPriceInr) || 80));

    const application: PartnerApplication = {
      id: `prt-${Date.now()}`,
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      category: safeCategory,
      area: safeArea,
      phone: phone.trim(),
      startingPriceInr: price,
      serviceSummary: serviceSummary.trim(),
      studentDeal: (studentDeal || 'Student-friendly pilot pricing').trim(),
      createdAt: new Date().toISOString(),
    };

    const newService: ServiceProvider = {
      id: `svc-${Date.now()}`,
      name: application.businessName,
      category: safeCategory,
      area: safeArea,
      distanceLabel: `Partner near ${safeArea}`,
      turnaroundLabel: '30 min avg',
      turnaroundMinutes: 30,
      operatingHours: '8:00 AM – 9:30 PM',
      summary: application.serviceSummary,
      studentDeal: application.studentDeal,
      verifiedSince: 'Nov 2026',
      verificationChecklist: [
        'Local Selaqui pilot partner',
        'Upfront student rate card locked',
        'UPI & Hostel Gate COD supported',
      ],
      paymentMethods: ['UPI', 'Hostel Gate COD'],
      imageUrl: CATEGORY_IMAGES[safeCategory],
      basePriceInr: price,
      baseUnitLabel: 'per service',
      rating: 4.8,
      reviewCount: 1,
      packages: [
        {
          id: `pkg-${Date.now()}-1`,
          name: `${application.businessName} Standard Pack`,
          description: application.serviceSummary,
          priceInr: price,
          unitLabel: 'per service',
        },
      ],
      reviews: [
        {
          id: `rev-${Date.now()}`,
          studentName: 'CampusEase Pilot Desk',
          hostelOrArea: safeArea,
          rating: 4.8,
          comment: `Verified onboarding completed with ${application.ownerName}.`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    store.partners.unshift(application);
    store.services.unshift(newService);
    saveStore(store);

    res.status(201).json({application, service: newService});
  });

  // Pilot summary metrics derived from real store state
  app.get('/api/pilot-summary', (_req: Request, res: Response) => {
    const store = ensureStore();
    const totalBookings = store.bookings.length;
    const completedBookings = store.bookings.filter((b) => b.status === 'Completed').length;
    const avgRating =
      store.services.reduce((sum, s) => sum + s.rating, 0) / Math.max(1, store.services.length);
    const totalSavings = store.bookings.reduce((sum, b) => sum + b.discountInr, 0);

    res.json({
      verifiedProviders: store.services.length,
      totalBookings,
      completedBookings,
      averageRating: Number(avgRating.toFixed(1)),
      totalStudentSavingsInr: totalSavings,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusEase server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
