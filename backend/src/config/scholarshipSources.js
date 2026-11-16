// Official scholarship pages used by the Gemini extraction pipeline.
// Override with SCHOLARSHIP_SOURCE_URLS="url|country,url2|country2" in .env.
export const defaultScholarshipSources = [
  { url: 'https://www.chevening.org/scholarships/', country: 'United Kingdom' },
  { url: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/', country: 'Germany' },
  { url: 'https://foreign.fulbrightonline.org/', country: 'United States' },
  { url: 'https://cscuk.fcdo.gov.uk/scholarships/', country: 'United Kingdom' },
  { url: 'https://www.gatescambridge.org/', country: 'United Kingdom' },
];

export const getScholarshipSources = () => {
  const raw = (process.env.SCHOLARSHIP_SOURCE_URLS || '').trim();
  if (!raw) return defaultScholarshipSources;

  return raw
    .split(',')
    .map((entry) => {
      const [url, country] = entry.split('|').map((part) => part.trim());
      if (!/^https?:\/\//i.test(url || '')) return null;
      return { url, country: country || 'Global' };
    })
    .filter(Boolean);
};
