import { executeScheduled } from './sync-common.js';

await executeScheduled('ADMISSIONS', { schedule: 'due university admission requirements' });
