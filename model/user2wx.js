var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    userId: { type: String, index: true},
    articleId: { type: String, index: true},
    articleName: String,
    href:String,
    account:String,
    update:String,
    img:String,
    tag:String,
    share: {type: Boolean, default: false},
    collect: {type: Boolean, default: false},
    heart: {type: Boolean, default: false},
    read: {type: Boolean, default: false},
    toread: {type: Boolean, default: false},
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
});
mongoose.model('User2Wx', objectSchema);