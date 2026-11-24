const jwt = require('jsonwebtoken');

/**
 * Signs a JWT access token containing the user's ID and current tokenVersion
 * so sessions can be revoked instantaneously upon logout or password reset.
 * @param {{ _id: string|object, tokenVersion?: number }} user - Authenticated user document.
 * @returns {string} Signed JWT token valid for 15 days.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '15d' }
  );
};

module.exports = generateToken;
