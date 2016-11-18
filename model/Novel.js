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
    lastUpdate:{type:Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    articleCount: { type: Number, default: 0 },

    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },

});
mongoose.model('Novel', entitySchema);