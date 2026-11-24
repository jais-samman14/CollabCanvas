import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPasswordAPI } from '../../services/authService';
import './ForgotPasswordPage.css';

/**
 * Forgot Password page that requests a 6-digit OTP via the HTTPS email API
 * and redirects to the Reset Password page with the email pre-filled.
 */
const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  /** Requests a password reset OTP for the normalized email address. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    try {
      await forgotPasswordAPI({ email: normalizedEmail });
      setSent(true);
      setTimeout(() => {
        navigate('/reset-password', { state: { email: normalizedEmail } });
      }, 1800);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-page__container">
        <div className="forgot-card">
          <div className="forgot-card__header">
            <div className="forgot-card__icon">🔐</div>
            <h1 className="forgot-card__title">Forgot Password?</h1>
            <p className="forgot-card__sub">
              No worries — enter your email and we&apos;ll send you a 6-digit reset OTP.
            </p>
          </div>

          {sent ? (
            <div className="forgot-card__sent">
              <div className="forgot-card__sent-badge">✅</div>
              <h3 className="forgot-card__sent-title">Check your email!</h3>
              <p className="forgot-card__sent-desc">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a
                6-digit OTP.
              </p>
              <p className="forgot-card__sent-hint">Redirecting to reset page...</p>
              <div className="spinner spinner-md forgot-card__spinner" />
            </div>
          ) : (
            <>
              {error && (
                <div className="forgot-card__error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="forgot-form">
                <div className="forgot-field">
                  <label htmlFor="forgot-email" className="forgot-field__label">
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    className="forgot-field__input"
                  />
                  <p className="forgot-field__hint">
                    We&apos;ll send a 6-digit OTP valid for 5 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="forgot-form__submit"
                >
                  {loading ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Sending OTP...
                    </>
                  ) : (
                    <>Send OTP 📧</>
                  )}
                </button>
              </form>

              <div className="forgot-card__divider">
                <span className="forgot-card__divider-line" />
                <span className="forgot-card__divider-text">Or</span>
                <span className="forgot-card__divider-line" />
              </div>

              <div className="forgot-card__links">
                <p>
                  Remember your password?{' '}
                  <Link to="/login" className="forgot-card__link">
                    Back to Login
                  </Link>
                </p>
                <p>
                  Have an OTP already?{' '}
                  <Link to="/reset-password" className="forgot-card__link">
                    Reset Password
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="forgot-page__trust">🔒 Your data is encrypted and secure</p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
