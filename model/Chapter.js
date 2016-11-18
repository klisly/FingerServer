var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var entitySchema = new Schema({ //
    title:  { type: String, index: true},
    author:  { type: String, index:true},
    followerCount: { type: Number, default: 0 },
    articleCount: { type: Number, default: 0 }, //
    isBlock: {type: Boolean, default: false},
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
});
mongoose.model('Chapter', entitySchema);