var express = require('express');
var mongoose = require('mongoose');
var validator = require('validator');
var eventproxy = require('eventproxy');
var pro_error = "prop_error";
var unfind = "unfind";
var bodyParser = require('body-parser'); // parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var Novel = mongoose.model('Novel');
var User2Novel = mongoose.model('User2Novel');
var Chapter = mongoose.model('Chapter');
var request = require("request");

var DEFAULT_PAGE_SIZE = 20; // 默认每页数量
var DEFAULT_PAGE = 1; // 默认页号
var router = express.Router();
var validateToken = require("../../utils/authutil").validateToken;
var requireAuth = require("../../utils/authutil").requireAuth;
var validateRole = require("../../utils/authutil").validateRole;
let cheerio = require('cheerio')

router.use(bodyParser.urlencoded({extended: true}))
router.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
    }
}))

function search(name, callback) {

    var options = {
        method: 'GET',
        url: 'http://zhannei.baidu.com/cse/search',
        qs: {
            click: '1',
            entry: '1',
            s: '14041278195252845489',
            nsid: '',
            srt: 'dateModified',
            q: encodeURIComponent(name)
        },
        headers: {
            'postman-token': '139bd025-2543-1f5d-bd86-08dd9d67f735',
            'cache-control': 'no-cache',
            "gzip": "true"
        }
    };
    var count = 0;

    function requestData() {
        count++;
        console.log("requestData " + count)
        request(options, function (error, response, body) {
            if (error) {
                if (count > 4) {
                    callback(error, null);
                }
            } else {
                clearInterval(interval);
                callback(null, body);
            }
        });
    }

    var period = 6000; // 10 second
    requestData();
    var interval = setInterval(function () {
        console.log("execut get date interval")
        requestData()
    }, period);
}

/**
 * 查找所想订阅的书籍
 */
router.get('/search',
    function (req, res, next) {
        if (req.query.name) {
            console.log("start search " + req.query.name);
            search(req.query.name, function (err, body) {
                if (err) {
                    res.json({
                        code: 404,
                        msg: "没有找到相关的小说"
                    })
                } else {
                    let $ = cheerio.load(body);
                    var datas = []
                    $('#results > div.result-list > div.result-item').each(function (idx, element) {
                        // div.result-game-item-detail > h3 > a
                        var data = {}
                        data.image = $(this).find('.result-game-item-pic').find('a').attr('href');
                        data.title = $(this).find('.result-game-item-detail').find('h3').find('a').text().trim();
                        data.href = $(this).find('.result-game-item-detail').find('h3').find('a').attr('href');
                        data.desc = $(this).find('.result-game-item-detail').find('.result-game-item-desc').text().trim();
                        var count = 0;
                        $(this).find('.result-game-item-detail')
                            .find('.result-game-item-info')
                            .find('.result-game-item-info-tag')
                            .find("span")
                            .each(function (iidx, eelement) {
                                let text = $(this).text().trim();
                                if (count == 1) {
                                    data.author = text;
                                } else if (count == 3) {
                                    data.type = text;
                                } else if (count == 5) {
                                    data.updateAt = text;
                                } else if (count == 7) {
                                    data.latest = text;
                                }
                                console.log(text + ":" + count++);
                            })
                        $(this).find('.result-game-item-detail')
                            .find('.result-game-item-info')
                            .find('.result-game-item-info-tag')
                            .find("a")
                            .each(function (iidx, eelement) {
                                let text = $(this).text().trim();
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
        let newCreate = false;
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
                data.userId = req.user._id;
                data.novelId = novel._id;
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
                                User2Novel.create(data, function (err, entity) {
                                    if (err) {
                                        res.status(500).json(
                                            {
                                                status: 500,
                                                msg: err.message
                                            }
                                        );
                                    } else {
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
 * undelete entity
 */
router.post('/:id/unsubscribe',
    validateToken, function (req, res) {
        var topic = req.topic;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.novelId = req.params.id;
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
            if (entity.n > 0) {
                res.json({
                    status: 200,
                })
            } else {
                res.json({
                    status: 404,
                    msg: "没有查到符合要求的数据"
                })
            }
        })
    });

/**
 * 支持分页查询
 */
router.get('/:id/chapters', function (req, res) {
    var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
    var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
    var conditions = {topics: [req.topic.name]};
    var query = Article.find(conditions);
    query.where("updateAt").lt(new Date().getTime());
    query.select('title publishAt author authorId site siteId srcUrl ' +
        'topics age likeNum commentNum readNum createAt updateAt checked reason isBlock')
    query.skip((page - 1) * pageSize);
    query.limit(pageSize * 1);                                                
    query.sort('-updateAt desc');
    query.exec(function (err, entity) {
        if (err) {
            return next();
        } else {
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

module.exports = router;
