import crypto from 'node:crypto';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { geminiConfig, isQuotaError, runGeminiSyncCall } from './geminiQuota.js';

const USER_AGENT = 'StudyBridge/1.0 (academic project; live data sync)';

const fetchJson = async (url, { timeoutMs = 20000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        // Some upstreams return plain-text errors.
      }
      const host = new URL(url).host;
      const error = new Error(`HTTP ${response.status} from ${host}`);
      error.status = response.status;
      error.host = host;
      error.detail = payload?.message || payload?.error || null;
      error.isOpenAlexRateLimit =
        host === 'api.openalex.org' &&
        response.status === 429 &&
        /rate limit|budget|quota/i.test(String(error.detail || ''));
      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const fetchPageText = async (url, { timeoutMs = 25000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('html') && !contentType.includes('text/plain')) {
      throw new Error(`Unsupported content type: ${contentType.split(';')[0]}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
};

const decodeEntities = (value = '') =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');

/** Remove scripts/styles/tags so only readable page text reaches Gemini. */
export const htmlToText = (html = '') =>
  decodeEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<head[\s\S]*?<\/head>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

/** Fetches a page once and gives callers the normalized text plus change hash. */
export const fetchSourceDocument = async (url) => {
  const html = await fetchPageText(url);
  const text = htmlToText(html);
  return {
    url,
    html,
    text,
    contentHash: crypto.createHash('sha256').update(text).digest('hex'),
    fetchedAt: new Date(),
  };
};

export const isGeminiConfigured = () => {
  const key = process.env.GEMINI_API_KEY || '';
  return Boolean(key.replace(/^['"]|['"]$/g, '').trim());
};

// ---------------------------------------------------------------------------
// HipoLabs university directory
// ---------------------------------------------------------------------------

export const searchHipoLabsUniversities = async ({ country, name } = {}) => {
  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (name) params.set('name', name);
  if (!params.size) return [];

  const url = `http://universities.hipolabs.com/search?${params.toString()}`;
  const data = await fetchJson(url, { timeoutMs: 25000 });
  return Array.isArray(data) ? data : [];
};

export const fetchHipoLabsUniversities = async (country) =>
  searchHipoLabsUniversities({ country });

// ---------------------------------------------------------------------------
// OpenAlex institutions & authors
// ---------------------------------------------------------------------------

const openAlexUrl = (path, params = {}) => {
  const url = new URL(`https://api.openalex.org/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const apiKey = (process.env.OPENALEX_API_KEY || '').trim();
  if (apiKey) url.searchParams.set('api_key', apiKey);

  const mailto = (process.env.OPENALEX_MAILTO || '').trim();
  if (mailto) url.searchParams.set('mailto', mailto);

  return url.toString();
};

const normalizeName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, '');

const openAlexIdShort = (id = '') => String(id).match(/I\d+/)?.[0] || '';
const openAlexAuthorIdShort = (id = '') => String(id).match(/A\d+/)?.[0] || '';

const mapInstitution = (row = {}) => ({
  id: row.id || '',
  displayName: row.display_name || '',
  countryCode: row.country_code || '',
  city: row.geo?.city || null,
  homepageUrl: row.homepage_url || '',
  worksCount: row.works_count ?? null,
  citedByCount: row.cited_by_count ?? null,
  hIndex: row.summary_stats?.h_index ?? null,
  topics: (row.topics || []).slice(0, 5).map((topic) => ({
    name: topic.display_name,
    count: topic.count,
  })),
});

export const fetchOpenAlexInstitution = async (name) => {
  if (!name) return null;
  const data = await fetchJson(
    openAlexUrl('institutions', { search: name, 'per-page': 5 }),
  );
  const results = Array.isArray(data?.results) ? data.results : [];
  if (results.length === 0) return null;

  const target = normalizeName(name);
  const exact = results.find((row) => normalizeName(row.display_name) === target);
  return mapInstitution(exact || results[0]);
};

/** Match one directory name to OpenAlex without falling back to a different institution. */
export const fetchOpenAlexInstitutionByName = async (name, { countryCode } = {}) => {
  if (!name) return null;
  const target = normalizeName(name);
  const code = String(countryCode || '').trim().toUpperCase();
  const queries = [name];
  if (name.includes('&')) queries.push(name.replace(/&/g, 'and'));
  else if (/\band\b/i.test(name)) queries.push(name.replace(/\band\b/gi, '&'));

  const lookup = async (query, filter) => {
    const data = await fetchJson(
      openAlexUrl('institutions', {
        search: query,
        filter,
        'per-page': 10,
      }),
    );
    const rows = Array.isArray(data?.results) ? data.results : [];
    return rows.find((row) => normalizeName(row.display_name) === target) || null;
  };

  const attempts = [];
  if (code) queries.forEach((query) => attempts.push({ query, filter: `country_code:${code}` }));
  queries.forEach((query) => attempts.push({ query, filter: undefined }));

  for (const attempt of attempts) {
    const match = await lookup(attempt.query, attempt.filter);
    if (!match) continue;
    if (code && match.country_code && String(match.country_code).toUpperCase() !== code) continue;
    return mapInstitution(match);
  }

  return null;
};

export const fetchOpenAlexAuthors = async (institutionId, { limit = 20 } = {}) => {
  const shortId = openAlexIdShort(institutionId);
  if (!shortId) return [];

  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const data = await fetchJson(
    openAlexUrl('authors', {
      filter: `last_known_institutions.id:${shortId}`,
      sort: 'cited_by_count:desc',
      'per-page': pageSize,
    }),
  );

  return (Array.isArray(data?.results) ? data.results : []).map(mapOpenAlexAuthor);
};

const mapOpenAlexAuthor = (author = {}) => {
  const topics = author.topics || [];
  const primary = author.primary_topic || topics[0] || {};

  return {
    openAlexId: author.id || null,
    name: author.display_name || '',
    worksCount: author.works_count ?? null,
    citedByCount: author.cited_by_count ?? null,
    hIndex: author.summary_stats?.h_index ?? null,
    topics: topics.slice(0, 5).map((topic) => ({
      name: topic.display_name,
      count: topic.count,
    })),
    primaryTopic: primary.display_name || null,
    subfield: primary.subfield?.display_name || null,
    field: primary.field?.display_name || null,
    institutions: (author.last_known_institutions || [])
      .map((institution) => institution.display_name)
      .filter(Boolean),
  };
};

/** Metrics refresh by stable OpenAlex IDs, never by name matching. */
export const fetchOpenAlexAuthorsByIds = async (openAlexIds = []) => {
  const ids = [...new Set(openAlexIds.map(openAlexAuthorIdShort).filter(Boolean))].slice(0, 100);
  if (ids.length === 0) return [];

  const data = await fetchJson(
    openAlexUrl('authors', {
      filter: `openalex_id:${ids.join('|')}`,
      'per-page': 100,
    }),
  );

  return (Array.isArray(data?.results) ? data.results : []).map(mapOpenAlexAuthor);
};

// ---------------------------------------------------------------------------
// Gemini structured extraction
// ---------------------------------------------------------------------------

let genAIClient;

const getGeminiClient = () => {
  if (!genAIClient) {
    const key = (process.env.GEMINI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    genAIClient = new GoogleGenerativeAI(key);
  }
  return genAIClient;
};

const geminiModelCandidates = () => {
  const configured = (process.env.GEMINI_MODEL || '').trim();
  return [
    ...new Set(
      [
        configured,
        'gemini-3.5-flash',
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
      ].filter(Boolean),
    ),
  ];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateStructured = async ({ prompt, schema, purpose = 'scholarship' }) => {
  let lastError;

  for (const modelName of geminiModelCandidates()) {
    let attempt = 0;
    while (attempt <= geminiConfig().maxRetries) {
      try {
        const model = getGeminiClient().getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
        // Quota protection wraps only the actual API call.
        const result = await runGeminiSyncCall({ purpose }, () => model.generateContent(prompt));
        const text = result.response.text();
        return JSON.parse(text);
      } catch (error) {
        lastError = error;
        const message = String(error?.message || '');

        // Never retry quota exhaustion or a busy single-sync slot.
        if (isQuotaError(error) || error?.code === 'GEMINI_SYNC_BUSY') break;

        if (!/not found|404|not supported|invalid model/i.test(message)) {
          const retryable = error?.status >= 500 || /timeout|network|fetch failed|ECONNRESET/i.test(message);
          if (retryable && attempt < geminiConfig().maxRetries) {
            await sleep(geminiConfig().retryBaseMs * 2 ** attempt);
            attempt += 1;
            continue;
          }
        }
        break;
      }
    }

    if (isQuotaError(lastError)) break;
    if (!/not found|404|not supported|invalid model/i.test(String(lastError?.message || ''))) break;
  }

  throw lastError || new Error('Gemini extraction failed.');
};

const scholarshipSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      country: { type: SchemaType.STRING },
      amountUsd: { type: SchemaType.INTEGER, nullable: true },
      fundingLevel: { type: SchemaType.STRING },
      eligibility: { type: SchemaType.STRING },
      deadline: { type: SchemaType.STRING },
      websiteUrl: { type: SchemaType.STRING },
    },
    required: ['name'],
  },
};

const admissionsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    tuitionAnnualUsd: { type: SchemaType.INTEGER, nullable: true },
    applicationFee: { type: SchemaType.INTEGER, nullable: true },
    applicationDeadline: { type: SchemaType.STRING, nullable: true },
    ieltsRequirement: { type: SchemaType.NUMBER, nullable: true },
    greRequirement: { type: SchemaType.INTEGER, nullable: true },
  },
};

const safeHttpUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

export const extractScholarshipsFromSnapshot = async (snapshot, fallbackCountry = 'Global') => {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const url = snapshot.url;
  const text = String(snapshot.text || '').slice(0, 30000);
  if (text.length < 200) {
    throw new Error('Page did not contain enough readable text.');
  }

  const parsed = await generateStructured({
    prompt: `You extract scholarship programs from official university or government pages.\n\nSource URL: ${url}\nFallback country: ${fallbackCountry}\n\nExtract up to 5 scholarships that are explicitly described in the page text. Do not invent programs, amounts, or deadlines. If no scholarship is listed, return [].\nFor each scholarship:\n- name: official program name\n- country: country of study, or "Global"\n- amountUsd: total or annual award in USD as an integer, only when stated\n- fundingLevel: "Full", "Partial", or "Tuition"\n- eligibility: short summary of who can apply\n- deadline: application deadline as written, or "Varies"\n- websiteUrl: official program URL if present in the text, otherwise the source URL\n\nPAGE TEXT:\n${text}`,
    schema: scholarshipSchema,
    purpose: 'scholarship',
  });

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      const name = String(item?.name || '').trim().slice(0, 150);
      if (!name) return null;

      const amount = Number(item.amountUsd);
      return {
        name,
        country: String(item.country || fallbackCountry || 'Global').trim().slice(0, 100),
        amountUsd: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null,
        fundingLevel: String(item.fundingLevel || 'Partial').trim().slice(0, 50),
        eligibility: item.eligibility ? String(item.eligibility).trim().slice(0, 2000) : null,
        deadline: item.deadline ? String(item.deadline).trim().slice(0, 100) : null,
        websiteUrl: safeHttpUrl(item.websiteUrl) || url,
      };
    })
    .filter(Boolean);
};

export const extractScholarshipsFromUrl = async (url, fallbackCountry = 'Global') => {
  const snapshot = await fetchSourceDocument(url);
  return extractScholarshipsFromSnapshot(snapshot, fallbackCountry);
};

const ADMISSION_PATHS = ['/admissions', '/international', '/apply'];
const ADMISSION_PAGE_SIGNAL = /tuition|application fee|ielts|english language|entry requirement|apply now|admission requirement|how to apply/i;

/** Prefer the first official admissions-related page with usable text. */
export const fetchAdmissionsDocument = async (url) => {
  const base = new URL(url);
  const candidates = [url];

  for (const path of ADMISSION_PATHS) {
    const target = new URL(base.toString());
    target.pathname = path;
    target.search = '';
    target.hash = '';
    candidates.push(target.toString());
  }

  let fallback = null;
  let lastError = null;

  for (const candidate of new Set(candidates)) {
    try {
      const snapshot = await fetchSourceDocument(candidate);
      if (!fallback && snapshot.text.length >= 200) fallback = snapshot;
      if (snapshot.text.length >= 200 && ADMISSION_PAGE_SIGNAL.test(snapshot.text)) {
        return snapshot;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (fallback) return fallback;
  throw lastError || new Error('Could not read the official admissions page.');
};

export const extractUniversityAdmissionsFromUrl = async (url) => {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const snapshot = await fetchAdmissionsDocument(url);
  const text = String(snapshot.text || '').slice(0, 30000);
  if (text.length < 200) {
    throw new Error('Page did not contain enough readable text.');
  }

  const parsed = await generateStructured({
    prompt: `Extract international admission facts from this official university page.\n\nSource URL: ${snapshot.url}\n\nOnly return values explicitly stated on the page. Use null when a value is not stated. Do not guess.\n- tuitionAnnualUsd: annual undergraduate international tuition in USD (integer)\n- applicationFee: application fee in USD (integer)\n- applicationDeadline: main application deadline as written (string)\n- ieltsRequirement: minimum IELTS overall band (number)\n- greRequirement: minimum GRE score (integer)\n\nPAGE TEXT:\n${text}`,
    schema: admissionsSchema,
    purpose: 'admission',
  });

  const tuition = parseNumeric(parsed?.tuitionAnnualUsd);
  const fee = parseNumeric(parsed?.applicationFee);
  const ielts = parseNumeric(parsed?.ieltsRequirement);
  const gre = parseNumeric(parsed?.greRequirement);

  return {
    tuitionAnnualUsd: Number.isFinite(tuition) && tuition >= 0 && tuition < 200000 ? Math.round(tuition) : null,
    applicationFee: Number.isFinite(fee) && fee >= 0 && fee <= 1000 ? Math.round(fee) : null,
    applicationDeadline: parsed?.applicationDeadline
      ? String(parsed.applicationDeadline).trim().slice(0, 100)
      : null,
    ieltsRequirement: Number.isFinite(ielts) && ielts > 0 && ielts <= 9 ? ielts : null,
    greRequirement: Number.isFinite(gre) && gre >= 200 && gre <= 340 ? Math.round(gre) : null,
  };
};

const parseGeminiJson = (text = '') => {
  const cleaned = String(text)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Gemini did not return a JSON object.');
  return JSON.parse(cleaned.slice(start, end + 1));
};

const parseNumeric = (value) => {
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  const number = match ? Number(match[0]) : NaN;
  return Number.isFinite(number) ? number : NaN;
};

// The installed SDK (v0.24.1) predates the current `googleSearch` field and
// only types `googleSearchRetrieval`. Its request serializer passes tools
// through unchanged, so use the current API shape first and keep the typed
// legacy shape as a fallback for older models.
const GEMINI_SEARCH_TOOL_VARIANTS = [
  [{ googleSearch: {} }],
  [{ googleSearchRetrieval: {} }],
];

const isToolShapeError = (error) => {
  const message = String(error?.message || '');
  return /google[\s_-]?search|search grounding|unknown name|unknown field|invalid json payload|invalid argument|tool/i.test(
    message,
  );
};

const isModelUnavailableError = (error) =>
  /not found|404|not supported|invalid model/i.test(String(error?.message || ''));

const generateWithGoogleSearch = async ({ prompt, purpose = 'admission' }) => {
  let lastError;
  const config = geminiConfig();

  modelLoop: for (const modelName of geminiModelCandidates()) {
    for (let variantIndex = 0; variantIndex < GEMINI_SEARCH_TOOL_VARIANTS.length; variantIndex += 1) {
      let attempt = 0;
      while (attempt <= config.maxRetries) {
        try {
          const model = getGeminiClient().getGenerativeModel({
            model: modelName,
            tools: GEMINI_SEARCH_TOOL_VARIANTS[variantIndex],
            generationConfig: { temperature: 0.1 },
          });
          const result = await runGeminiSyncCall({ purpose }, () => model.generateContent(prompt));
          return result.response.text();
        } catch (error) {
          lastError = error;
          const message = String(error?.message || '');

          if (isQuotaError(error) || error?.code === 'GEMINI_SYNC_BUSY') throw error;

          const retryable = error?.status >= 500 || /timeout|network|fetch failed|ECONNRESET/i.test(message);
          if (retryable && attempt < config.maxRetries) {
            await sleep(config.retryBaseMs * 2 ** attempt);
            attempt += 1;
            continue;
          }

          if (isModelUnavailableError(error)) continue modelLoop;
          if (isToolShapeError(error)) break;
          throw error;
        }
      }
    }
  }

  throw lastError || new Error('Gemini search failed.');
};

const normalizeSearchedPrograms = (programs = []) => {
  const seen = new Set();
  return (Array.isArray(programs) ? programs : [])
    .map((item) => {
      const name = String(item?.name || '').trim().slice(0, 150);
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!name || !key || seen.has(key)) return null;
      seen.add(key);
      return {
        name,
        discipline: item.discipline ? String(item.discipline).trim().slice(0, 120) : null,
        degrees: Array.isArray(item.degrees)
          ? item.degrees.map((degree) => String(degree).trim().slice(0, 100)).filter(Boolean).slice(0, 6)
          : [],
        duration: item.duration ? String(item.duration).trim().slice(0, 80) : null,
        skills: Array.isArray(item.skills)
          ? item.skills.map((skill) => String(skill).trim().slice(0, 100)).filter(Boolean).slice(0, 4)
          : [],
      };
    })
    .filter(Boolean);
};

/** One grounded Gemini search fills admissions, costs, scholarships and programs. */
export const searchUniversityProfile = async (university) => {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  if (!university?.name) throw new Error('University name is required.');

  const location = [university.city, university.country].filter(Boolean).join(', ');
  const text = await generateWithGoogleSearch({
    purpose: 'admission',
    prompt: `Research ${university.name}${location ? ` (${location})` : ''} for an international study directory. Use Google Search and your academic training knowledge, preferring current official university information. Return ONLY one JSON object, with no markdown and no commentary, matching this shape:
{
  "city": string or null,
  "ranking": integer or null,
  "acceptanceRate": number or null,
  "tuitionAnnualUsd": integer or null,
  "applicationFee": integer or null,
  "applicationDeadline": string or null,
  "ieltsRequirement": number or null,
  "greRequirement": integer or null,
  "scholarships": [{ "name": string, "country": string, "amountUsd": integer or null, "fundingLevel": "Full"|"Partial"|"Tuition", "eligibility": string or null, "deadline": string or null, "websiteUrl": string or null }],
  "programs": [{ "name": string, "discipline": string or null, "degrees": [string], "duration": string or null, "skills": [string] }]
}
Rules: ranking is an approximate current QS World University Ranking; acceptanceRate is a percentage from 0 to 100; annual international tuition and application fee are in USD. If official sources omit a stable profile field such as city, ranking, acceptance rate, tuition, IELTS, deadline, or common degree programs, use your established academic training knowledge as a fallback and approximate rather than leaving it blank. Programs must be actual degree programs or majors offered to students, not research topics or faculty interests. Do not invent scholarships or exact fees. Include up to 6 scholarships and up to 15 degree programs.`,
  });

  const parsed = parseGeminiJson(text);
  const city = parsed?.city ? String(parsed.city).trim().slice(0, 100) : null;
  const ranking = parseNumeric(parsed?.ranking);
  const acceptanceRaw = parseNumeric(parsed?.acceptanceRate);
  const acceptanceRate = Number.isFinite(acceptanceRaw) && acceptanceRaw > 0
    ? Math.min(acceptanceRaw <= 1 ? acceptanceRaw * 100 : acceptanceRaw, 100)
    : null;
  const tuition = parseNumeric(parsed?.tuitionAnnualUsd);
  const fee = parseNumeric(parsed?.applicationFee);
  const ielts = parseNumeric(parsed?.ieltsRequirement);
  const gre = parseNumeric(parsed?.greRequirement);

  const scholarships = (Array.isArray(parsed?.scholarships) ? parsed.scholarships : [])
    .map((item) => {
      const name = String(item?.name || '').trim().slice(0, 150);
      if (!name) return null;
      const amount = parseNumeric(item.amountUsd);
      return {
        name,
        country: String(item.country || university.country || 'Global').trim().slice(0, 100),
        amountUsd: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null,
        fundingLevel: String(item.fundingLevel || 'Partial').trim().slice(0, 50),
        eligibility: item.eligibility ? String(item.eligibility).trim().slice(0, 2000) : null,
        deadline: item.deadline ? String(item.deadline).trim().slice(0, 100) : null,
        websiteUrl: safeHttpUrl(item.websiteUrl),
      };
    })
    .filter(Boolean);

  return {
    city,
    ranking: Number.isFinite(ranking) && ranking > 0 && ranking < 100000 ? Math.round(ranking) : null,
    acceptanceRate: acceptanceRate == null ? null : Math.round(acceptanceRate * 10) / 10,
    tuitionAnnualUsd: Number.isFinite(tuition) && tuition >= 0 && tuition < 200000 ? Math.round(tuition) : null,
    applicationFee: Number.isFinite(fee) && fee >= 0 && fee <= 1000 ? Math.round(fee) : null,
    applicationDeadline: parsed?.applicationDeadline
      ? String(parsed.applicationDeadline).trim().slice(0, 100)
      : null,
    ieltsRequirement: Number.isFinite(ielts) && ielts > 0 && ielts <= 9 ? ielts : null,
    greRequirement: Number.isFinite(gre) && gre >= 200 && gre <= 340 ? Math.round(gre) : null,
    scholarships,
    programs: normalizeSearchedPrograms(parsed?.programs),
  };
};
