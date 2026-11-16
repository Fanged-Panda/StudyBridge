import { executeScheduled } from './sync-common.js';

await executeScheduled('RESEARCH_METRICS', { schedule: 'due OpenAlex research metrics' });
