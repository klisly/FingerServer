var express = require('express');
var mongoose = require('mongoose');
var validator = require('validator');
var eventproxy = require('eventproxy');
var pro_error = "prop_error";
var unfind = "unfind";
var bodyParser = require('body-parser'); // parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var Novel = mongoose.model('Novel');
var User = mongoose.model('User');
var User2Novel = mongoose.model('User2Novel');
var Chapter = mongoose.model('Chapter');
var httputil = require("../../utils/crawlutil")
var DEFAULT_PAGE_SIZE = 10; // 默认每页数量
var DEFAULT_PAGE = 1; // 默认页号
var router = express.Router();
var validateToken = require("../../utils/authutil").validateToken;
var cheerio = require('cheerio')
var config = require("../../config")
router.use(bodyParser.urlencoded({extended: true}))
router.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
    }
}))

/**
 * 查找所想订阅的书籍
 */
router.get('/search',
    function (req, res, next) {
        if (req.query.name) {
            console.log("start search " + req.query.name);
            httputil.search(req.query.name, function (err, body) {
                if (err) {
                    res.json({
                        code: 404,
                        msg: "没有找到相关的小说"
                    })
                } else {
                    var $ = cheerio.load(body);
                    var datas = []
                    $('#results > div.result-list > div.result-item').each(function (idx, element) {
                        // div.result-game-item-detail > h3 > a
                        var data = {}
                        data.image = $(this).find('.result-game-item-pic').find('a').find('img').attr('src');
                        data.title = $(this).find('.result-game-item-detail').find('h3').find('a').text().trim();
                        data.href = $(this).find('.result-game-item-detail').find('h3').find('a').attr('href');
                        data.desc = $(this).find('.result-game-item-detail').find('.result-game-item-desc').text().trim();
                        var count = 0;
                        $(this).find('.result-game-item-detail')
                            .find('.result-game-item-info')
                            .find('.result-game-item-info-tag')
                            .find("span")
                            .each(function (iidx, eelement) {
                                var text = $(this).text().trim();
                                console.log("count:" + count + " text:" + text)
                                if (count == 1) {
                                    data.author = text;
                                } else if (count == 3) {
                                    data.type = text;
                                } else if (count == 5) {
                                    data.updateAt = text;
                                } else if (count == 7) {
                                    data.latest = text;
                                }
                                count++;
                            })
                        $(this).find('.result-game-item-detail')
                            .find('.result-game-item-info')
                            .find('.result-game-item-info-tag')
                            .find("a")
                            .each(function (iidx, eelement) {
                                var text = $(this).text().trim();
                                data.latest = text;
                            })
                        datas.push(data)
                    });
                    res.send({
                        code: 200,
                        data: datas
                    });
                }
            })
        } else {
            res.json({
                code: 404,
                msg: "没有找到相关的小说"
            })
        }
    });

/**
 * subscribe entity
 */
router.post('/subscribe',
    validateToken, function (req, res, next) {

        var ep = new eventproxy();
        ep.fail(next);
        ep.on(pro_error, function (msg) {
            res.status(400).json({
                status: 40001,
                msg: msg,
            })
        });
        console.log("subscribe "+JSON.stringify(req.body));
        var data = {};
        if (req.body.title) {
            data.title = validator.trim(req.body.title);
        }

        if (req.body.desc) {
            data.desc = validator.trim(req.body.desc);
        }

        if (req.body.author) {
            data.author = validator.trim(req.body.author);
        }

        if (req.body.href) {
            data.href = validator.trim(req.body.href);
        }

        if (req.body.type) {
            data.type = validator.trim(req.body.type);
        }

        if (req.body.image) {
            data.image = validator.trim(req.body.image);
        }

        if (req.body.latest) {
            data.latest = validator.trim(req.body.latest);
        }

        if (req.body.updateAt) {
            data.updateAt = validator.trim(req.body.updateAt);
        }
        var newCreate = false;
        Novel
            .find({'title': data.title, "author": data.author})
            .exec()
            .then((datas)=> {
                return new Promise((resolve, reject)=> {
                    if (datas.length > 0) {
                        resolve(datas[0]);
                    } else {
                        Novel.create(data, function (err, entity) {
                            if (err) {
                                reject(err)
                            } else {
                                newCreate = true;
                                resolve(entity);
                            }
                        })
                    }
                })
            })
            .then((novel)=> {
                var data = {};
                data.uid = req.user._id;
                data.nid = novel._id;
                User2Novel
                    .find(data)
                    .exec()
                    .then((datas)=> {
                        return new Promise((resolve, reject)=> {
                            if (datas.length > 0) {
                                res.status(200).json(
                                    {
                                        status: 403,
                                        msg: "已经订阅"
                                    }
                                );
                            } else {
                                data.title = novel.title;
                                data.desc = novel.desc;
                                data.author = novel.author;
                                data.href = novel.href;
                                data.type = novel.type;
                                data.image = novel.image;
                                data.latest = novel.latest;
                                data.lastUpdate = novel.no;
                                data.lastRead = novel.no;
                                User2Novel.create(data, function (err, entity) {
                                    if (err) {
                                        res.status(500).json(
                                            {
                                                status: 500,
                                                msg: err.message
                                            }
                                        );
                                    } else {
                                        Novel.update({"_id": novel._id}, {$inc: {"followerCount": 1}}).exec()
                                        User.update({"_id": req.user._id}, {$addToSet: {"novels": novel._id.toString()}}).exec()
                                        res.json({
                                            status: 200,
                                            data: entity
                                        });
                                    }
                                })
                            }
                        })
                    })
            })
            .catch((err)=>next(err));
    });


