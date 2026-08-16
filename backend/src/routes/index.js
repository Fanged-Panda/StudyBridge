import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes.js';
import universitiesRoutes from '../modules/universities/universities.routes.js';
import scholarshipsRoutes from '../modules/scholarships/scholarships.routes.js';
import testsRoutes from '../modules/tests/tests.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/universities', universitiesRoutes);
router.use('/scholarships', scholarshipsRoutes);
router.use('/quiz', testsRoutes);
router.use('/chatbot', aiRoutes);

export default router;