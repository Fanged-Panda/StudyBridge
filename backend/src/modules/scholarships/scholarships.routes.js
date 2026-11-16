import { Router } from 'express';
import {
  listScholarships,
  getScholarshipById,
  getScholarshipCountries,
  syncScholarship,
  syncAllScholarships,
} from './scholarships.controller.js';
import authMiddleware, { requireAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/', listScholarships);
router.get('/countries', getScholarshipCountries);
router.post('/sync', authMiddleware, requireAdmin, syncAllScholarships);
router.get('/:id', getScholarshipById);
router.post('/:id/sync', authMiddleware, requireAdmin, syncScholarship);

export default router;