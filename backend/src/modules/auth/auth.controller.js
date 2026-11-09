import * as authService from './auth.service.js';
import * as passwordResetService from './passwordReset.service.js';

export const googleLogin = async (req, res) => {
  const result = await authService.googleLogin(req.body);
  return res.status(result.status).json(result.body);
};

export const register = async (req, res) => {
  const result = await authService.register(req.body);
  return res.status(result.status).json(result.body);
};

export const login = async (req, res) => {
  const result = await authService.login(req.body);
  return res.status(result.status).json(result.body);
};

export const me = async (req, res) => {
  const result = await authService.me(req.user.id);
  return res.status(result.status).json(result.body);
};

export const completeProfile = async (req, res) => {
  const result = await authService.completeProfile(req.user.id, req.body);
  return res.status(result.status).json(result.body);
};

export const getStudentCount = async (req, res) => {
  const result = await authService.getStudentCount();
  return res.status(result.status).json(result.body);
};
export const requestPasswordReset = async (req, res) => {
  const result = await passwordResetService.requestPasswordReset({
    email: req.body?.email,
    ip: req.ip,
  });
  return res.status(result.status).json(result.body);
};

export const verifyPasswordResetCode = async (req, res) => {
  const result = await passwordResetService.verifyPasswordResetCode({
    email: req.body?.email,
    code: req.body?.otp ?? req.body?.code,
  });
  return res.status(result.status).json(result.body);
};

export const resetPassword = async (req, res) => {
  const result = await passwordResetService.resetPassword({
    resetToken: req.body?.resetToken,
    password: req.body?.password,
  });
  return res.status(result.status).json(result.body);
};
