const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
    {
        boardId:{
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Board',
            required : true,
            index: true
        },
        sender : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'User',
            required : true
        },
        senderName : {
            type : String,
            required : true
        },
        senderColor : {
            type : String,
            default : '#6366f1',
        },
        message : {
            type : String,
            required : true,
            trim : true,
            maxlength : 1000,
        },
    },
    {
        timestamps : true,
    }
);

chatSchema.index({ boardId: 1, createdAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);        
module.exports = Chat;