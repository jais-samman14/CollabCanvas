// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPasswordAPI } from '../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPasswordAPI({ email: email.trim().toLowerCase() });
      setSent(true);

      // Auto-navigate to reset page after 2 sec
      setTimeout(() => {
        navigate('/reset-password', { state: { email: email.trim().toLowerCase() } });
      }, 2000);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="bg-canvas-surface border border-canvas-border rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-4 shadow-lg shadow-orange-500/25">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
            <p className="text-slate-400 text-sm">
              No worries — enter your email and we'll send you a reset OTP.
            </p>
          </div>

          {/* Success state */}
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Check your email!
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                If an account exists for <strong>{email}</strong>, we've sent a 6-digit OTP.
              </p>
              <p className="text-xs text-slate-500">
                Redirecting to reset page...
              </p>
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Error alert */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-2 text-slate-300"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-canvas-bg border border-canvas-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    We'll send a 6-digit OTP valid for 5 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Sending OTP...
                    </>
                  ) : (
                    <>Send OTP 📧</>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-canvas-border"></div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Or</span>
                <div className="flex-1 h-px bg-canvas-border"></div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-slate-400">
                  Remember your password?{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Back to Login
                  </Link>
                </p>
                <p className="text-sm text-slate-400">
                  Have an OTP already?{' '}
                  <Link
                    to="/reset-password"
                    className="text-primary hover:underline font-medium"
                  >
                    Reset Password
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-slate-500 mt-6">
          🔒 Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;