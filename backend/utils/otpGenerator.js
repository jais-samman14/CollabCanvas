const crypto = require('crypto');

const generateOTP = () => {
    const otp = crypto.randomInt(100000, 1000000);
    return otp.toString();
};
module.exports = generateOTP;