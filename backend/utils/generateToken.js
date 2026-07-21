const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id , tokenVersion : user.tokenVersion || 0, }, //payload
        process.env.JWT_SECRET, //secretkey
        { expiresIn: '15d'} 
    );
}
module.exports = generateToken;