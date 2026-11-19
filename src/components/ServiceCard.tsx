import {Check, Plus, Scale, Star} from 'lucide-react';
import type {ServiceProvider} from '../types';
import {ServiceImage} from './ServiceImage';

interface ServiceCardProps {
  service: ServiceProvider;
  isCompared: boolean;
  justAdded: boolean;
  onToggleCompare: (serviceId: string) => void;
  onQuickAdd: (service: ServiceProvider) => void;
  onOpenDetail: (service: ServiceProvider) => void;
}

export function ServiceCard({
  service,
  isCompared,
  justAdded,
  onToggleCompare,
  onQuickAdd,
  onOpenDetail,
}: ServiceCardProps) {
  return (
    <article className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700">
      <button
        type="button"
        onClick={() => onOpenDetail(service)}
        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14532D] dark:focus-visible:ring-emerald-500 cursor-pointer"
      >
        <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <ServiceImage
            src={service.imageUrl}
            alt={`${service.name} — ${service.category} service in ${service.area}`}
            category={service.category}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </div>
      </button>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
          <span>{service.category}</span>
          <span aria-hidden="true">·</span>
          <span>{service.area}</span>
          <span aria-hidden="true">·</span>
          <span>{service.turnaroundLabel}</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenDetail(service)}
          className="mt-1.5 text-left cursor-pointer focus-visible:outline-none focus-visible:underline"
        >
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#14532D] dark:group-hover:text-emerald-400 transition-colors leading-snug">
            {service.name}
          </h3>
        </button>

        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
          {service.summary}
        </p>

        <p className="mt-3 text-xs font-medium text-[#14532D] dark:text-emerald-400 line-clamp-1">
          {service.studentDeal}
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
          <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">{service.rating.toFixed(1)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {service.reviewCount} {service.reviewCount === 1 ? 'review' : 'reviews'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Verified</span>
        </div>

        <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              ₹{service.basePriceInr}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{service.baseUnitLabel}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleCompare(service.id)}
              aria-pressed={isCompared}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D] dark:focus-visible:ring-emerald-500 ${
                isCompared
                  ? 'border-[#14532D] dark:border-emerald-500 bg-[#14532D]/10 dark:bg-emerald-500/15 text-[#14532D] dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{isCompared ? 'Compared' : 'Compare'}</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickAdd(service)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D] dark:focus-visible:ring-emerald-500 ${
                justAdded
                  ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                  : 'bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
