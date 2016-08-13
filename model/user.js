var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var getRandomAvatar = require("../utils/avatarutil").getRandomAvatar;
var objectSchema = new Schema({
    name: { type: String, unique: true, index: true},
    loginname:{ type: String, unique: true, index: true},
    passwd:String,
    salt:String,
    avatar:{ type: String, default:getRandomAvatar()},
    brief:String,
    role:{type:Number,default:0}, // 用户角色, 0:用户, 1:作者, 2:超级管理员 3:普通管理员
    isBlock: {type: Boolean, default: false},
    isBasicSet: {type: Boolean, default: false},
    likeCount:{ type:Number,default:0},
    replyCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingSite: { type: Number, default: 0 },
    followingTopic: { type: Number, default: 0 },
    followingPeople: { type: Number, default: 0 },
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
    platform:{type: String, default: "LOCAL"}
});
mongoose.model('User', objectSchema);