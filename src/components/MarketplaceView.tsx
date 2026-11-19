import {Scale, Search} from 'lucide-react';
import type {
  CampusArea,
  LoyaltyState,
  ServiceCategory,
  ServiceProvider,
} from '../types';
import {RewardsSection} from './RewardsSection';
import {ServiceCard} from './ServiceCard';

interface MarketplaceViewProps {
  services: ServiceProvider[];
  loading: boolean;
  loadError: string | null;
  activeCategory: 'All' | ServiceCategory;
  activeArea: 'All' | CampusArea;
  searchQuery: string;
  sortBy: 'recommended' | 'price_asc' | 'rating_desc' | 'fastest';
  compareIds: string[];
  recentlyAddedId: string | null;
  bookingsCount: number;
  pendingOrdersCount: number;
  loyalty: LoyaltyState | null;
  onCategoryChange: (cat: 'All' | ServiceCategory) => void;
  onAreaChange: (area: 'All' | CampusArea) => void;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: 'recommended' | 'price_asc' | 'rating_desc' | 'fastest') => void;
  onResetFilters: () => void;
  onRetryLoad: () => void;
  onToggleCompare: (serviceId: string) => void;
  onQuickAdd: (service: ServiceProvider) => void;
  onOpenDetail: (service: ServiceProvider) => void;
  onOpenCompare: () => void;
  onOpenBookings: () => void;
  onLoyaltyUpdated: (next: LoyaltyState) => void;
  onApplyVoucherToBag: (code: string) => void;
}

const CATEGORIES: Array<'All' | ServiceCategory> = [
  'All',
  'Food',
  'Laundry',
  'Printing',
  'Transport',
  'Stationery',
];

const AREAS: Array<'All' | CampusArea> = [
  'All',
  'DBS Campus Gate',
  'Selaqui Market',
  'Chakrata Road',
  'Prem Nagar',
];

export function MarketplaceView({
  services,
  loading,
  loadError,
  activeCategory,
  activeArea,
  searchQuery,
  sortBy,
  compareIds,
  recentlyAddedId,
  bookingsCount,
  pendingOrdersCount,
  loyalty,
  onCategoryChange,
  onAreaChange,
  onSearchChange,
  onSortChange,
  onResetFilters,
  onRetryLoad,
  onToggleCompare,
  onQuickAdd,
  onOpenDetail,
  onOpenCompare,
  onOpenBookings,
  onLoyaltyUpdated,
  onApplyVoucherToBag,
}: MarketplaceViewProps) {
  return (
    <>
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Verified Local Services
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Compare rates, turnaround times, and student reviews—and earn loyalty points on every
              completed order.
            </p>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={onOpenCompare}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap cursor-pointer"
            >
              Compare ({compareIds.length}/3)
            </button>
            <button
              type="button"
              onClick={onOpenBookings}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap cursor-pointer"
            >
              My Bookings ({bookingsCount})
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Service categories"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl"
            >
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onCategoryChange(cat)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {compareIds.length > 0 && (
              <button
                type="button"
                onClick={onOpenCompare}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#14532D] dark:text-emerald-300 bg-[#14532D]/10 dark:bg-emerald-500/15 hover:bg-[#14532D]/15 dark:hover:bg-emerald-500/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Open Side-by-Side Comparison ({compareIds.length}/3)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tiffin, laundry, spiral print, ISBT cab, stationery..."
                aria-label="Search local campus services"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={activeArea}
                onChange={(e) => onAreaChange(e.target.value as 'All' | CampusArea)}
                aria-label="Filter by campus area"
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
              >
                {AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area === 'All' ? 'All Campus Areas' : area}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={sortBy}
                onChange={(e) =>
                  onSortChange(
                    e.target.value as 'recommended' | 'price_asc' | 'rating_desc' | 'fastest',
                  )
                }
                aria-label="Sort services"
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="rating_desc">Rating: Highest First</option>
                <option value="fastest">Fastest Turnaround</option>
              </select>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({length: 6}).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/70 rounded" />
                  <div className="h-8 w-full bg-slate-100 dark:bg-slate-800/70 rounded pt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-8 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{loadError}</p>
            <button
              type="button"
              onClick={onRetryLoad}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg cursor-pointer"
            >
              Retry Loading Services
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="mt-8 p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-3">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No verified providers match your filters
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Try clearing your search term or switching back to all campus areas.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isCompared={compareIds.includes(service.id)}
                justAdded={recentlyAddedId === service.id}
                onToggleCompare={onToggleCompare}
                onQuickAdd={onQuickAdd}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        )}
      </section>

      <RewardsSection
        loyalty={loyalty}
        pendingOrdersCount={pendingOrdersCount}
        onLoyaltyUpdated={onLoyaltyUpdated}
        onApplyVoucherToBag={onApplyVoucherToBag}
        onOpenBookings={onOpenBookings}
      />
    </>
  );
}
