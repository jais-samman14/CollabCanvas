const jwt = require('jsonwebtoken');
const User = require('../models/User');

//protect middleware
//verify jwttoken, if valid, attach user to req.user and call next(), else return 401 unauthorized

const protect = async (req, res, next) => {
    let token;
    try{
        if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){//only token part
            token = req.headers.authorization.split(" ")[1];
        }
        if(!token){
            return res.status(401).json({message: "Not authorized, no token"});
        }
        //verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        //get user from token
        const user = await User.findById(decoded.id).select("-password");
        if(!user){
            return res.status(401).json({message: "Not authorized, user not found"});
        }
        if(decoded.tokenVersion !== user.tokenVersion){
            return res.status(401).json({
                success : false,
                message : "Session expired. Please login again."
            });
        }
        req.user = user;
        next();
    }
    catch(error){
        return res.status(401).json({message: "Not authorized, token failed"});
    }
};

module.exports = protect;