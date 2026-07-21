// src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sparkles, setSparkles] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const createSparkles = () => {
    const newSparkles = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      left: 50 + (Math.random() - 0.5) * 80,
      delay: i * 0.05,
      color: ['#6366f1', '#a855f7', '#ec4899', '#22c55e'][i % 4],
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData);
      createSparkles();
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Login failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-aurora-animated relative overflow-hidden flex items-center justify-center px-6 py-12">
      {/* Subtle aurora blobs */}
      <div className="aurora-blob aurora-blob-1"></div>
      <div className="aurora-blob aurora-blob-2"></div>
      <div className="aurora-blob aurora-blob-3"></div>

      {/* Centered card */}
      <div className="relative w-full max-w-md z-10">
        {/* Sparkles */}
        {sparkles.map((s) => (
          <div
            key={s.id}
            className="sparkle"
            style={{
              left: `${s.left}%`,
              top: '50%',
              animationDelay: `${s.delay}s`,
            }}
          >
            <span style={{ color: s.color, fontSize: '24px' }}>✨</span>
          </div>
        ))}

        <div className="auth-card-glow bg-canvas-surface rounded-2xl p-10 shadow-2xl animate-fade-in-up">
          {/* Success State */}
          {success ? (
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-success-burst shadow-2xl shadow-green-500/50">
                <svg
                  className="w-14 h-14 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline
                    points="20 6 9 17 4 12"
                    className="animate-tick-mark"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold gradient-text-animated mb-2">
                Welcome back!
              </h2>
              <p className="text-slate-400 text-sm">
                Taking you to your boards...
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-xl shadow-primary/40 mb-5 animate-bounce-in">
                  <span className="text-3xl">👋</span>
                </div>
                <h1 className="text-4xl font-bold mb-3">
                  Welcome <span className="gradient-text-animated">back</span>
                </h1>
                <p className="text-slate-400">
                  Sign in to your account to continue
                </p>
              </div>

              {/* Error alert */}
              {error && (
                <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-start gap-2 animate-fade-in">
                  <span className="text-lg leading-none">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="floating-label-input relative">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder=" "
                    className="premium-input"
                    autoComplete="email"
                  />
                  <label htmlFor="email">Email address</label>
                  <div className="input-icon">📧</div>
                </div>

                {/* Password */}
                <div>
                  <div className="floating-label-input relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder=" "
                      className="premium-input pr-12"
                      autoComplete="current-password"
                    />
                    <label htmlFor="password">Password</label>
                    <div className="input-icon">🔒</div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="toggle-icon absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-lg z-10"
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:text-purple-400 hover:underline transition"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="pulse-ring w-full py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-xl shadow-primary/40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      Signing you in
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                    </>
                  ) : (
                    <>
                      Sign In <span>→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider + Signup link */}
              <div className="mt-8 pt-6 border-t border-canvas-border text-center">
                <p className="text-sm text-slate-400">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-primary hover:text-purple-400 hover:underline font-semibold transition"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Bottom trust line */}
        <p className="text-center text-xs text-slate-500 mt-6">
          🔒 Secured with JWT authentication
        </p>
      </div>
    </div>
  );
};

export default LoginPage;