var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectSchema = new Schema({
    id: {type: Number},
    name: {type: String, unique: true, index: true},
    src: {type: String}
});
mongoose.model('cate', objectSchema);