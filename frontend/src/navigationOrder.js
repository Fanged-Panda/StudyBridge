export const NAV_ORDER = [
  '/',
  '/universities',
  '/chatbot',
  '/wordlab',
  '/community',
  '/profile',
];

export const PRIMARY_NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/universities', label: 'Explore', icon: 'explore', matches: ['/universities', '/scholarships', '/professors'] },
  { to: '/chatbot', label: 'Chatbot', icon: 'smart_toy' },
  { to: '/wordlab', label: 'WordLab', icon: 'menu_book' },
  { to: '/community', label: 'Community', icon: 'groups' },
];

export const EXPLORE_ROUTES = new Set([
  '/universities',
  '/scholarships',
  '/professors',
]);

export const normalizeNavPath = (pathname = '/') => {
  if (pathname === '/' || pathname.startsWith('/login')) return '/';
  if (pathname === '/explore') return '/universities';
  if (pathname.startsWith('/vocabulary') || pathname.startsWith('/exam') || pathname.startsWith('/quiz')) {
    return '/wordlab';
  }
  if (EXPLORE_ROUTES.has(pathname)) return '/universities';
  if (pathname.startsWith('/community')) return '/community';
  if (pathname.startsWith('/chatbot')) return '/chatbot';
  if (pathname.startsWith('/wordlab')) return '/wordlab';
  if (pathname.startsWith('/profile')) return '/profile';
  if (pathname.startsWith('/admin')) return '/profile';
  return pathname;
};

export const getNavIndex = (pathname = '/') => {
  const normalized = normalizeNavPath(pathname);
  const index = NAV_ORDER.indexOf(normalized);
  return index >= 0 ? index : NAV_ORDER.length;
};
