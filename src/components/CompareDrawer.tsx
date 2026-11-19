import {Plus, Star, Trash2, X} from 'lucide-react';
import type {ServiceProvider} from '../types';

interface CompareDrawerProps {
  open: boolean;
  services: ServiceProvider[];
  allServices: ServiceProvider[];
  onClose: () => void;
  onToggleCompare: (serviceId: string) => void;
  onQuickAdd: (service: ServiceProvider) => void;
}

export function CompareDrawer({
  open,
  services,
  allServices,
  onClose,
  onToggleCompare,
  onQuickAdd,
}: CompareDrawerProps) {
  if (!open) return null;

  const suggestions = allServices
    .filter((s) => !services.some((c) => c.id === s.id))
    .slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 id="compare-modal-title" className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Side-by-Side Service Comparison
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compare up to 3 local providers on price, turnaround, distance, and verified ratings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto p-6 flex-1">
          {services.length === 0 ? (
            <div className="text-center py-8 max-w-lg mx-auto">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                No providers selected for comparison yet.
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Click Compare on any service card, or select from popular campus providers below:
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onToggleCompare(s.id)}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#14532D] dark:hover:border-emerald-500 bg-[#F6F7F6] dark:bg-slate-800/70 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {s.category} · ₹{s.basePriceInr}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-40 align-top">
                      Metric
                    </th>
                    {services.map((s) => (
                      <th key={s.id} className="py-3 px-4 min-w-[220px] align-top">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {s.category} · {s.area}
                            </span>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                              {s.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleCompare(s.id)}
                            aria-label={`Remove ${s.name} from comparison`}
                            className="p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  <tr>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">Starting Price</td>
                    {services.map((s) => (
                      <td key={s.id} className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        ₹{s.basePriceInr}{' '}
                        <span className="font-normal text-xs text-slate-500 dark:text-slate-400">{s.baseUnitLabel}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Turnaround / Delivery
                    </td>
                    {services.map((s) => (
                      <td key={s.id} className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        {s.turnaroundLabel}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Campus Distance
                    </td>
                    {services.map((s) => (
                      <td key={s.id} className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        {s.distanceLabel}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Student Rating
                    </td>
                    {services.map((s) => (
                      <td key={s.id} className="py-3.5 px-4 text-slate-900 dark:text-slate-100 tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
                          {s.rating.toFixed(1)}
                        </span>{' '}
                        <span className="text-xs text-slate-500 dark:text-slate-400">({s.reviewCount} reviews)</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">Student Deal</td>
                    {services.map((s) => (
                      <td key={s.id} className="py-3.5 px-4 text-xs font-medium text-[#14532D] dark:text-emerald-400">
                        {s.studentDeal}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Operating Hours
                    </td>
                    {services.map((s) => (
                      <td key={s.id} className="py-3.5 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                        {s.operatingHours}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">Action</td>
                    {services.map((s) => (
                      <td key={s.id} className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            onQuickAdd(s);
                            onClose();
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Add to Bag — ₹{s.basePriceInr}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
