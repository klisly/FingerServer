var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    userId: String,
    siteId: String,
    siteName: String,
    isBlock: {type: Boolean, default: false},
    seq: { type: Number, default: 0 },
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
});
mongoose.model('User2Site', objectSchema);