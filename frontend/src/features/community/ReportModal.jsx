import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Flag, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { communityApi } from '../../services/api';

const REASONS = [
  'Spam or advertising',
  'Harassment or hate speech',
  'Offensive content',
  'False or misleading',
  'Privacy concern',
  'Something else',
];

const ReportModal = ({ open, onClose, journey }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError('');
    setReason(REASONS[0]);
    setDetails('');
    setReporterEmail('');
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await communityApi.report(journey.slug, { reason, details: details.trim(), reporterEmail: reporterEmail.trim() });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'The report could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Flag}
      title="Report this post"
      description="Reports go straight to the moderators. The author is not told who reported them."
    >
      {done ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-3 text-lg font-extrabold text-primary">Thanks for flagging this</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
            A moderator will review “{journey?.title}”. You can keep reading other journeys in the meantime.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <fieldset>
            <legend className="mb-1.5 text-sm font-bold text-primary">What is wrong?</legend>
            <div className="space-y-1.5">
              {REASONS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    reason === option ? 'border-accent bg-secondary/60 text-primary' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option}
                    checked={reason === option}
                    onChange={() => setReason(option)}
                    className="h-4 w-4 accent-accent"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="report-details" className="mb-1.5 block text-sm font-bold text-primary">
              Anything else? (optional)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-primary outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
              placeholder="Add details that would help a moderator."
            />
          </div>

          <div>
            <label htmlFor="reporter-email" className="mb-1.5 block text-sm font-bold text-primary">
              Your email (optional)
            </label>
            <input
              id="reporter-email"
              type="email"
              value={reporterEmail}
              onChange={(event) => setReporterEmail(event.target.value)}
              maxLength={255}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-primary outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
              placeholder="Only used if we need to follow up."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-semibold text-text-muted transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Flag size={14} />}
              {submitting ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ReportModal;
