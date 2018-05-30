var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    title: String,
    href:{type: String},
    img:String,
    desc:String,
    account:{type: String},
    ahref:String,
    update:{type: Number},
    tag:String,
    heartCount:{ type:Number,default:0},
    readCount:{ type:Number,default:0},
    collectCount:{ type:Number,default:0},
    shareCount:{ type:Number,default:0},
    commentCount:{ type:Number,default:0},

});
mongoose.model('WxArticle', objectSchema);