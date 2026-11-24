import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

/**
 * Login page allowing existing users to authenticate with email and password.
 */
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /** Updates form field state and clears any prior error message. */
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  /** Submits login credentials and redirects to the dashboard upon success. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Login failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page aurora-bg">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />

      <div className="login-page__container">
        <div className="login-card">
          {success ? (
            <div className="login-card__success">
              <div className="login-card__success-circle">✓</div>
              <h2 className="login-card__success-title gradient-text">Welcome back!</h2>
              <p className="login-card__muted">Taking you to your boards...</p>
            </div>
          ) : (
            <>
              <div className="login-card__header">
                <div className="login-card__icon">👋</div>
                <h1 className="login-card__title">
                  Welcome <span className="gradient-text">back</span>
                </h1>
                <p className="login-card__muted">Sign in to your account to continue</p>
              </div>

              {error && (
                <div className="login-card__error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label htmlFor="login-email" className="login-field__label">
                    Email address
                  </label>
                  <div className="login-field__input-wrap">
                    <span className="login-field__icon">📧</span>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="login-field__input"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="login-password" className="login-field__label">
                    Password
                  </label>
                  <div className="login-field__input-wrap">
                    <span className="login-field__icon">🔒</span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="login-field__input login-field__input--with-toggle"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="login-field__toggle"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="login-form__forgot-row">
                    <Link to="/forgot-password" className="login-card__link">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-form__submit">
                  {loading ? 'Signing you in...' : 'Sign In →'}
                </button>
              </form>

              <div className="login-card__footer">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="login-card__link login-card__link--bold">
                  Create one
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="login-page__trust">🔒 Secured with JWT authentication</p>
      </div>
    </div>
  );
};

export default LoginPage;
