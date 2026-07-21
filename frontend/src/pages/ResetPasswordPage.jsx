// src/pages/ResetPasswordPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resetPasswordAPI, forgotPasswordAPI } from '../services/authService';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // OTP input refs (6 boxes)
  const otpInputRefs = useRef([]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (idx, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const otpArr = formData.otp.padEnd(6, ' ').split('');
    otpArr[idx] = digit || '';
    const newOtp = otpArr.join('').trim();
    setFormData({ ...formData, otp: newOtp });

    // Auto-focus next
    if (digit && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !formData.otp[idx] && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setFormData({ ...formData, otp: pasted });
    // Focus last filled
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordAPI({
        email: formData.email.trim().toLowerCase(),
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setResendCooldown(60);
    try {
      await forgotPasswordAPI({ email: formData.email.trim().toLowerCase() });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to resend OTP';
      setError(message);
      setResendCooldown(0);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-canvas-surface border border-canvas-border rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-green-400">Password Reset!</h1>
            <p className="text-slate-400 text-sm mb-6">
              Your password has been successfully updated. Redirecting to login...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="bg-canvas-surface border border-canvas-border rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-2xl mb-4 shadow-lg shadow-primary/25">
              <span className="text-2xl">🔑</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-slate-400 text-sm">
              Enter the OTP from your email and set a new password.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-canvas-bg border border-canvas-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-white placeholder:text-slate-500"
              />
            </div>

            {/* OTP — 6 boxes */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                6-Digit OTP
              </label>
              <div className="flex gap-2 justify-between">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={formData.otp[idx] || ''}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 text-center text-xl font-bold bg-canvas-bg border border-canvas-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-white"
                  />
                ))}
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-500">Check your email inbox</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-xs text-primary hover:underline disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed transition"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend OTP'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 pr-12 bg-canvas-bg border border-canvas-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-white placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                minLength={6}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 bg-canvas-bg border border-canvas-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-white placeholder:text-slate-500"
              />
              {formData.confirmPassword &&
                formData.newPassword !== formData.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">
                    Passwords don't match
                  </p>
                )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Resetting password...
                </>
              ) : (
                <>Reset Password 🔒</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            <Link to="/login" className="text-primary hover:underline font-medium">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;