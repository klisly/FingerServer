var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var entitySchema = new Schema({ //
    title:  { type: String, index: true},
    desc:{type:String},
    author:  { type: String, index:true},
    href:{type:String},
    type:{type:String},
    image: { type: String, default:"/images/channelbrand.jpg"},
    latest:{type:String},
    lastCheck:{type:Number, default: 0 }, // 上次阅读
    followerCount: { type: Number, default: 0 },
    articleCount: { type: Number, default: 0 },

    updateAt: { type: String, },

});
mongoose.model('Novel', entitySchema);