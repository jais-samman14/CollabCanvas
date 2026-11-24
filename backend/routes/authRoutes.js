const express = require('express');
const router = express.Router();
const {
  signupUser,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
} = require('../controllers/authController');
const {
  signupValidationRules,
  loginValidationRules,
} = require('../validators/authValidator');
const validate = require('../middleware/validate');
const protect = require('../middleware/authMiddleware');
const {
  loginLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require('../rateLimiter/apiLimiter');

router.post('/signup', signupLimiter, signupValidationRules(), validate, signupUser);
router.post('/login', loginLimiter, loginValidationRules(), validate, loginUser);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.post('/logout', protect, logoutUser);

module.exports = router;
