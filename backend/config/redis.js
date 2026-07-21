const {createClient} = require('redis');

const redisClient = createClient({
    socket : {
        host : process.env.REDIS_HOST || "localhost",
        port : process.env.REDIS_PORT || 6379
    }
});

redisClient.on("connect", ()=>{
    console.log("Redis Connected");
});

redisClient.on("error", ()=>{
    console.error("Redis Error : ", err.message);
});

const connectRedis = async()=>{
    try{
        await redisClient.connect();
    }
    catch(err){
        console.error("Failed to connect Redis : ", err);
    }
};

module.exports = {
    connectRedis,
    redisClient
}