import { Router } from 'express';
import authMiddleware, { optionalAuth, requireAdmin } from '../../middleware/auth.middleware.js';
import * as controller from './community.controller.js';

const router = Router();

/* Public feed */
router.get('/journeys', optionalAuth, controller.listJourneys);
router.post('/journeys', authMiddleware, controller.createJourney);
router.get('/tags', controller.listTags);
router.get('/report-reasons', controller.reportReasons);

/* Author self-service (magic link, no password) */
router.get('/manage/:token', controller.readManageLink);
router.patch('/manage/:token', controller.updateViaManageLink);
router.delete('/manage/:token', controller.deleteViaManageLink);

/* Admin moderation — JWT + admin role required */
router.get('/admin/journeys', authMiddleware, requireAdmin, controller.adminList);
router.patch('/admin/journeys/:id', authMiddleware, requireAdmin, controller.adminUpdate);
router.delete('/admin/journeys/:id', authMiddleware, requireAdmin, controller.adminDelete);
router.post('/admin/journeys/:id/review', authMiddleware, requireAdmin, controller.adminReview);
router.get('/admin/journeys/:id/comments', authMiddleware, requireAdmin, controller.adminComments);
router.delete('/admin/comments/:id', authMiddleware, requireAdmin, controller.adminDeleteComment);
router.get('/admin/reports', authMiddleware, requireAdmin, controller.adminReports);
router.patch('/admin/reports/:id', authMiddleware, requireAdmin, controller.adminResolveReport);

/* Single journey + interactions (kept last so /manage and /admin win) */
router.get('/journeys/:slug', optionalAuth, controller.getJourney);
router.delete('/journeys/:slug', authMiddleware, controller.deleteJourney);
router.post('/journeys/:slug/vote', authMiddleware, controller.voteJourney);
router.post('/journeys/:slug/contact', controller.contactAuthor);
router.get('/journeys/:slug/comments', controller.listComments);
router.post('/journeys/:slug/comments', authMiddleware, controller.addComment);
router.post('/journeys/:slug/report', controller.reportJourney);

export default router;
