var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var validator = require('validator');
var eventproxy = require('eventproxy');
var Article = mongoose.model('Article');
var common = new require("../utils/commonutils");

var DEFAULT_PAGE_SIZE = 20;
var DEFAULT_PAGE = 1;
/* GET home page. */
var pageNum;
router.get('/', function (req, res, next) {
    var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
    var topic = req.query.topic || '热门';
    var page = req.query.page || 1;
    var data = {};
    if (req.query.siteId) {
        data.siteId = validator.trim(req.query.siteId);
    }
    if (req.query.topic && topic != "热门" && topic != "推荐") {
        data.topics = validator.trim(topic);
    }
    Article.count({}, function (err, data) {
        console.log("num:" + data);
        pageNum = data
    })
    var count = (pageNum == undefined ? 100 : pageNum) / pageSize;
    if (topic == "推荐") {
        page = common.getRandomNum(1, count > 2000 ? 2000 : count); // 最大2000页
    }
    var query = Article.find(data);
    query.skip((page - 1) * pageSize);
    query.limit(pageSize * 1);
    if (topic == "热门") {
        query.sort({'heartCount': -1})
    } else if (topic == "推荐") {
        query.sort({'collectCount': -1})
    } else {
        query.sort({'updateAt': -1})
    }
    var sels = 'title publishAt author authorId site siteId srcUrl ' +
        'topics age heartCount readCount collectCount shareCount commentCount createAt updateAt checked reason isBlock';
    if (data.topics == "段子") {
        sels = sels + " content "
    }
    if( topic == "推荐"){
        page = 1;
    }
    data.page = page;
    data.totalPage = count;
    data.siteId = req.query.siteId
    data.topic = topic
    query.select(sels)
    query.exec(function (err, entity) {
        if (err) {
            next(err)
        } else {
            res.render('index', {location:"topic", opts:data, articles:entity});
        }
    });
});

module.exports = router;
