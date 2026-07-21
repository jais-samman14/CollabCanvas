// src/pages/SignupPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
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
    const newSparkles = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i,
      left: 50 + (Math.random() - 0.5) * 80,
      delay: i * 0.04,
      color: ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b'][i % 5],
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup(formData);
      createSparkles();
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      const message =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Signup failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return { level: 0, label: '', color: 'bg-canvas-border' };
    if (pwd.length < 6)
      return { level: 1, label: 'Too short', color: 'bg-red-500' };
    if (!/\d/.test(pwd))
      return { level: 2, label: 'Add a number', color: 'bg-orange-500' };
    if (pwd.length < 10)
      return { level: 3, label: 'Good', color: 'bg-yellow-500' };
    return { level: 4, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-[calc(100vh-73px)] bg-aurora-animated relative overflow-hidden flex items-center justify-center px-6 py-12">
      {/* Aurora blobs */}
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
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold gradient-text-animated mb-2">
                Account created!
              </h2>
              <p className="text-slate-400 text-sm">
                Setting up your workspace...
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-xl shadow-primary/40 mb-5 animate-bounce-in">
                  <span className="text-3xl">🚀</span>
                </div>
                <h1 className="text-4xl font-bold mb-3">
                  Create your{' '}
                  <span className="gradient-text-animated">account</span>
                </h1>
                <p className="text-slate-400">
                  Get started in less than a minute
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
                {/* Name */}
                <div className="floating-label-input relative">
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    minLength={2}
                    placeholder=" "
                    className="premium-input"
                    autoComplete="name"
                  />
                  <label htmlFor="name">Full name</label>
                  <div className="input-icon">👤</div>
                </div>

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
                      minLength={6}
                      placeholder=" "
                      className="premium-input pr-12"
                      autoComplete="new-password"
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

                  {/* Password strength */}
                  {formData.password && (
                    <div className="mt-3 animate-fade-in">
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`strength-bar flex-1 ${
                              i <= strength.level
                                ? strength.color
                                : 'bg-canvas-border'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Password strength:</span>
                        <span className="font-semibold text-slate-300">
                          {strength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="pulse-ring w-full py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-xl shadow-primary/40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      Creating your account
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                    </>
                  ) : (
                    <>
                      Create Account <span>🚀</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider + Login link */}
              <div className="mt-8 pt-6 border-t border-canvas-border text-center">
                <p className="text-sm text-slate-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary hover:text-purple-400 hover:underline font-semibold transition"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Bottom trust line */}
        <p className="text-center text-xs text-slate-500 mt-6">
          🔒 Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
};

export default SignupPage;