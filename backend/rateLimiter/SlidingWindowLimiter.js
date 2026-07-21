//redis backed sliding window limiter....Redis sorted set(ZSET)
//key -> user_id or ip_address
//score -> timestamps
//value -> timestamp : crypto library (random number)

const crypto = require('crypto');//builtin nodejs module
const { redisClient } = require('../config/redis');

class SlidingWindowLimiter {
    async allow(key, maxRequests, windowSize){
        const curr_time = Math.floor(Date.now()/1000);
        const window_time = curr_time - windowSize;//mtlb isse pehle waale ko htana h
        await redisClient.zRemRangeByScore(key, 0, window_time); //hta do jo range se bahar h
        const remaining_request = await redisClient.zCard(key);//request in current window
        if(remaining_request >= maxRequests){
            return {
                allowed : false,
                remaining : 0
            }
        }
        await redisClient.zAdd(key, [{score : curr_time, value : `${curr_time} : ${crypto.randomUUID()}`}]);
        await redisClient.expire(key, windowSize);
        return{
            allowed : true,
            remaining : maxRequests - (remaining_request + 1)
        }
    }
};

module.exports = new SlidingWindowLimiter();

