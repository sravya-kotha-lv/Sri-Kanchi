import { FormEvent, useEffect, useState, type ChangeEvent } from 'react';
import { useShop } from '../context/ShopContext';
import commonApi from '../api/commonapi';

const passwordRuleMessage =
  'Password must be at least 8 characters and include one uppercase letter, one lowercase letter, and one special character.';

const validatePasswordRule = (password: string) =>
  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[^A-Za-z0-9]/.test(password);

const sanitizeOtpInput = (value: string) => value.replace(/\D/g, '').slice(0, 6);
const sanitizeNameInput = (value: string) => value.replace(/[^A-Za-z\s]/g, '').replace(/\s{2,}/g, ' ');
const isValidName = (value: string) => /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(value.trim());

const PasswordRuleHint = () => (
  <p className="text-xs leading-5 text-ink/56">
    Use minimum 8 characters with one uppercase letter, one lowercase letter, and one special character.
  </p>
);

function LoginPage() {
  const {
    authMode,
    authMessage,
    closeAuthModal,
    openAuthModal,
    currentUser,
    isAuthenticated,
    login,
    signup,
    changePassword,
    logout
  } = useShop();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetPasswordOtp, setResetPasswordOtp] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordManuallyEntered, setResetPasswordManuallyEntered] = useState(false);
  const [resetPasswordAutofillGuard, setResetPasswordAutofillGuard] = useState(true);
  const [resetPasswordFormNonce, setResetPasswordFormNonce] = useState(0);
  const [showResetPasswordValue, setShowResetPasswordValue] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [feedback, setFeedback] = useState(authMessage);
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(
    new URLSearchParams(window.location.search).get('change-password') === '1'
  );

  useEffect(() => {
    setFeedback(authMessage);
  }, [authMessage]);

  useEffect(() => {
    const syncChangePasswordParam = () => {
      setShowChangePassword(new URLSearchParams(window.location.search).get('change-password') === '1');
    };

    window.addEventListener('popstate', syncChangePasswordParam);
    return () => window.removeEventListener('popstate', syncChangePasswordParam);
  }, []);

  const resetPasswordFlowState = () => {
    setShowForgotPassword(false);
    setShowResetPassword(false);
    setForgotPasswordEmail('');
    setResetPasswordOtp('');
    setResetPasswordValue('');
    setResetPasswordManuallyEntered(false);
    setResetPasswordAutofillGuard(true);
    setShowResetPasswordValue(false);
  };

  const prepareResetPasswordForm = () => {
    setResetPasswordOtp('');
    setResetPasswordValue('');
    setResetPasswordManuallyEntered(false);
    setResetPasswordAutofillGuard(true);
    setShowResetPasswordValue(false);
    setResetPasswordFormNonce((current) => current + 1);
  };

  const handleResetPasswordValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    setResetPasswordValue(event.target.value);

    if (!resetPasswordManuallyEntered && document.activeElement === event.currentTarget) {
      setResetPasswordManuallyEntered(true);
    }
  };

  const handleExistingAccountOtpFlow = async (email: string) => {
    try {
      const response = await commonApi.auth.resendEmailOtp({ email });
      setPendingVerificationEmail(email);
      setEmailOtp('');
      setShowEmailOtp(true);
      setFeedback(response.message ?? 'Enter the OTP sent to your email.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend OTP.';

      if (/already verified/i.test(message)) {
        setShowEmailOtp(false);
        setPendingVerificationEmail('');
        setLoginEmail(email);
        openAuthModal('login', 'This email is already verified. Please login with your password.');
        setFeedback('This email is already verified. Please login with your password.');
        return;
      }

      setPendingVerificationEmail(email);
      setEmailOtp('');
      setShowEmailOtp(true);
      setFeedback(message);
    }
  };

  const handleForgotPasswordRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = forgotPasswordEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setFeedback('Please enter your email.');
      return;
    }

    setLoading(true);
    setFeedback('Sending password reset OTP...');

    try {
      const response = await commonApi.auth.forgetPassword({ email: normalizedEmail });
      setForgotPasswordEmail(normalizedEmail);
      setLoginEmail(normalizedEmail);
      prepareResetPasswordForm();
      setShowForgotPassword(false);
      setShowResetPassword(true);
      setFeedback(response.message ?? 'Password reset OTP sent to your email.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to send password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = forgotPasswordEmail.trim().toLowerCase();

    if (!normalizedEmail || !resetPasswordOtp.trim() || !resetPasswordValue.trim()) {
      setFeedback('Please enter email, OTP, and new password.');
      return;
    }

    if (!resetPasswordManuallyEntered) {
      setFeedback('Please manually type your new password.');
      return;
    }

    if (!validatePasswordRule(resetPasswordValue)) {
      setFeedback(passwordRuleMessage);
      return;
    }

    setLoading(true);
    setFeedback('Resetting password...');

    try {
      const response = await commonApi.auth.resetPassword({
        email: normalizedEmail,
        otp: resetPasswordOtp.trim(),
        newPassword: resetPasswordValue
      });

      setLoginEmail(normalizedEmail);
      setLoginPassword('');
      setResetPasswordOtp('');
      setResetPasswordValue('');
      setResetPasswordManuallyEntered(false);
      setShowResetPasswordValue(false);
      setShowResetPassword(false);
      openAuthModal('login', response.message ?? 'Password reset successful. Please login with your new password.');
      setFeedback(response.message ?? 'Password reset successful. Please login with your new password.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validatePasswordRule(loginPassword)) {
      setFeedback(passwordRuleMessage);
      return;
    }

    setLoading(true);
    setFeedback('Logging in...');

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const result = await login(loginEmail, loginPassword);

      if (!result.success && /email not verified|verify the otp/i.test(result.message)) {
        setPendingVerificationEmail(normalizedEmail);
        setSignupEmail(normalizedEmail);
        setEmailOtp('');
        setShowEmailOtp(true);
      }

      setFeedback(result.success ? 'Login successful. Redirecting you back now.' : result.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = sanitizeNameInput(signupName).trim();

    if (!isValidName(normalizedName)) {
      setSignupName(normalizedName);
      setFeedback('Full name should contain alphabets only.');
      return;
    }

    if (!validatePasswordRule(signupPassword)) {
      setFeedback(passwordRuleMessage);
      return;
    }

    setLoading(true);
    setFeedback('Creating your account...');

    try {
      const normalizedEmail = signupEmail.trim().toLowerCase();
      const result = await signup(normalizedName, normalizedEmail, signupPassword, signupPhone);

      if (result.success) {
        setPendingVerificationEmail(normalizedEmail);
        setLoginEmail(normalizedEmail);
        setLoginPassword(signupPassword);
        setEmailOtp('');
        setShowEmailOtp(true);
        setFeedback('Account created. Please enter the OTP sent to your email.');
      } else {
        if (/already exists|user with this email already exists/i.test(result.message)) {
          await handleExistingAccountOtpFlow(normalizedEmail);
          return;
        }

        setFeedback(/validation failed/i.test(result.message) ? passwordRuleMessage : result.message);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleVerifyEmailOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = pendingVerificationEmail.trim().toLowerCase();

    if (!normalizedEmail || !emailOtp.trim()) {
      setFeedback('Please enter the OTP sent to your email.');
      return;
    }

    setLoading(true);
    setFeedback('Verifying email OTP...');

    try {
      const response = await commonApi.auth.verifyEmail({
        email: normalizedEmail,
        otp: emailOtp.trim()
      });

      setFeedback(response.message ?? 'Email verified successfully. Please login now.');
      setShowEmailOtp(false);
      setEmailOtp('');
      openAuthModal('login', 'Email verified successfully. Please login now.');
      setSignupName('');
      setSignupEmail('');
      setSignupPhone('');
      setSignupPassword('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    const normalizedEmail = pendingVerificationEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setFeedback('Please enter your email first.');
      return;
    }

    setLoading(true);
    setEmailOtp('');
    setFeedback('Sending a new OTP...');

    try {
      const response = await commonApi.auth.resendEmailOtp({
        email: normalizedEmail
      });

      setFeedback(response.message ?? 'New OTP sent to your email.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to resend OTP.');
    } finally {
      setLoading(false);
    }
  };


  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validatePasswordRule(newPassword)) {
      setFeedback(passwordRuleMessage);
      return;
    }

    setLoading(true);
    setFeedback('Changing password...');

    try {
      const result = await changePassword(oldPassword, newPassword);

      if (result.success) {
        setFeedback('Password changed successfully!');
        setShowChangePassword(false);
        setOldPassword('');
        setNewPassword('');
      } else {
        setFeedback(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderEyeIcon = (visible: boolean) =>
    visible ? (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden="true">
        <path d="M3 3l18 18" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 9.3 4.4 10 7-.3 1.1-1.2 2.8-2.7 4.2M6.1 6.1C3.9 7.5 2.5 9.7 2 12c.7 2.6 4.8 7 10 7 1.7 0 3.2-.4 4.5-1"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden="true">
        <path
          d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      </svg>
    );

  return (
    <section className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2.4rem] border border-white/85 bg-[linear-gradient(145deg,rgba(255,249,244,0.95),rgba(243,227,216,0.92))] p-6 shadow-[0_36px_70px_rgba(90,50,45,0.24),inset_0_1px_0_rgba(255,255,255,0.86)] sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-6%] top-[-10%] h-32 w-32 rounded-full bg-[#fff6ea]/72 blur-3xl" />
            <div className="absolute bottom-[-8%] right-[-4%] h-40 w-40 rounded-full bg-[#e4a48a]/30 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="rounded-[2rem] bg-[linear-gradient(140deg,rgba(133,56,79,0.96),rgba(201,108,93,0.92),rgba(236,183,123,0.86))] p-6 text-white shadow-[0_26px_46px_rgba(106,45,59,0.22)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/72">Sri Kanchi Banaras Silks</p>
              <h1 className="mt-4 font-display text-4xl leading-tight">
                {isAuthenticated ? 'Your Account' : 'Login Or Create Your Account'}
              </h1>
              <p className="mt-4 text-base leading-7 text-white/82">
                {isAuthenticated
                  ? `Logged in as ${currentUser?.email || 'user'}. You can now Buying products .`
                  : 'Login is required before Buying products.'}
              </p>

              {isAuthenticated && currentUser && (
                <div className="mt-4 rounded-[1.2rem] border border-white/20 bg-white/10 p-3 backdrop-blur-md">
                  {currentUser.fullName && (
                    <p className="text-sm text-white/90">
                      User: <span className="font-semibold">{currentUser.fullName}</span>
                    </p>
                  )}
                  {currentUser.email && <p className="mt-1 text-sm text-white/80">Email: {currentUser.email}</p>}
                  {currentUser.role && <p className="mt-1 text-sm text-white/80">Role: {currentUser.role}</p>}
                </div>
              )}

              <div className="mt-6 rounded-[1.6rem] border border-white/16 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-sm leading-7 text-white/88">{feedback}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_18px_34px_rgba(111,72,61,0.08)] backdrop-blur-xl sm:p-6">
              {isAuthenticated ? (
                <div className="grid gap-4">
                  <p className="text-sm font-semibold text-[#4a2a2c]">You are logged in.</p>

                  <button
                    type="button"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="rounded-full bg-[linear-gradient(135deg,#8c3f56_0%,#d38163_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(106,45,59,0.2)] transition"
                  >
                    {showChangePassword ? 'Cancel Password Change' : 'Change Password'}
                  </button>

                  {showChangePassword && (
                    <form className="mt-2 grid gap-4" onSubmit={handleChangePassword}>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Current Password</span>
                        <div className="relative">
                          <input
                            type={showOldPassword ? 'text' : 'password'}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 pr-14 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                            placeholder="Enter current password"
                            required
                          />
                          <button type="button" onClick={() => setShowOldPassword((current) => !current)} className="absolute inset-y-0 right-4 flex items-center text-[#7a4d4f]" aria-label={showOldPassword ? 'Hide password' : 'Show password'}>
                            {renderEyeIcon(showOldPassword)}
                          </button>
                        </div>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">New Password</span>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 pr-14 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                            placeholder="Enter new password"
                            minLength={8}
                            required
                          />
                          <button type="button" onClick={() => setShowNewPassword((current) => !current)} className="absolute inset-y-0 right-4 flex items-center text-[#7a4d4f]" aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                            {renderEyeIcon(showNewPassword)}
                          </button>
                        </div>
                        <PasswordRuleHint />
                      </label>
                      <button
                        type="submit"
                        disabled={loading}
                        className="liquid-btn mt-2 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Changing...' : 'Update Password'}
                      </button>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowChangePassword(false);
                      setFeedback('You have been logged out.');
                    }}
                    className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)]"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetPasswordFlowState();
                        setShowEmailOtp(false);
                        setEmailOtp('');
                        openAuthModal('login', 'Login to access your account.');
                      }}
                      className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                        authMode === 'login'
                          ? 'bg-[linear-gradient(135deg,#8c3f56_0%,#d38163_100%)] text-white shadow-[0_16px_28px_rgba(106,45,59,0.2)]'
                          : 'bg-white/60 text-wine'
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetPasswordFlowState();
                        setShowEmailOtp(false);
                        setEmailOtp('');
                        openAuthModal('signup', 'Create an account first, then continue to login.');
                      }}
                      className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                        authMode === 'signup'
                          ? 'bg-[linear-gradient(135deg,#8c3f56_0%,#d38163_100%)] text-white shadow-[0_16px_28px_rgba(106,45,59,0.2)]'
                          : 'bg-white/60 text-wine'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {showEmailOtp ? (
                    <form className="mt-6 grid gap-4" onSubmit={handleVerifyEmailOtp}>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Email</span>
                        <input
                          type="email"
                          value={pendingVerificationEmail}
                          onChange={(event) => setPendingVerificationEmail(event.target.value)}
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter your email"
                          required
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Email OTP</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={emailOtp}
                          onChange={(event) => setEmailOtp(sanitizeOtpInput(event.target.value))}
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter 6 digit OTP"
                          maxLength={6}
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={loading}
                        className="liquid-btn mt-2 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Verifying...' : 'Verify Email'}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleResendEmailOtp}
                        className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Resend OTP
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmailOtp(false);
                          setEmailOtp('');
                          setPendingVerificationEmail('');
                        }}
                        className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)]"
                      >
                        Back
                      </button>
                    </form>
                  ) : showForgotPassword ? (
                    <form className="mt-6 grid gap-4" onSubmit={handleForgotPasswordRequest}>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Email</span>
                        <input
                          type="email"
                          value={forgotPasswordEmail}
                          onChange={(event) => setForgotPasswordEmail(event.target.value)}
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter your registered email"
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={loading}
                        className="liquid-btn mt-2 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setForgotPasswordEmail('');
                          openAuthModal('login', 'Login to access to buy your products.');
                          setFeedback('Please login with your account.');
                        }}
                        className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)]"
                      >
                        Back To Login
                      </button>
                    </form>
                  ) : showResetPassword ? (
                    <form className="mt-6 grid gap-4" onSubmit={handleResetPasswordSubmit} autoComplete="off">
                      <input type="text" name={`reset-password-username-decoy-${resetPasswordFormNonce}`} className="hidden" tabIndex={-1} autoComplete="username" aria-hidden="true" />
                      <input type="password" name={`reset-password-current-decoy-${resetPasswordFormNonce}`} className="hidden" tabIndex={-1} autoComplete="current-password" aria-hidden="true" />
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Email</span>
                        <input
                          type="email"
                          name={`resetPasswordEmail-${resetPasswordFormNonce}`}
                          value={forgotPasswordEmail}
                          onChange={(event) => setForgotPasswordEmail(event.target.value)}
                          autoComplete="off"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter your registered email"
                          required
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Reset OTP</span>
                        <input
                          type="text"
                          name={`resetPasswordOtp-${resetPasswordFormNonce}`}
                          inputMode="numeric"
                          value={resetPasswordOtp}
                          onChange={(event) => setResetPasswordOtp(sanitizeOtpInput(event.target.value))}
                          autoComplete="off"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter 6 digit OTP"
                          maxLength={6}
                          required
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">New Password</span>
                        <div className="relative">
                          <input
                            type={showResetPasswordValue ? 'text' : 'password'}
                            key={`reset-password-value-${resetPasswordFormNonce}`}
                            name={`resetPasswordNewValue-${resetPasswordFormNonce}`}
                            value={resetPasswordValue}
                            onChange={handleResetPasswordValueChange}
                            autoComplete="off"
                            readOnly={resetPasswordAutofillGuard}
                            onFocus={() => setResetPasswordAutofillGuard(false)}
                            onMouseDown={() => setResetPasswordAutofillGuard(false)}
                            onTouchStart={() => setResetPasswordAutofillGuard(false)}
                            data-lpignore="true"
                            data-1p-ignore="true"
                            className="w-full rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 pr-14 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                            placeholder="Enter your new password"
                            minLength={8}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPasswordValue((current) => !current)}
                            className="absolute inset-y-0 right-4 flex items-center text-[#7a4d4f]"
                            aria-label={showResetPasswordValue ? 'Hide password' : 'Show password'}
                          >
                            {renderEyeIcon(showResetPasswordValue)}
                          </button>
                        </div>
                        <PasswordRuleHint />
                      </label>
                      <button
                        type="submit"
                        disabled={loading}
                        className="liquid-btn mt-2 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Resetting...' : 'Reset Password'}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setShowResetPassword(false);
                          setShowForgotPassword(true);
                          prepareResetPasswordForm();
                          setFeedback('Request a password reset OTP for your email.');
                        }}
                        className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Forgot Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetPassword(false);
                          prepareResetPasswordForm();
                          openAuthModal('login', 'Please login with your password.');
                          setFeedback('Please login with your account.');
                        }}
                        className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)]"
                      >
                        Back To Login
                      </button>
                    </form>
                  ) : authMode === 'login' ? (
                    <form className="mt-6 grid gap-4" onSubmit={handleLoginSubmit}>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Email</span>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(event) => setLoginEmail(event.target.value)}
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter your email"
                          required
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Password</span>
                        <div className="relative">
                          <input
                            type={showLoginPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(event) => setLoginPassword(event.target.value)}
                            className="w-full rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 pr-14 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                            placeholder="Enter your password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((current) => !current)}
                            className="absolute inset-y-0 right-4 flex items-center text-[#7a4d4f]"
                            aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                          >
                            {renderEyeIcon(showLoginPassword)}
                          </button>
                        </div>
                        <PasswordRuleHint />
                      </label>
                      <button
                        type="submit"
                        disabled={loading}
                        className="liquid-btn mt-2 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Logging in...' : 'Login Now'}
                      </button>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setShowForgotPassword(true);
                            setShowResetPassword(false);
                            setShowEmailOtp(false);
                            setForgotPasswordEmail(loginEmail.trim().toLowerCase());
                            setFeedback('Enter your email to receive a password reset OTP.');
                          }}
                          className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Forgot Password
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setShowResetPassword(true);
                            setShowForgotPassword(false);
                            setShowEmailOtp(false);
                            setForgotPasswordEmail(loginEmail.trim().toLowerCase());
                            prepareResetPasswordForm();
                            setFeedback('Enter email, OTP, and new password to reset your account password.');
                          }}
                          className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset Password
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={closeAuthModal}
                        className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)]"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <form className="mt-6 grid gap-4" onSubmit={handleSignupSubmit}>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Full Name</span>
                        <input
                          type="text"
                          value={signupName}
                          onChange={(event) => setSignupName(sanitizeNameInput(event.target.value))}
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter your name"
                          required
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Email</span>
                        <input
                          type="email"
                          value={signupEmail}
                          onChange={(event) => setSignupEmail(event.target.value)}
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Create your email"
                          required
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Contact Number</span>
                        <input
                          type="tel"
                          inputMode="tel"
                          value={signupPhone}
                          onChange={(event) => setSignupPhone(event.target.value)}
                          className="rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                          placeholder="Enter your contact number"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/48">Password</span>
                        <div className="relative">
                          <input
                            type={showSignupPassword ? 'text' : 'password'}
                            value={signupPassword}
                            onChange={(event) => setSignupPassword(event.target.value)}
                            className="w-full rounded-[1.2rem] border border-white/85 bg-white/70 px-4 py-3 pr-14 text-sm font-medium text-[#4a2a2c] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                            placeholder="Create your password"
                            minLength={8}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword((current) => !current)}
                            className="absolute inset-y-0 right-4 flex items-center text-[#7a4d4f]"
                            aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                          >
                            {renderEyeIcon(showSignupPassword)}
                          </button>
                        </div>
                        <PasswordRuleHint />
                      </label>
                      <button
                        type="submit"
                        disabled={loading}
                        className="liquid-btn mt-2 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                      </button>
                      <button
                        type="button"
                        onClick={closeAuthModal}
                        className="rounded-full border border-white/80 bg-white/55 px-6 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.08)]"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
