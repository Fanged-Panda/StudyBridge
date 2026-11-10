/**
 * Shared helpers for the "Check fit" buttons on universities and scholarships.
 *
 * The AI advisor already receives the signed-in student's profile and the full
 * university/scholarship directory from the backend, so a fit check is just a
 * structured opening message naming the exact item the student is looking at.
 */

const PENDING_KEY = 'studybridge:pendingFitCheck';

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const money = (value) =>
  value === 0 ? 'Free / fully funded' : value ? `$${Number(value).toLocaleString()} per year` : 'Not listed';

export function buildUniversityFitPrompt(university = {}) {
  const courses = list(university.courses)
    .map((course) => (typeof course === 'string' ? course : course?.name))
    .filter(Boolean)
    .slice(0, 8);

  return [
    '[FIT CHECK] Please check whether I am a good fit for this university.',
    '',
    `University: ${university.name || 'Unknown'}`,
    `Location: ${[university.city, university.country].filter(Boolean).join(', ') || 'Not listed'}`,
    `QS ranking: ${university.ranking ?? 'Not listed'}`,
    `Annual tuition: ${money(university.tuitionAnnualUsd)}`,
    `Acceptance rate: ${university.acceptanceRate != null ? `${university.acceptanceRate}%` : 'Not listed'}`,
    `IELTS requirement: ${university.ieltsRequirement ?? 'Not specified'}`,
    `GRE requirement: ${university.greRequirement ?? 'Not required'}`,
    `Application deadline: ${university.applicationDeadline || 'Rolling admissions'}`,
    `Programs: ${courses.length ? courses.join(', ') : 'Not listed'}`,
    '',
    'Use my StudyBridge profile first. If something important is missing to judge my eligibility, ask me up to 3 short questions before giving a verdict.',
  ].join('\n');
}

export function buildScholarshipFitPrompt(scholarship = {}) {
  const degrees = list(scholarship.degrees);
  const coverage = list(scholarship.coverage);
  const requirements = list(scholarship.requirements);

  return [
    '[FIT CHECK] Please check whether I am eligible for this scholarship.',
    '',
    `Scholarship: ${scholarship.name || 'Unknown'}`,
    `Host country: ${scholarship.country || 'Not listed'}`,
    `Funding level: ${scholarship.fundingLevel || 'Not listed'}`,
    `Award value: ${money(scholarship.amountUsd)}`,
    `Degree levels: ${degrees.length ? degrees.join(', ') : 'Not listed'}`,
    `Deadline: ${scholarship.deadline || 'Annual intake'}`,
    `Eligibility: ${scholarship.eligibility || 'Not listed'}`,
    `Requirements: ${requirements.length ? requirements.join('; ') : 'Not listed'}`,
    `Coverage: ${coverage.length ? coverage.join('; ') : 'Not listed'}`,
    '',
    'Use my StudyBridge profile first. If something important is missing to judge my eligibility, ask me up to 3 short questions before giving a verdict.',
  ].join('\n');
}

export function buildFitPrompt(kind, item) {
  return kind === 'scholarship' ? buildScholarshipFitPrompt(item) : buildUniversityFitPrompt(item);
}

/**
 * Send the student to the AI advisor with the selected item as the opening
 * message. The prompt is also kept in sessionStorage so it survives the login
 * redirect when the visitor is not signed in yet.
 */
export function startFitCheck(navigate, kind, item) {
  if (!navigate || !item) return;

  const prompt = buildFitPrompt(kind, item);
  const label = item.name || 'this option';

  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ prompt, label }));
  } catch {
    // Storage can be unavailable (private mode); navigation state still works.
  }

  navigate('/chatbot', { state: { fitPrompt: prompt, fitLabel: label } });
}

export function takePendingFitCheck() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.prompt) return null;
    return { prompt: String(parsed.prompt), label: parsed.label ? String(parsed.label) : '' };
  } catch {
    return null;
  }
}

export function clearPendingFitCheck() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
