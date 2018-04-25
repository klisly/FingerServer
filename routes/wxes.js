var express = require('express');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var Topic = mongoose.model('Topic');
var Site = mongoose.model('Site');
var User = mongoose.model('User');
var User2Article = mongoose.model('User2Article')
var validator = require('validator');
var eventproxy = require('eventproxy');
var pro_error = "prop_error";
var unfind = "unfind";
var router = express.Router();
var bodyParser = require('body-parser'); // parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var common = new require("../utils/commonutils");
router.use(bodyParser.urlencoded({extended: true}))
router.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
    }
}))

router.get('/', function (req, res, next) {
    let url = req.originalUrl.replace("/wx?ahre=", "");
    res.render('outer', {url:url});
});

module.exports = router;
