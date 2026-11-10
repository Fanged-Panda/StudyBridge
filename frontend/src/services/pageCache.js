/**
 * Session cache for page data.
 *
 * Lives for as long as the app is open, so navigating away from a page and
 * coming back can render the data immediately instead of showing a skeleton
 * and refetching. Cleared whenever the signed-in user changes so one account
 * never sees another account's cached data.
 */
const store = new Map();

export const getCache = (key) => store.get(key);

export const setCache = (key, value) => {
  store.set(key, value);
  return value;
};

export const clearCache = (prefix = '') => {
  for (const key of store.keys()) {
    if (!prefix || key.startsWith(prefix)) store.delete(key);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('authchange', () => clearCache());
}
