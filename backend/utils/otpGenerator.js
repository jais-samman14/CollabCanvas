const crypto = require('crypto');

/**
 * Generates a cryptographically secure 6-digit numeric OTP string.
 * @returns {string} Zero-padded 6-digit OTP between 100000 and 999999.
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = generateOTP;
