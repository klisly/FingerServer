var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var validator = require('validator');
var eventproxy = require('eventproxy');
var Article = mongoose.model('Article');
var Magzine = mongoose.model('Magzine');
var common = new require("../utils/commonutils");
var moment = require("moment");
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
    if (topic == "推荐") {
        page = 1;
    }
    data.page = page;
    data.totalPage = count;
    data.siteId = req.query.siteId
    data.topic = topic
    var location = "topic";
    if (data.siteId) {
        location = "site";
    }
    query.select(sels)
    query.exec(function (err, entity) {
        if (err) {
            next(err)
        } else {
            res.render('index', {location: location, opts: data, articles: entity});
        }
    });
});


router.get('/login', function (req, res, next) {
    res.render('login', {});
});

var RECOM_SIZE = 100;
var MAG_SIZE = 10;

router.get('/maggen', function (req, res, next) {
    var now = new Date();
    var d = moment().utc().utcOffset(+8).format("YYYY-MM-DD");
    console.log("time:" + d);
    var data = {};
    data.topics = {"$ne": "段子"}
    data.updateAt = {"$gt": (now.getTime() - 43200000)}
    var query = Article.find(data);
    query.sort({'heartCount': -1})
    var sels = 'title publishAt author authorId site siteId srcUrl ' +
        'topics age heartCount readCount collectCount shareCount commentCount createAt updateAt checked reason isBlock';
    query.select(sels);
    query.limit(RECOM_SIZE);
    console.log("start query");
    query.exec(function (err, entity) {
        if (err) {
            console.log("query result: err:" + JSON.stringify(err));
        } else {
            if (entity.length < MAG_SIZE) {
                return;
            }
            var hour = now.getHours();
            console.log("query mag size:" + entity.length + "now:" + now + " hour:" + hour);
            var data = {}
            var articles = [];
            var start = common.getRandomNum(0, entity.length);
            for (var index = 0; index < MAG_SIZE; index++) {
                if (entity[(start + index) % entity.length]) {
                    articles.push(entity[(start + index) % entity.length])
                }
            }
            data.no = d + ((hour + 8) / 24 < 12 ? '早一刻' : '晚一刻'); // +GM000时间标准
            data.articles = articles;
            data.createAt = new Date().getTime();
            data.updateAt = new Date().getTime();
            console.log("data:" + JSON.stringify(data))
            Magzine.create(data, function (err, entity) {
                if (err) {
                    if (err.code == 11000) {
                        console.log('已经存在');
                        return;
                    }
                } else {
                    console.log('生成成功');
                }
            })
        }
    });
    res.format({
        json: function () {
            res.json({
                status: 200,
            });
        }
    });

});


module.exports = router;
