module.exports = {

    CHAT_SEND : {
        maxRequests : 30,
        windowSize : 60, //.   30 msg per minutes
    },

    STROKE_ADD : {
        maxRequests : 100,
        windowSize : 60,       //100 strokes per min
    },

    STROKE_UPDATE : {
        maxRequests : 200,
        windowSize : 60,           //200 update per minutes
    },

    STROKE_DELETE : {
        maxRequests : 100,
        windowSize : 60,         
    },

    BOARD_CLEAR : {
        maxRequests : 10,
        windowSize : 300,           // 10 clears per 5 min
    },

    SESSION_END : {
        maxRequests : 5,
        windowSize : 3600,           // 5 end-session per hour
    },

    TYPING : {
        maxRequests : 60,
        windowSize : 60,           
    },

    MAX_VIOLATIONS : 3,

};