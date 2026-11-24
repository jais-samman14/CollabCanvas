const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const generateOTP = require('../utils/otpGenerator');
const cacheStore = require('../services/cacheStore');
const { sendPasswordResetOTP } = require('../services/emailService');

/**
 * Computes a SHA-256 hex digest of an OTP string so plaintext OTPs are never cached.
 * @param {string} otp - 6-digit OTP code.
 * @returns {string} 64-character hex digest.
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

/**
 * Performs a constant-time comparison between two hex digests to prevent timing attacks.
 * @param {string} a - First hex hash.
 * @param {string} b - Second hex hash.
 * @returns {boolean} True if both hashes are identical.
 */
const safeEqualHash = (a, b) => {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Normalizes an email address by trimming whitespace and lowercasing.
 * @param {unknown} email - Raw email input.
 * @returns {string} Normalized email string.
 */
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * Registers a new user account and immediately returns a signed JWT.
 * @route POST /api/auth/signup
 */
const signupUser = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user),
      },
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Authenticates an existing user with email + password and issues a JWT.
 * @route POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      return res.status(200).json({
        success: true,
        message: 'User logged in successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          token: generateToken(user),
        },
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Generates a 6-digit password reset OTP, caches its SHA-256 hash with a 5-minute TTL
 * and 30-second resend cooldown, and delivers it via HTTPS email API (or dev console).
 * Always returns a generic success message to prevent user email enumeration.
 * @route POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent.',
      });
    }

    const cooldownKey = `password_reset_cooldown:${email}`;
    const cooldownExists = await cacheStore.get(cooldownKey);
    if (cooldownExists) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 30 seconds before requesting another OTP',
      });
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);
    const otpKey = `password_reset_otp:${email}`;
    const attemptsKey = `password_reset_attempts:${email}`;

    await cacheStore.set(otpKey, hashedOtp, { EX: 300 });
    await cacheStore.del(attemptsKey);
    await cacheStore.set(cooldownKey, '1', { EX: 30 });

    await sendPasswordResetOTP(email, otp);

    return res.status(200).json({
      success: true,
      message: 'If the email exists, an OTP has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again later.',
    });
  }
};

/**
 * Verifies a password reset OTP using constant-time hash comparison, enforces a
 * 5-attempt lockout, updates the user's password, and increments `tokenVersion`
 * to revoke all active sessions.
 * @route POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required',
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const otpKey = `password_reset_otp:${email}`;
    const attemptKey = `password_reset_attempts:${email}`;
    const cooldownKey = `password_reset_cooldown:${email}`;

    const attempts = Number((await cacheStore.get(attemptKey)) || 0);
    if (attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many wrong OTP attempts. Please request a new OTP later.',
      });
    }

    const storedHashedOtp = await cacheStore.get(otpKey);
    if (!storedHashedOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const incomingHashedOtp = hashOTP(otp);
    if (!safeEqualHash(incomingHashedOtp, storedHashedOtp)) {
      const newAttempts = await cacheStore.incr(attemptKey);
      if (newAttempts === 1) {
        await cacheStore.expire(attemptKey, 15 * 60);
      }
      const remaining = Math.max(0, 5 - newAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remaining} attempts remaining.`,
      });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await Promise.all([
      cacheStore.del(otpKey),
      cacheStore.del(attemptKey),
      cacheStore.del(cooldownKey),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
};

/**
 * Logs out the authenticated user by incrementing `tokenVersion` in MongoDB,
 * immediately invalidating all existing JWTs across devices.
 * @route POST /api/auth/logout
 */
const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.tokenVersion += 1;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to logout' });
  }
};

module.exports = {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
};
