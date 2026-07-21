const limiter = require('../rateLimiter/SlidingWindowLimiter')

const createRateLimiter = ({maxRequests, windowSize, keyPrefix}) => {
    return async(req,res,next)=>{
        try{
            const identifier = req.user?._id || req.ip;
            const key = `${keyPrefix} : ${identifier}`;
            const result = await limiter.allow(key, maxRequests, windowSize);
            if(!result.allowed){
                return res.status(429).json({
                    success : false,
                    message : "Too Many request buddy try after some time"
                })
            }
            res.set("X-RateLimit-Remaining", result.remaining);
            next();
        }
        catch(err){
            console.log(err);
            next();
        }
    };
};

module.exports = createRateLimiter;