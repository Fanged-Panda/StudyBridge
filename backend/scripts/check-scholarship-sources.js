import { executeScheduled } from './sync-common.js';

await executeScheduled('SCHOLARSHIP_SOURCES', { schedule: 'scholarship webpage checking' });
