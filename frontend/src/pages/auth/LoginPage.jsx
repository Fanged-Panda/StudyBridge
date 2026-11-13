import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import SignUpWizard from '../../features/auth/SignUpWizard';
import ProfileCompletionWizard from '../../features/auth/ProfileCompletionWizard';
import ForgotPasswordDialog from '../../features/auth/ForgotPasswordDialog';

const LoginPage = () => {
  const [active, setActive] = useState(false); // false = sign-in visible by default
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authErrors, setAuthErrors] = useState([]);
  const [googleNewUser, setGoogleNewUser] = useState(null); // { token, user, name } when Google signup needs profile completion
  const [forgotOpen, setForgotOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/profile';

  // Toggling panels clears any error from the other flow so it never leaks across
  const toggleActive = (v) => {
    setAuthErrors([]);
    setActive(v);
  };

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, []);

  // Push a stacked error message that auto-dismisses after a few seconds
  const pushError = (message) => {
    const id = Date.now() + Math.random();
    setAuthErrors((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setAuthErrors((prev) => prev.filter((e) => e.id !== id));
    }, 4000);
  };

  // Error stack — aligned to the top of the white form panel; messages pile up
  const renderErrorStack = () =>
    authErrors.length > 0 && (
      <div className="absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {authErrors.map((e) => (
          <p
            key={e.id}
            role="alert"
            className="toast-item w-full max-w-xs rounded-lg bg-red-500 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg"
          >
            {e.message}
          </p>
        ))}
      </div>
    );

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthErrors([]);
    setAuthLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: signInEmail,
        password: signInPassword,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authchange'));
      navigate(from);
    } catch (err) {
      pushError(err.response?.data?.message || 'Sign in failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (googleResponse) => {
      setAuthErrors([]);
      setAuthLoading(true);
      try {
        const { data } = await api.post('/auth/google', {
          code: googleResponse.code,
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('userProfile', JSON.stringify(data.user));
        if (data.user.profileImage) localStorage.setItem('userAvatar', data.user.profileImage);
        if (data.isNewUser) {
          setGoogleNewUser({ token: data.token, user: data.user, name: data.user.name || '' });
          setActive(true); // show the sign-up/completion panel on mobile
        } else {
          window.dispatchEvent(new Event('authchange'));
          navigate(from);
        }
      } catch (err) {
        pushError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setAuthLoading(false);
      }
    },
    onError: () => pushError('Google sign-in failed. Please try again.'),
  });

  const handleProfileComplete = async (payload) => {
    setAuthErrors([]);
    setAuthLoading(true);
    try {
      const { data } = await api.put('/auth/profile', payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      if (data.user.profileImage) localStorage.setItem('userAvatar', data.user.profileImage);
      setGoogleNewUser(null);
      window.dispatchEvent(new Event('authchange'));
      window.dispatchEvent(new Event('profileupdate'));
      navigate(from);
    } catch (err) {
      pushError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUpComplete = async (payload) => {
    setAuthErrors([]);
    setAuthLoading(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authchange'));
      navigate(from);
    } catch (err) {
      pushError(err.response?.data?.message || 'Account creation failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="font-['Plus_Jakarta_Sans'] h-dvh w-screen bg-background overflow-hidden">
      {/* StudyBridge Logo — matches TopNav position exactly, teal accent */}
      <div className="fixed top-0 left-0 z-[200] pointer-events-none flex items-center h-20 px-6 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-accent pointer-events-auto">
          <img src="/logo-192.png" alt="StudyBridge" className="h-9 w-9 rounded-xl object-contain shadow-xs" />
          <span>StudyBridge</span>
        </Link>
      </div>

      {/* ===== DESKTOP LAYOUT (md+) ===== */}
      <main
        className={`hidden md:flex container-slider relative w-screen h-dvh bg-white overflow-hidden shadow-2xl ${active ? 'right-panel-active' : ''}`}
      >
        {/* Sign Up Form */}
        <div className="form-container sign-up-container" data-purpose="sign-up-form">
          {renderErrorStack()}
          {googleNewUser ? (
            <ProfileCompletionWizard defaultName={googleNewUser.name} onComplete={handleProfileComplete} submitting={authLoading} />
          ) : (
            <SignUpWizard onComplete={handleSignUpComplete} submitting={authLoading} />
          )}
        </div>

        {/* Sign In Form */}
        <div className="form-container sign-in-container" data-purpose="sign-in-form">
          {renderErrorStack()}
          <form onSubmit={handleSignIn} className="flex flex-col items-center justify-center px-10 md:px-24 h-full text-center bg-white">
            <h1 className="text-4xl font-extrabold text-primary mb-6">Log into your account</h1>
            <div className="flex justify-center mb-6">
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={authLoading}
                className="flex items-center gap-3 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <div className="w-full max-w-xs space-y-3 mb-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] text-[18px] pointer-events-none">
                  mail
                </span>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-[#f5f8ff] border border-[#cbd5e1] rounded-lg text-[14px] text-primary outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(38,166,154,0.15)] transition-all placeholder:text-[#94a3b8]"
                  placeholder="Email Address"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => {
                    setSignInEmail(e.target.value);
                    setAuthErrors([]);
                  }}
                />
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] text-[18px] pointer-events-none">
                  lock
                </span>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-[#f5f8ff] border border-[#cbd5e1] rounded-lg text-[14px] text-primary outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(38,166,154,0.15)] transition-all placeholder:text-[#94a3b8]"
                  placeholder="Password"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => {
                    setSignInPassword(e.target.value);
                    setAuthErrors([]);
                  }}
                />
              </div>
            </div>
            <div className="mb-3 flex w-full max-w-xs justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full max-w-xs bg-primary text-white font-bold py-2 rounded-full hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest text-xs shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Signing in…' : 'SIGN IN'}
            </button>
          </form>
        </div>

        {/* Overlay */}
        <div className="overlay-container" data-purpose="sliding-overlay">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-accent text-[10px] font-extrabold tracking-widest uppercase mb-6 border border-white/20">
                <span className="material-symbols-outlined text-xs">person</span>
                ALREADY A MEMBER?
              </div>
              <h2 className="text-3xl font-bold mb-6">Welcome Back!</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-10 max-w-[280px]">
                To keep connected with your mentors please login with your personal info
              </p>
              <button
                type="button"
                onClick={() => toggleActive(false)}
                className="bg-accent text-primary font-bold text-sm px-10 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-xl"
                id="signIn"
              >
                Sign In
              </button>
            </div>

            <div className="overlay-panel overlay-right">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-accent text-[10px] font-extrabold tracking-widest uppercase mb-6 border border-white/20">
                <span className="material-symbols-outlined text-xs">star</span>
                NEW TO STUDYBRIDGE?
              </div>
              <h2 className="text-3xl font-bold mb-6">Hello, Friend!</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-10 max-w-[280px]">
                Enter your details and start your personalized academic journey with us
              </p>
              <button
                type="button"
                onClick={() => toggleActive(true)}
                className="bg-accent text-primary font-bold text-sm px-10 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-xl"
                id="signUp"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ===== MOBILE LAYOUT (<md) ===== */}
      <main
        className={`flex md:hidden flex-col w-screen h-dvh overflow-hidden ${active ? 'right-panel-active' : ''}`}
        id="auth-root-mobile"
      >
        {/* TOP INFO PANEL (40% height) */}
        <div className="relative h-[40dvh] bg-[#1a2b48] overflow-hidden z-20 shadow-xl">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#1a2b48] rounded-full blur-[120px]"></div>
          </div>

          {/* Vertical sliding content */}
          <div className="mobile-slider h-[200%] w-full" id="info-panel-inner">
            {/* View 1: Sign Up prompt */}
            <div className="h-1/2 flex flex-col items-center justify-center px-8 text-center pt-12">
              <h2 className="text-[36px] font-extrabold tracking-tight text-white mb-2 leading-tight">Hello, Friend!</h2>
              <p className="text-[14px] text-[#b6c7eb] leading-relaxed mb-6 max-w-[280px]">
                Enter your personal details and start your academic journey with us today.
              </p>
              <button
                type="button"
                onClick={() => toggleActive(true)}
                className="px-10 py-3 border-2 border-white text-white rounded-full text-[12px] font-bold tracking-[0.1em] uppercase hover:bg-white hover:text-[#1a2b48] transition-all duration-300 btn-active relative overflow-hidden"
              >
                Sign Up
              </button>
            </div>

            {/* View 2: Sign In prompt */}
            <div className="h-1/2 flex flex-col items-center justify-center px-8 text-center pt-12">
              <h2 className="text-[36px] font-extrabold tracking-tight text-white mb-2 leading-tight">Welcome Back!</h2>
              <p className="text-[14px] text-[#b6c7eb] leading-relaxed mb-6 max-w-[280px]">
                To keep connected with your mentors, please login with your personal info.
              </p>
              <button
                type="button"
                onClick={() => toggleActive(false)}
                className="px-10 py-3 border-2 border-accent text-accent rounded-full text-[12px] font-bold tracking-[0.1em] uppercase hover:bg-accent hover:text-white transition-all duration-300 btn-active relative overflow-hidden"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM FORM PANEL (60% height) */}
        <div className="relative h-[60dvh] bg-[#f8f9ff] z-10 overflow-hidden">
          <div className="mobile-slider h-[200%] w-full" id="form-panel-inner">
            {/* Form 1: SIGN IN */}
            <div className="relative h-1/2 flex flex-col px-8 py-8 overflow-y-auto">
              {renderErrorStack()}
              <div className="mb-6">
                <h1 className="text-[30px] font-bold text-[#031632]">Sign In</h1>
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() => googleLogin()}
                    disabled={authLoading}
                    className="flex items-center gap-3 rounded-full border border-[#c5c6ce] bg-white px-5 py-3 text-[14px] font-semibold text-[#031632] shadow-sm transition-all hover:bg-[#eff4ff] hover:shadow-md disabled:opacity-60"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 border-t border-[#c5c6ce]" />
                  <span className="text-[10px] font-extrabold tracking-[0.15em] text-[#44474d] uppercase">or</span>
                  <div className="flex-1 border-t border-[#c5c6ce]" />
                </div>
              </div>
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] text-[18px] pointer-events-none">
                    mail
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-[#f5f8ff] border border-[#cbd5e1] rounded-lg text-[14px] text-primary outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(38,166,154,0.15)] transition-all placeholder:text-[#94a3b8]"
                    placeholder="Email"
                    type="email"
                    value={signInEmail}
                    onChange={(e) => {
                      setSignInEmail(e.target.value);
                      setAuthErrors([]);
                    }}
                  />
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] text-[18px] pointer-events-none">
                    lock
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-[#f5f8ff] border border-[#cbd5e1] rounded-lg text-[14px] text-primary outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(38,166,154,0.15)] transition-all placeholder:text-[#94a3b8]"
                    placeholder="Password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => {
                      setSignInPassword(e.target.value);
                      setAuthErrors([]);
                    }}
                  />
                </div>
                <div className="-mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-4 bg-[#031632] text-white rounded-full text-[12px] font-bold tracking-[0.1em] uppercase shadow-lg btn-active relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {authLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </div>

            {/* Form 2: SIGN UP / Profile Completion */}
            <div className="relative h-1/2 flex flex-col overflow-y-auto">
              {renderErrorStack()}
              {googleNewUser ? (
                <ProfileCompletionWizard defaultName={googleNewUser.name} onComplete={handleProfileComplete} submitting={authLoading} />
              ) : (
                <SignUpWizard onComplete={handleSignUpComplete} submitting={authLoading} />
              )}
            </div>
          </div>
        </div>
      </main>

      
      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onSignedIn={() => navigate(from)}
        defaultEmail={signInEmail}
      /><style>{`
        /* ===== DESKTOP STYLES ===== */
        .form-container {
          position: absolute;
          top: 0;
          height: 100dvh;
          transition: all 0.6s ease-in-out;
        }
        .sign-in-container {
          left: 0;
          width: 60%;
          z-index: 2;
        }
        .sign-up-container {
          left: 0;
          width: 60%;
          opacity: 0;
          z-index: 1;
        }
        .container-slider.right-panel-active .sign-in-container {
          transform: translateX(66.67%);
        }
        .container-slider.right-panel-active .sign-up-container {
          transform: translateX(66.67%);
          opacity: 1;
          z-index: 5;
        }
        .overlay-container {
          position: absolute;
          top: 0;
          left: 60%;
          width: 40%;
          height: 100dvh;
          overflow: hidden;
          transition: transform 0.6s ease-in-out;
          z-index: 100;
        }
        .container-slider.right-panel-active .overlay-container {
          transform: translateX(-150%);
        }
        .overlay {
          background: #1a2b48;
          background: linear-gradient(to right, #1a2b48, #283852);
          color: #FFFFFF;
          position: relative;
          left: -150%;
          height: 100dvh;
          width: 250%;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
        }
        .container-slider.right-panel-active .overlay {
          transform: translateX(60%);
        }
        .overlay-panel {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 40px;
          text-align: center;
          top: 0;
          height: 100dvh;
          width: 40%;
          transition: transform 0.6s ease-in-out;
        }
        .overlay-left {
          transform: translateX(-20%);
        }
        .container-slider.right-panel-active .overlay-left {
          transform: translateX(0);
        }
        .overlay-right {
          right: 0;
          transform: translateX(0);
        }
        .container-slider.right-panel-active .overlay-right {
          transform: translateX(20%);
        }
        .auth-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          outline: none;
        }
        .auth-input:focus {
          box-shadow: 0 0 0 2px rgba(38, 166, 154, 0.2);
          border-color: #26a69a;
        }

        /* ===== MOBILE STYLES ===== */
        .mobile-slider {
          transition: transform 0.6s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .right-panel-active #info-panel-inner {
          transform: translateY(-50%);
        }
        .right-panel-active #form-panel-inner {
          transform: translateY(-50%);
        }

        /* Micro-interactions */
        .btn-active:active {
          transform: scale(0.96) !important;
        }

        /* Error stack items — slide in from the top, hold, then fade out over 4s (matched to the dismiss timer) */
        .toast-item {
          animation: toast-item 4s ease forwards;
        }
        @keyframes toast-item {
          0% { opacity: 0; transform: translateY(-12px); }
          8% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }

        /* Material Symbols defaults */
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
