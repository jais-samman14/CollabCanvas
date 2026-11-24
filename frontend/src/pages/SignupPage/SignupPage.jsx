import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SignupPage.css';

/**
 * Evaluates password strength on a 0–4 scale matching backend validation rules.
 * @param {string} pwd - Candidate password.
 * @returns {{ level: number, label: string, color: string }}
 */
const getPasswordStrength = (pwd) => {
  if (!pwd) return { level: 0, label: '', color: '#334155' };
  if (pwd.length < 6) return { level: 1, label: 'Too short', color: '#ef4444' };
  if (!/\d/.test(pwd)) return { level: 2, label: 'Add a number', color: '#f97316' };
  if (pwd.length < 10) return { level: 3, label: 'Good', color: '#eab308' };
  return { level: 4, label: 'Strong', color: '#22c55e' };
};

/**
 * User registration page with real-time password strength meter and validation feedback.
 */
const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /** Updates signup field state and clears prior validation alerts. */
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  /** Registers the user account and redirects to the dashboard upon success. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup(formData);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Signup failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(formData.password);

  return (
    <div className="signup-page aurora-bg">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />

      <div className="signup-page__container">
        <div className="signup-card">
          {success ? (
            <div className="signup-card__success">
              <div className="signup-card__success-circle">🎉</div>
              <h2 className="signup-card__success-title gradient-text">Account created!</h2>
              <p className="signup-card__muted">Setting up your workspace...</p>
            </div>
          ) : (
            <>
              <div className="signup-card__header">
                <div className="signup-card__icon">🚀</div>
                <h1 className="signup-card__title">
                  Create your <span className="gradient-text">account</span>
                </h1>
                <p className="signup-card__muted">Get started in less than a minute</p>
              </div>

              {error && (
                <div className="signup-card__error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="signup-form">
                <div className="signup-field">
                  <label htmlFor="signup-name" className="signup-field__label">
                    Full name
                  </label>
                  <div className="signup-field__input-wrap">
                    <span className="signup-field__icon">👤</span>
                    <input
                      id="signup-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      minLength={3}
                      maxLength={50}
                      placeholder="Your name (min 3 chars)"
                      autoComplete="name"
                      className="signup-field__input"
                    />
                  </div>
                </div>

                <div className="signup-field">
                  <label htmlFor="signup-email" className="signup-field__label">
                    Email address
                  </label>
                  <div className="signup-field__input-wrap">
                    <span className="signup-field__icon">📧</span>
                    <input
                      id="signup-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="signup-field__input"
                    />
                  </div>
                </div>

                <div className="signup-field">
                  <label htmlFor="signup-password" className="signup-field__label">
                    Password
                  </label>
                  <div className="signup-field__input-wrap">
                    <span className="signup-field__icon">🔒</span>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Min 6 chars with a number"
                      autoComplete="new-password"
                      className="signup-field__input signup-field__input--with-toggle"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="signup-field__toggle"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="signup-strength">
                      <div className="signup-strength__bars">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className="signup-strength__bar"
                            style={{
                              backgroundColor:
                                step <= strength.level ? strength.color : '#334155',
                            }}
                          />
                        ))}
                      </div>
                      <p className="signup-strength__label">
                        Password strength: <strong>{strength.label}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="signup-form__submit">
                  {loading ? 'Creating your account...' : 'Create Account 🚀'}
                </button>
              </form>

              <div className="signup-card__footer">
                Already have an account?{' '}
                <Link to="/login" className="signup-card__link">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="signup-page__trust">🔒 Your data is encrypted and secure</p>
      </div>
    </div>
  );
};

export default SignupPage;
