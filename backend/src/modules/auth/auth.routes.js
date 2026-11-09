import { Router } from 'express';
import {
  login,
  me,
  register,
  googleLogin,
  completeProfile,
  getStudentCount,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
} from './auth.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/google', googleLogin);
router.get('/count', getStudentCount);
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-otp', verifyPasswordResetCode);
router.post('/reset-password', resetPassword);
router.get('/me', authMiddleware, me);
router.put('/profile', authMiddleware, completeProfile);

export default router;