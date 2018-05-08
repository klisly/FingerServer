var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 *{
	"_id": ObjectId("5af1072320c1694207331530"),
	"id": "xh-142222",
	"title": "买东西要打折的感觉",
	"content": "家里开服装店的，快中午有个妹子看中了一条标价100元的红色小外套，因为是断码亏本处理所以不议价。妹子在讨价还价未果后说:‘’衣服我喜欢。我再给你一次机会，标价换成200元，再给我打5折，我喜欢打折的感觉，不然我不买了！‘’我看妹子这么识大体，果断把价码换成了500元，然后给她打了2折！",
	"type": "txt",
	"good": 300,
	"bad": 21,
	"src": "xhkong.com",
	"pub_time": "1525745448"
}
 * @type {mongoose.Schema}
 */
var objectSchema = new Schema({
    id: {type: String, unique: true},
    title: String,
    content: {type: String},
    type: String,
    good: Number,
    bad: Number,
    pub_time: Number,
    update: {type: Number, index: true},
    src: String
});
mongoose.model('jcontent', objectSchema);