var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    title: String,
    content:String,
    publishAt: { type: Number, default: new Date().getTime() },
    author:String,
    authorId:String,
    site:String,
    siteId:String,
    srcUrl:{ type: String, unique: true, index: true},
    topics:Array,
    age:String,
    likeNum:{ type:Number,default:0, index: true},
    commentNum:{ type:Number,default:0, index: true},
    readNum:{ type:Number,default:0, index: true},
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
    checked:{type:Boolean, default: false},
    reason:{type:String, default:"请稍候小小君审核!"},
    isBlock: {type: Boolean, default: false},
});
mongoose.model('Article', objectSchema);