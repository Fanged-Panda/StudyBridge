import { executeScheduled } from './sync-common.js';

await executeScheduled('UNIVERSITY_CATALOG', { schedule: 'university discovery' });
