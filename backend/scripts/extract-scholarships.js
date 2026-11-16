import { executeScheduled } from './sync-common.js';

await executeScheduled('SCHOLARSHIP_EXTRACTION', {
  schedule: 'changed scholarship sources only',
});
