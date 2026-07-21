const mongoose = require('mongoose');


const strokeSchema = new mongoose.Schema(
    {
        type : {
            type : String,
            required : true,
            enum : ['pen', 'rectangle', 'circle', 'line', 'arrow', 'text', 'eraser','triangle', 'star', 'stickyNote',],
        },
        color : {
            type : String,
            default : '#000000',
        },
        size : {
            type : Number,
            default : 3,
        },
        filled:{
            type : Boolean,
            default : false,
        },
        fontSize : {
            type : Number,
            default : 24,
        },
        fontFamily : {
            type : String,
            default : 'Inter',
        },
        points : [
            {
                x : {
                    type : Number,
                    required : true,
                },
                y : {
                    type : Number,
                    required : true,
                }   
            },
        ],
        text : {
            type : String,
            default : '',
        },
        createdBy : {
            type : String,
            default : 'anonymous',
        },
    },
    {_id : true, timestamps : false,});

const boardSchema = new mongoose.Schema(
    {
        name : {
            type : String,
            required : [true, "Please add a name"],
            trim : true,
            default : "Untitled Board",
        },
        owner :{
            type : mongoose.Schema.Types.ObjectId,
            ref : 'User',
            required : true,
        },
        strokes : [strokeSchema],
        canvasWidth : {
            type : Number,
            default : 1920,
        },
        canvasHeight : {
            type : Number,
            default : 1080,
        },
        backgroundColor : {
            type : String,
            default : '#ffffff',
        },
        isPublic : {
            type : Boolean,
            default : false,
        },
        collaborators : [
            {
                type : mongoose.Schema.Types.ObjectId,
                ref : 'User',
            }
        ],
    },
    {timestamps : true}
);

boardSchema.index({ owner : 1, updatedAt : -1 });

const Board = mongoose.model('Board', boardSchema);
module.exports = Board;
        