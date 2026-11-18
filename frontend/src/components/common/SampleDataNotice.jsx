import { Info } from 'lucide-react';

/**
 * Shown whenever a page is rendering its built-in placeholder dataset because
 * the API/database could not be reached, so sample records are never mistaken
 * for real ones.
 */
const SampleDataNotice = ({ what = 'results' }) => (
  <div
    role="status"
    className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 shadow-2xs"
  >
    <Info size={16} className="mt-0.5 shrink-0 text-amber-600" />
    <p className="leading-relaxed">
      <span className="font-extrabold uppercase tracking-wider">Sample data</span> — the live database is not
      reachable right now, so these {what} are placeholders and not real records.
    </p>
  </div>
);

export default SampleDataNotice;
