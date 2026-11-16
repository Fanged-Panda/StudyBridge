import { Router } from 'express';
import {
  listUniversities,
  getUniversityById,
  getAvailableSubjects,
  syncUniversity,
  syncAllUniversities,
  followUniversity,
  unfollowUniversity,
  checkFollowStatus,
  getFollowedUniversities,
  getFollowedUniversityIds,
} from './universities.controller.js';
import authMiddleware, { requireAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/', listUniversities);
router.get('/subjects', getAvailableSubjects);
router.post('/sync', authMiddleware, requireAdmin, syncAllUniversities);

// Followed universities by current user
router.get('/followed/me', authMiddleware, getFollowedUniversities);
router.get('/followed/ids', authMiddleware, getFollowedUniversityIds);

router.get('/:id', getUniversityById);
router.post('/:id/sync', authMiddleware, requireAdmin, syncUniversity);

// Follow actions on specific university
router.post('/:id/follow', authMiddleware, followUniversity);
router.delete('/:id/follow', authMiddleware, unfollowUniversity);
router.get('/:id/follow', authMiddleware, checkFollowStatus);

export default router;