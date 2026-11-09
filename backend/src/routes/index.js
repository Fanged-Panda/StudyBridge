import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes.js';
import universitiesRoutes from '../modules/universities/universities.routes.js';
import scholarshipsRoutes from '../modules/scholarships/scholarships.routes.js';
import vocabularyRoutes from '../modules/vocabulary/vocabulary.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';
import chatbotRoutes from '../modules/chatbot/chatbot.routes.js';
import statsRoutes from '../modules/stats/stats.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import communityRoutes from '../modules/community/community.routes.js';
import professorsRoutes from '../modules/professors/professors.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/universities', universitiesRoutes);
router.use('/scholarships', scholarshipsRoutes);
router.use('/vocabulary', vocabularyRoutes);
router.use('/chatbot', aiRoutes);
router.use('/chat', chatbotRoutes);
router.use('/stats', statsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', usersRoutes);
router.use('/admin', adminRoutes);
router.use('/community', communityRoutes);
router.use('/professors', professorsRoutes);

export default router;