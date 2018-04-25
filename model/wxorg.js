var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    name: {type: String, unique: true, index: true},
    wx_alias: {type: String},
    wx_origin_id: {type: String},
    avatar: {type: String},
    qrcode: {type: String},
    desc: {type: String},
    fans_num_estimate: Number,
    index_scores: Number,
    cate: {type: String},
    src:{type:String} // 公众号来源 用户添加、或者微小宝获取
});
mongoose.model('org', objectSchema);