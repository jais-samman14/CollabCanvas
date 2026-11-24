import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resetPasswordAPI, forgotPasswordAPI } from '../../services/authService';
import './ResetPasswordPage.css';

/**
 * Reset Password page with a 6-slot numeric OTP input, resend cooldown timer,
 * and password confirmation validation.
 */
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  // Store 6 independent digit slots so clearing a middle box never shifts later digits
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef([]);

  // Countdown timer for the "Resend OTP" button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  /** Updates a single OTP digit slot and advances focus to the next slot. */
  const handleOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  /** Supports Backspace and Left/Right arrow navigation across the 6 OTP boxes. */
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  /** Distributes a pasted 6-digit OTP across all 6 input slots. */
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  /** Submits the email, 6-digit OTP, and new password to the backend. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of your OTP');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordAPI({
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /** Requests a fresh OTP and starts a 60-second resend cooldown. */
  const handleResendOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first');
      return;
    }
    setError('');
    setResendCooldown(60);
    try {
      await forgotPasswordAPI({ email: email.trim().toLowerCase() });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to resend OTP';
      setError(message);
      setResendCooldown(0);
    }
  };

  if (success) {
    return (
      <div className="reset-page">
        <div className="reset-page__container">
          <div className="reset-card reset-card--centered">
            <div className="reset-card__success-badge">✅</div>
            <h1 className="reset-card__success-title">Password Reset!</h1>
            <p className="reset-card__sub">
              Your password has been updated. Redirecting to login...
            </p>
            <div className="spinner spinner-md reset-card__spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-page">
      <div className="reset-page__container">
        <div className="reset-card">
          <div className="reset-card__header">
            <div className="reset-card__icon">🔑</div>
            <h1 className="reset-card__title">Reset Password</h1>
            <p className="reset-card__sub">
              Enter the 6-digit OTP from your email and choose a new password.
            </p>
          </div>

          {error && (
            <div className="reset-card__error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="reset-form">
            <div className="reset-field">
              <label htmlFor="reset-email" className="reset-field__label">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="reset-field__input"
              />
            </div>

            <div className="reset-field">
              <label className="reset-field__label">6-Digit OTP</label>
              <div className="reset-otp-grid">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpDigits[idx]}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="reset-otp-box"
                    aria-label={`OTP digit ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="reset-otp-meta">
                <span className="reset-field__hint">Check your email inbox</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="reset-resend-btn"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>

            <div className="reset-field">
              <label htmlFor="reset-new-password" className="reset-field__label">
                New Password
              </label>
              <div className="reset-field__input-wrap">
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="reset-field__input reset-field__input--with-toggle"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="reset-field__toggle"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="reset-field">
              <label htmlFor="reset-confirm-password" className="reset-field__label">
                Confirm Password
              </label>
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Re-enter new password"
                className="reset-field__input"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="reset-field__mismatch">Passwords don&apos;t match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="reset-form__submit">
              {loading ? (
                <>
                  <span className="spinner spinner-sm" />
                  Resetting password...
                </>
              ) : (
                <>Reset Password 🔒</>
              )}
            </button>
          </form>

          <p className="reset-card__footer">
            <Link to="/login" className="reset-card__link">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
