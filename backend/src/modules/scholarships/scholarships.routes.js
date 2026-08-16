import { Router } from 'express';
import {
  listScholarships,
  getScholarshipById,
  getScholarshipCountries,
  syncScholarship,
  syncAllScholarships,
} from './scholarships.controller.js';

const router = Router();

router.get('/', listScholarships);
router.get('/countries', getScholarshipCountries);
router.post('/sync', syncAllScholarships);
router.get('/:id', getScholarshipById);
router.post('/:id/sync', syncScholarship);

export default router;