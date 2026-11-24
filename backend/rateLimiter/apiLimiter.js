const createRateLimiter = require('../middleware/rateLimitMiddleware');

exports.loginLimiter = createRateLimiter({
  keyPrefix: 'login',
  maxRequests: 5,
  windowSize: 60,
});

exports.signupLimiter = createRateLimiter({
  keyPrefix: 'signup',
  maxRequests: 10,
  windowSize: 60,
});

exports.createBoardLimiter = createRateLimiter({
  keyPrefix: 'board_create',
  maxRequests: 20,
  windowSize: 3600,
});

exports.deleteBoardLimiter = createRateLimiter({
  keyPrefix: 'delete_board',
  maxRequests: 10,
  windowSize: 3600,
});

exports.forgotPasswordLimiter = createRateLimiter({
  keyPrefix: 'forgot_password',
  maxRequests: 10,
  windowSize: 15 * 60,
});

exports.resetPasswordLimiter = createRateLimiter({
  keyPrefix: 'reset_password',
  maxRequests: 10,
  windowSize: 15 * 60,
});
