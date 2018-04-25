var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    userId: { type: String, index: true},
    userAvatar: String,
    wxOrgId: String,
    wxOrgName: String,
    createAt: { type: Number, default: new Date().getTime() },
    updateAt: { type: Number, default: new Date().getTime() },
});
mongoose.model('User2WxOrg', objectSchema);