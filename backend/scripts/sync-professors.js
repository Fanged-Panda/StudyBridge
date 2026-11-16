import { executeScheduled } from './sync-common.js';

await executeScheduled('PROFESSORS', { schedule: 'due professor discovery' });
