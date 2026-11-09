import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, Plus, Send, Tag, X } from 'lucide-react';

const STORY_MIN = 100;
const MAX_TAGS = 5;

const fieldBase =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-primary outline-none transition placeholder:text-slate-400 focus:ring-4';
const fieldOk = 'border-slate-200 focus:border-brand focus:ring-brand/10';
const fieldBad = 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100';

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
      <AlertCircle size={12} /> {children}
    </p>
  );
}

/** Downscale an uploaded picture so it can travel with the post as a data URL. */
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const ratio = image.width / image.height;
      const width = Math.min(1200, image.width);
      const height = Math.max(1, Math.round(width / ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('That file is not a readable image.'));
    };

    image.src = objectUrl;
  });
}

const JourneyForm = ({
  initial,
  tagSuggestions = [],
  onSubmit,
  onSuccess,
  submitLabel = 'Publish story',
}) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [story, setStory] = useState(initial?.story || '');
  const [tags, setTags] = useState(initial?.tags || []);
  const [tagDraft, setTagDraft] = useState('');
  const [allowContact, setAllowContact] = useState(initial?.allowContact !== false);
  const [image, setImage] = useState(initial?.photo || initial?.image || null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formStartedAt = useRef(Date.now());
  const formRef = useRef(null);

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  const storyCount = story.trim().length;
  const remaining = Math.max(0, STORY_MIN - storyCount);

  const suggestions = useMemo(
    () =>
      tagSuggestions
        .map((entry) => (typeof entry === 'string' ? entry : entry.name))
        .filter((tag) => tag && !tags.some((selected) => selected.toLowerCase() === tag.toLowerCase()))
        .slice(0, 8),
    [tagSuggestions, tags],
  );

  const addTag = (raw) => {
    const value = String(raw || '')
      .replace(/\s+/g, ' ')
      .replace(/^#/, '')
      .trim()
      .slice(0, 24);
    if (!value) return;
    if (tags.length >= MAX_TAGS) {
      setErrors((prev) => ({ ...prev, tags: `You can add up to ${MAX_TAGS} tags.` }));
      return;
    }
    if (tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setTagDraft('');
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagDraft('');
    setErrors((prev) => ({ ...prev, tags: undefined }));
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((entry) => entry !== tag));

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file (PNG, JPEG or WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError('That image is larger than 8 MB. Please pick a smaller one.');
      return;
    }

    setImageError('');
    setImageBusy(true);
    try {
      setImage(await readPhoto(file));
    } catch (error) {
      setImageError(error.message);
    } finally {
      setImageBusy(false);
    }
  };

  const validate = () => {
    const next = {};
    if (title.trim().length < 4) next.title = 'Give your post a title (at least 4 characters).';
    if (storyCount < STORY_MIN) next.story = `Add at least ${STORY_MIN} characters — ${remaining} to go.`;
    if (!tags.length) next.tags = 'Add at least one tag.';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0];
      formRef.current?.querySelector(`[name="${firstField}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const data = await onSubmit({
        title: title.trim(),
        story: story.trim(),
        tags,
        allowContact,
        photo: image,
        formStartedAt: formStartedAt.current,
      });
      onSuccess?.(data);
    } catch (error) {
      const body = error?.response?.data;
      if (body?.errors) setErrors(body.errors);
      setFormError(body?.message || 'We could not save your post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="community-website">Website</label>
        <input id="community-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {formError}
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-bold text-primary">Cover image (optional)</span>
        <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/60">
          {image ? (
            <div className="relative">
              <img src={image} alt="Cover preview" className="max-h-64 w-full object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove cover image"
                className="absolute right-2 top-2 rounded-full bg-primary/90 p-1.5 text-white shadow-sm transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
                <ImagePlus size={20} />
              </span>
              <p className="text-xs text-text-muted">
                A photo of the campus, the offer letter, the city — anything that tells the story faster.
              </p>
            </div>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-text-muted transition hover:border-accent hover:text-primary focus-within:ring-2 focus-within:ring-accent">
            {imageBusy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {image ? 'Replace image' : 'Add a cover image'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} className="sr-only" />
          </label>
          <p className="text-xs text-text-muted">Your profile picture is added to the post automatically.</p>
        </div>
        {imageError && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
            {imageError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-bold text-primary">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={140}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'title-error' : 'title-count'}
          className={`${fieldBase} ${errors.title ? fieldBad : fieldOk}`}
          placeholder="e.g. How I won a fully funded master’s in Germany"
        />
        <div className="mt-1 flex items-center justify-between gap-3">
          <FieldError id="title-error">{errors.title}</FieldError>
          <span id="title-count" className="ml-auto text-xs text-text-muted">
            {title.length}/140
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="story" className="mb-1.5 block text-sm font-bold text-primary">
          Your story <span className="text-red-500">*</span>
        </label>
        <textarea
          id="story"
          name="story"
          value={story}
          onChange={(event) => setStory(event.target.value)}
          rows={12}
          aria-invalid={Boolean(errors.story)}
          aria-describedby={errors.story ? 'story-error' : 'story-hint'}
          className={`${fieldBase} ${errors.story ? fieldBad : fieldOk} resize-y leading-relaxed`}
          placeholder={'Tell us how it really went — the doubts, the deadlines, the small wins.\n\nMarkdown works: **bold**, lists and links are all fine.'}
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <FieldError id="story-error">{errors.story}</FieldError>
          <p id="story-hint" className="ml-auto text-xs text-text-muted">
            {storyCount < STORY_MIN ? `${remaining} more characters needed` : `${storyCount.toLocaleString()} characters`}
          </p>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-bold text-primary">Tags <span className="text-red-500">*</span></span>
        <div
          className={`flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition focus-within:ring-4 ${
            errors.tags ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-brand focus-within:ring-brand/10'
          }`}
        >
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-accent">
              <Tag size={10} /> {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="rounded-full p-0.5 transition hover:bg-accent/15 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <input
            name="tags"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addTag(tagDraft);
              } else if (event.key === 'Backspace' && !tagDraft && tags.length) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            onBlur={() => addTag(tagDraft)}
            aria-label="Add a tag and press Enter"
            aria-invalid={Boolean(errors.tags)}
            placeholder={tags.length ? 'Add another…' : 'e.g. Scholarships, SOP, Visa'}
            maxLength={24}
            className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-primary outline-none placeholder:text-slate-400"
          />
        </div>
        <FieldError id="tags-error">{errors.tags}</FieldError>

        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-text-muted">Suggestions:</span>
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-text-muted transition hover:border-accent hover:text-primary"
              >
                <Plus size={10} /> {tag}
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-text-muted">Up to {MAX_TAGS} tags. Press Enter after each one.</p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <input
          type="checkbox"
          checked={allowContact}
          onChange={(event) => setAllowContact(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-accent accent-accent focus:ring-accent"
        />
        <span className="text-sm text-text-main">
          <span className="font-semibold">Let readers connect with me</span>
          <span className="mt-0.5 block text-xs text-text-muted">
            Readers send a message through StudyBridge and your email is only used to reply — it is never shown on the post.
          </span>
        </span>
      </label>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-muted">
          Your post goes live right away. You can delete it whenever you like.
        </p>
        <button
          type="submit"
          disabled={submitting || imageBusy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          {submitting ? 'Publishing…' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default JourneyForm;
