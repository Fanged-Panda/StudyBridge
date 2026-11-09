import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, Send } from 'lucide-react';
import Modal from './Modal';
import { communityApi } from '../../services/api';

const fieldBase =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-primary outline-none transition placeholder:text-slate-400 focus:ring-4';
const fieldOk = 'border-slate-200 focus:border-brand focus:ring-brand/10';
const fieldBad = 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100';

const ContactAuthorModal = ({ open, onClose, journey }) => {
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!open) return;
    startedAt.current = Date.now();
    setSent(null);
    setErrors({});
    setFormError('');
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const next = {};
    if (senderName.trim().length < 2) next.senderName = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(senderEmail.trim())) next.senderEmail = 'Enter a valid email address.';
    if (message.trim().length < 20) next.message = 'Write at least 20 characters so the author can reply usefully.';

    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const data = await communityApi.contact(journey.slug, {
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim().toLowerCase(),
        message: message.trim(),
        formStartedAt: startedAt.current,
      });
      setSent(data);
      setSenderName('');
      setSenderEmail('');
      setMessage('');
    } catch (error) {
      const body = error?.response?.data;
      if (body?.errors) setErrors(body.errors);
      setFormError(body?.message || 'Your message could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Mail}
      title={`Connect with ${journey?.author?.name}`}
      description={`Send a private message about “${journey?.title}”. Your email is shared only with this author.`}
    >
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-3 text-lg font-extrabold text-primary">Message sent</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
            {sent.delivered
              ? `${journey?.author?.name} has your message and can reply straight to your inbox.`
              : `Your message is saved, but this site's email service is not configured yet, so ${journey?.author?.name} has not been emailed.`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="senderName" className="mb-1.5 block text-sm font-bold text-primary">
                Your name <span className="text-red-500">*</span>
              </label>
              <input
                id="senderName"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                autoComplete="name"
                maxLength={100}
                aria-invalid={Boolean(errors.senderName)}
                aria-describedby={errors.senderName ? 'senderName-error' : undefined}
                className={`${fieldBase} ${errors.senderName ? fieldBad : fieldOk}`}
                placeholder="Your name"
              />
              {errors.senderName && (
                <p id="senderName-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
                  {errors.senderName}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="senderEmail" className="mb-1.5 block text-sm font-bold text-primary">
                Your email <span className="text-red-500">*</span>
              </label>
              <input
                id="senderEmail"
                type="email"
                value={senderEmail}
                onChange={(event) => setSenderEmail(event.target.value)}
                autoComplete="email"
                maxLength={255}
                aria-invalid={Boolean(errors.senderEmail)}
                aria-describedby={errors.senderEmail ? 'senderEmail-error' : undefined}
                className={`${fieldBase} ${errors.senderEmail ? fieldBad : fieldOk}`}
                placeholder="you@example.com"
              />
              {errors.senderEmail && (
                <p id="senderEmail-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
                  {errors.senderEmail}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="contactMessage" className="mb-1.5 block text-sm font-bold text-primary">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="contactMessage"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              maxLength={4000}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? 'contactMessage-error' : 'contactMessage-hint'}
              className={`${fieldBase} ${errors.message ? fieldBad : fieldOk} resize-y leading-relaxed`}
              placeholder={`Hi ${journey?.author?.name?.split(' ')[0] || 'there'}, your story resonated with me…`}
            />
            {errors.message ? (
              <p id="contactMessage-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
                {errors.message}
              </p>
            ) : (
              <p id="contactMessage-hint" className="mt-1.5 text-right text-xs text-text-muted">
                {message.length}/4000
              </p>
            )}
          </div>

          <p className="flex items-start gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-text-muted">
            <Lock size={12} className="mt-0.5 shrink-0 text-accent" />
            {journey?.author?.name?.split(' ')[0] || 'The author'} sees your name, email and message — never the other way around
            unless they reply.
          </p>

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
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ContactAuthorModal;
