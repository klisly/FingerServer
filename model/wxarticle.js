var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    title: String,
    href:{type: String, unique: true, index: true},
    img:String,
    desc:String,
    account:{type: String, unique: true, index: true},
    ahref:String,
    update:{type: Number, unique: true, index: true},
    tag:String,
    heartCount:{ type:Number,default:0, index: true},
    readCount:{ type:Number,default:0, index: true},
    collectCount:{ type:Number,default:0, index: true},
    shareCount:{ type:Number,default:0, index: true},
    commentCount:{ type:Number,default:0, index: true},

});
mongoose.model('WxArticle', objectSchema);