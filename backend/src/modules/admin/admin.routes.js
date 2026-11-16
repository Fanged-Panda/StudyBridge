import { Router } from 'express';
import authMiddleware, { requireAdmin } from '../../middleware/auth.middleware.js';
import {
  updateUniversity,
  broadcastAnnouncement,
  updateScholarship,
  getAdminStats,
  discoverUniversities,
  importUniversity,
  listUsers,
  deleteUser,
  deleteUniversity,
  deleteScholarship,
  deleteProfessor,
} from './admin.controller.js';
import {
  checkScholarshipSources,
  extractChangedScholarships,
  getActions,
  getJob,
  getJobs,
  getOverview,
  refreshResearchMetrics,
  syncAdmissions,
  syncAllScholarships,
  syncAllUniversities,
  syncScholarship,
  syncUniversity,
  syncUniversityAdmissions,
  syncUniversityProfessors,
  updateScholarshipDeadlines,
} from './sync.controller.js';

const router = Router();

// Protect all admin endpoints with both JWT auth and Admin role verification
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);
router.get('/university-discovery', discoverUniversities);
router.post('/universities/import', importUniversity);
router.put('/universities/:id', updateUniversity);
router.delete('/universities/:id', deleteUniversity);
router.post('/universities/:id/announcement', broadcastAnnouncement);
router.put('/scholarships/:id', updateScholarship);
router.delete('/scholarships/:id', deleteScholarship);
router.delete('/professors/:id', deleteProfessor);

// Sync Center -------------------------------------------------------------
router.get('/sync/overview', getOverview);
router.get('/sync/actions', getActions);
router.get('/sync/jobs', getJobs);
router.get('/sync/jobs/:id', getJob);

router.post('/sync/universities', syncAllUniversities);
router.post('/sync/universities/:id', syncUniversity);
router.post('/sync/universities/:id/admissions', syncUniversityAdmissions);
router.post('/sync/universities/:id/professors', syncUniversityProfessors);
router.post('/sync/admissions', syncAdmissions);
router.post('/sync/professors/metrics', refreshResearchMetrics);

router.post('/sync/scholarships', syncAllScholarships);
router.post('/sync/scholarships/:id', syncScholarship);
router.post('/sync/scholarship-sources', checkScholarshipSources);
router.post('/sync/scholarship-extraction', extractChangedScholarships);
router.post('/sync/scholarship-deadlines', updateScholarshipDeadlines);

export default router;
