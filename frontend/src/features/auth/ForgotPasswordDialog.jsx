import { useEffect, useRef, useState } from 'react';
import { KeyRound, Mail, Lock } from 'lucide-react';
import api from '../../services/api';
import Modal from '../community/Modal';

/**
 * "Forgot password?" — emails a 6-digit code, then either lets the member set a
 * new password or simply continue into the site (verifying the code already
 * signs them in).
 */
const ForgotPasswordDialog = ({ open, onClose, onSignedIn, defaultEmail = '' }) => {
  const [step, setStep] = useState('email'); // email → code → options
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef(null);

  // Reset everything each time the dialog is opened fresh.
  useEffect(() => {
    if (!open) return;
    setStep('email');
    setEmail(defaultEmail);
    setCode('');
    setPassword('');
    setConfirm('');
    setResetToken('');
    setError('');
    setNotice('');
    setBusy(false);
    setResendIn(0);
  }, [open, defaultEmail]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setNotice(data?.message || 'If that email belongs to an account, a code is on its way.');
      setStep('code');
      setResendIn(45);
      window.setTimeout(() => codeRef.current?.focus(), 80);
    } catch (err) {
      const message =
        err.response?.status === 502
          ? 'Email delivery is not working right now. Please try again in a minute.'
          : err.response?.data?.message || 'Could not send the code. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/verify-otp', { email: email.trim(), otp: code.trim() });
      localStorage.setItem('token', data.token);
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      if (data.user?.profileImage) localStorage.setItem('userAvatar', data.user.profileImage);
      window.dispatchEvent(new Event('authchange'));
      setResetToken(data.resetToken || '');
      setStep('options');
      setNotice('Code verified. You are signed in.');
    } catch (err) {
      setError(err.response?.data?.message || 'That code could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/reset-password', { resetToken, password });
      if (data?.token) localStorage.setItem('token', data.token);
      if (data?.user) localStorage.setItem('userProfile', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authchange'));
      setNotice('Password updated. Taking you to your profile…');
      window.setTimeout(() => {
        onClose();
        onSignedIn?.();
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  };

  const continueToSite = () => {
    onClose();
    onSignedIn?.();
  };

  const inputClass =
    'w-full rounded-lg border border-[#cbd5e1] bg-[#f5f8ff] py-3 pl-11 pr-4 text-[14px] text-primary outline-none transition-all placeholder:text-[#94a3b8] focus:border-accent focus:shadow-[0_0_0_4px_rgba(38,166,154,0.15)]';
  const primaryButton =
    'inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-lg transition hover:opacity-90 disabled:opacity-60';

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={KeyRound}
      title={step === 'options' ? 'You are verified' : 'Forgot your password?'}
      description={
        step === 'email'
          ? 'Enter your account email and we will send a 6-digit code.'
          : step === 'code'
            ? 'Enter the code from the email. It expires in 10 minutes.'
            : 'Set a new password now, or just continue into StudyBridge.'
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
      {!error && notice && step !== 'options' && (
        <p role="status" className="mb-4 rounded-xl bg-secondary/60 px-3 py-2 text-xs font-semibold text-primary">
          {notice}
        </p>
      )}

      {step === 'email' && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendCode();
          }}
          className="space-y-4"
        >
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#64748b]">
              mail
            </span>
            <input
              className={inputClass}
              type="email"
              required
              autoComplete="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy || !email.trim()} className={primaryButton}>
            {busy ? 'Sending code…' : 'Send me a code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              ref={codeRef}
              className={`${inputClass} tracking-[0.5em] text-center font-extrabold`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
            />
          </div>
          <p className="text-center text-xs text-text-muted">
            Sent to <span className="font-semibold text-primary">{email.trim()}</span>
          </p>
          <button type="submit" disabled={busy || code.length !== 6} className={primaryButton}>
            {busy ? 'Checking…' : 'Verify code'}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
              className="font-semibold text-text-muted underline-offset-2 hover:text-primary hover:underline"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || resendIn > 0}
              className="font-semibold text-accent underline-offset-2 hover:underline disabled:text-text-muted disabled:no-underline"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 'options' && (
        <div className="space-y-5">
          {notice && (
            <p role="status" className="rounded-xl bg-secondary/60 px-3 py-2 text-xs font-semibold text-primary">
              {notice}
            </p>
          )}

          <form onSubmit={savePassword} className="space-y-3">
            <p className="text-sm font-bold text-primary">Set a new password (optional)</p>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError('');
                }}
              />
            </div>
            <button type="submit" disabled={busy || password.length < 6 || !confirm} className={primaryButton}>
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">or</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <button
            type="button"
            onClick={continueToSite}
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary transition hover:border-accent hover:bg-secondary/40"
          >
            Continue to StudyBridge
          </button>
        </div>
      )}
    </Modal>
  );
};

export default ForgotPasswordDialog;
