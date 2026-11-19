import {useState, type FormEvent} from 'react';
import {CheckCircle2, X} from 'lucide-react';
import {submitPartnerApplication} from '../lib/campusApi';
import type {CampusArea, ServiceCategory, ServiceProvider} from '../types';

interface PartnerModalProps {
  open: boolean;
  onClose: () => void;
  onPartnerCreated: (service: ServiceProvider) => void;
}

const CATEGORIES: ServiceCategory[] = [
  'Food',
  'Laundry',
  'Printing',
  'Transport',
  'Stationery',
];

const AREAS: CampusArea[] = [
  'DBS Campus Gate',
  'Selaqui Market',
  'Chakrata Road',
  'Prem Nagar',
];

export function PartnerModal({open, onClose, onPartnerCreated}: PartnerModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Food');
  const [area, setArea] = useState<CampusArea>('Selaqui Market');
  const [phone, setPhone] = useState('');
  const [startingPriceInr, setStartingPriceInr] = useState('75');
  const [serviceSummary, setServiceSummary] = useState('');
  const [studentDeal, setStudentDeal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await submitPartnerApplication({
        businessName,
        ownerName,
        category,
        area,
        phone,
        startingPriceInr: Number(startingPriceInr),
        serviceSummary,
        studentDeal,
      });
      setCreatedName(data.service.name);
      onPartnerCreated(data.service);
      setBusinessName('');
      setOwnerName('');
      setPhone('');
      setServiceSummary('');
      setStudentDeal('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit partner listing.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setCreatedName(null);
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-modal-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id="partner-modal-title" className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Join CampusEase as a Local Partner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reach 3,000+ DBS Global University &amp; Selaqui students with zero listing fee.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close partner onboarding"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {createdName ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="w-10 h-10 text-[#14532D] dark:text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {createdName} is now live in the pilot catalog
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Students around DBS Global University and Selaqui can now discover, compare, and
                  book your service.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
              >
                View Live in Marketplace
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="p-biz" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Business Name
                  </label>
                  <input
                    id="p-biz"
                    type="text"
                    required
                    placeholder="e.g. Selaqui Fresh Tiffins"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="p-owner" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Owner / Manager Name
                  </label>
                  <input
                    id="p-owner"
                    type="text"
                    required
                    placeholder="e.g. Rajesh Rawat"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="p-cat" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    id="p-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-area" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Campus Area
                  </label>
                  <select
                    id="p-area"
                    value={area}
                    onChange={(e) => setArea(e.target.value as CampusArea)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-price" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Starting Price (₹)
                  </label>
                  <input
                    id="p-price"
                    type="number"
                    min={20}
                    max={5000}
                    required
                    value={startingPriceInr}
                    onChange={(e) => setStartingPriceInr(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="p-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Business WhatsApp / Phone
                </label>
                <input
                  id="p-phone"
                  type="tel"
                  required
                  placeholder="10-digit contact number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="p-summary" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Service Description
                </label>
                <input
                  id="p-summary"
                  type="text"
                  required
                  placeholder="What do you offer and how fast do you deliver/complete?"
                  value={serviceSummary}
                  onChange={(e) => setServiceSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="p-deal" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Student-Exclusive Deal (Optional)
                </label>
                <input
                  id="p-deal"
                  type="text"
                  placeholder="e.g. Free hostel gate delivery or 10% student off"
                  value={studentDeal}
                  onChange={(e) => setStudentDeal(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Publishing Partner...' : 'Publish Verified Partner Listing'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
