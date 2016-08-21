var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    userId: { type: String, index: true},
    userAvatar:{type: String},
    articleId: { type: String, index: true},
    articleName: String,
    isBlock: {type: Boolean, default: false},
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
});
mongoose.model('User2ArticleCollect', objectSchema);