/**
 * subscribe entity
 */
router.post('/:id/subscribe',
    validateToken, function (req, res, next) {
        console.log("subscribe by id");
        var ep = new eventproxy();
        ep.fail(next);
        ep.on(pro_error, function (msg) {
            res.status(400).json({
                status: 40001,
                msg: msg,
            })
        });


        Novel
            .find({'_id': req.params.id})
            .exec()
            .then((datas)=> {
                return new Promise((resolve, reject)=> {
                    if (datas.length > 0) {
                        resolve(datas[0]);
                    } else {
                        res.status(404).json(
                            {
                                status: 404,
                                msg: "小说不存在"
                            }
                        );
                    }
                })
            })
            .then((novel)=> {
                var data = {};
                data.uid = req.user._id;
                data.nid = novel._id;
                User2Novel
                    .find(data)
                    .exec()
                    .then((datas)=> {
                        return new Promise((resolve, reject)=> {
                            if (datas.length > 0) {
                                res.status(200).json(
                                    {
                                        status: 403,
                                        msg: "已经订阅"
                                    }
                                );
                            } else {
                                data.title = novel.title;
                                data.desc = novel.desc;
                                data.author = novel.author;
                                data.href = novel.href;
                                data.type = novel.type;
                                data.image = novel.image;
                                data.latest = novel.latest;
                                data.lastUpdate = novel.no;
                                data.lastRead = novel.no;
                                User2Novel.create(data, function (err, entity) {
                                    if (err) {
                                        res.status(500).json(
                                            {
                                                status: 500,
                                                msg: err.message
                                            }
                                        );
                                    } else {
                                        Novel.update({"_id": novel._id}, {$inc: {"followerCount": 1}}).exec()
                                        User.update({"_id": req.user._id}, {$addToSet: {"novels": novel._id.toString()}}).exec(err, function (res) {
                                            console.log("res:" + res + " err:" + err)
                                        })
                                        res.json({
                                            status: 200,
                                            data: entity
                                        });
                                    }
                                })
                            }
                        })
                    })
            })
            .catch((err)=>next(err));
    });


router.get('/novels/:id', function (req, res, next) {
    console.log("id:" + req.params.id);
    Novel.findById(req.params.id, function (err, entity) {
        if (err) {
            next(err);
        } else {
            if (entity) {
                res.json({
                    status: 200,
                    data: entity,
                })
            } else {
                res.status(404).json(
                    {
                        status: 404,
                        message: "没有找到相关小说"
                    }
                );
            }
        }
    });
});

router.get('/chapters/:id', function (req, res, next) {
    console.log("id:" + req.params.id);
    Chapter.findById(req.params.id, function (err, entity) {
        if (err) {
            next(err);
        } else {
            if (entity) {
                res.json({
                    status: 200,
                    data: entity,
                })
            } else {
                res.status(404).json(
                    {
                        status: 404,
                        message: "没有找到相关章节"
                    }
                );
            }
        }
    });
});


/**
 * undelete entity
 */
router.post('/:id/unsubscribe',
    validateToken, function (req, res) {
        var user = req.user;
        var conditions = {};
        conditions.nid = req.params.id;
        conditions.uid = user._id;
        User2Novel.remove(conditions, function (err, entity) {
            if (err) {
                res.status(200).json(
                    {
                        status: 404,
                        msg: err.message
                    }
                );
                return;
            }
            entity = JSON.parse(entity);
            if (parseInt(entity["n"]) > 0) {
                Novel.update({"_id": req.params.id}, {$inc: {"followerCount": -1}}).exec()
                User.update({"_id": req.user._id}, {$pop: {"novels": req.params.id}}).exec()
                res.json({
                    status: 200,
                })
            } else {
                res.json({
                    status: 200,
                })
            }
        })
    });


/**
 * undelete entity
 */
router.get('/recommend', function (req, res) {
    Novel
        .find({})
        .limit(20)
        .sort({'updateAt': -1})
        .exec()
        .then((datas)=> {
            res.json({
                code:200,
                data:datas,
            })
        })
});

var max_page = 3;
/**
 * 支持分页查询
 */
router.get('/:id/chapters', function (req, res) {
    var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
    var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
    var conditions = {"nid": req.params.id};
    console.log("get novel chapters:"+conditions.nid+" "+page+" "+pageSize);

    if(page > config.max_page){
        res.json({
            status:200,
            data:[]
        })
        return;
    }
    var query = Chapter.find(conditions);
    query.select('no title href nid nname author updateAt createAt')
    query.skip((page - 1) * pageSize);
    query.limit(pageSize * 1);
    query.sort('-no desc');
    query.exec(function (err, entity) {
        if (err) {
            return next(err);
        } else {
            console.log("res:"+JSON.stringify(entity))
            res.format({
                json: function () {
                    res.json({
                        status: 200,
                        data: entity
                    });
                }
            });
        }
    });
});

/**
 * 支持分页查询
 */
router.post('/crawl', function (req, res) {
    var date = new Date();
    var time = date.getTime() - 1200000; // 20分钟抓取一次数据
    console.log("start crawl chapters time:" + time)
    Novel
        .find({'lastCheck': {$lt: time}})
        .exec()
        .then((datas)=> {
            console.log("need crawl novel size:" + datas.length)
            for (var index = 0; index < datas.length; index++) {
                console.log("index:" + index);
                crawl(datas[index]);
            }
        })
    res.send();
});

function crawl(novel) {
    httputil.crawUpdates(novel);
}

module.exports = router;
