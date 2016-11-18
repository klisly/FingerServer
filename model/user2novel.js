var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    userId: { type: String, index: true},
    novelId: { type: String, index: true},
    lastRead: { type: String},
    lastUpdate: { type: Number, default:0},
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
});
mongoose.model('User2Novel', objectSchema);