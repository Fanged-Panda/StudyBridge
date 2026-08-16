import { Router } from 'express';
import {
  listUniversities,
  getUniversityById,
  getAvailableSubjects,
  syncUniversity,
  syncAllUniversities,
} from './universities.controller.js';

const router = Router();

router.get('/', listUniversities);
router.get('/subjects', getAvailableSubjects);
router.post('/sync', syncAllUniversities);
router.get('/:id', getUniversityById);
router.post('/:id/sync', syncUniversity);

export default router;