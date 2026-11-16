import { executeScheduled } from './sync-common.js';

await executeScheduled('SCHOLARSHIP_DEADLINES', {
  schedule: 'deadline-only status update; no Gemini',
});
