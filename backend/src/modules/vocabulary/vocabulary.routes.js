import { Router } from 'express';
import * as controller from './vocabulary.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', controller.dashboard);
router.get('/words', controller.listWords);
router.post('/learn', controller.learn);
router.patch('/goal', controller.updateGoal);
router.post('/test/start', controller.startTest);
router.post('/test/submit', controller.submitTest);

export default router;
