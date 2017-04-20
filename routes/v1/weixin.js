var express = require('express');
var mongoose = require('mongoose');
var Article = mongoose.model('WxArticle');
var User = mongoose.model('User');
var randomInt = require('random-integral');
var User2Article = mongoose.model('User2Wx')
var validateToken = require("../../utils/authutil").validateToken;
var requireAuth = require("../../utils/authutil").requireAuth;
var validator = require('validator');
var eventproxy = require('eventproxy');
var pro_error = "prop_error";
var unfind = "unfind";
var router = express.Router();
var bodyParser = require('body-parser'); // parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var common = new require("../../utils/commonutils");
var DEFAULT_PAGE_SIZE = 15; // 默认每页数量
var DEFAULT_PAGE = 1; // 默认页号
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
 * 支持分页查询
 *
 */
router.get('/', function (req, res) {
    var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
    var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
    var beforeAt = req.query.beforeAt;
    var afterAt = req.query.afterAt;
    var tags = req.query.topics.split(",");
    console.log("pageSize:" + pageSize + " page:" + page
        + " beforeAt:" + beforeAt + " afterAt:" + afterAt + " tag:" + tags);

    var data = {};
    data.tag = {"$in": tags};
    var query = Article.find(data);
    if (beforeAt > 0 && afterAt > 0 && beforeAt > afterAt) {
        query.where("update").gt(afterAt).lt(beforeAt);
    } else if (beforeAt > 0) {
        query.where("update").lt(beforeAt);
    } else if (afterAt > 0) {
        query.where("update").gt(afterAt);
    } else {
        query.where("update").lt(new Date().getTime());
    }

    query.skip((page - 1) * pageSize);
    query.sort({"update": -1})
    query.limit(pageSize * 1);
    query.exec(function (err, entity) {
        if (err) {
            console.log("query result: err:" + JSON.stringify(err));
            res.format({
                json: function () {
                    res.json({
                        code: 500,
                        msg: err.message
                    });
                }
            });
        } else {
            console.log("query result: size:" + entity.length)
            res.format({
                json: function () {
                    res.status(200).json({
                        "status": 200,
                        "data": entity
                    });
                }
            });
        }
    });
});

/**
 * 新增文章
 */
router.post('/', function (req, res, next) {
    var ep = new eventproxy();
    ep.fail(next);
    ep.on(pro_error, function (msg) {
        res.status(400).json({
            status: 40003,
            msg: msg,
        })
    });
    console.log(JSON.stringify(req.body));
    var data = req.body;
    Article.create(data, function (err, entity) {
    })
    res.json();
});


/**
 * 支持分页查询
 *
 */
router.get('/collected',
    function (req, res, next) {
        console.log("find collected")
        var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
        var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
        var beforeAt = req.query.beforeAt;
        var afterAt = req.query.afterAt;
        console.log("pageSize:" + pageSize + " page:" + page
            + " beforeAt:" + beforeAt + " afterAt:" + afterAt + " uid:" + req.query.uid);
        let uid = req.query.uid;
        var data = {collect: true, userId: uid};
        var query = User2Article.find(data);
        if (beforeAt > 0 && afterAt > 0 && beforeAt > afterAt) {
            query.where("createAt").gt(afterAt).lt(beforeAt);
        } else if (beforeAt > 0) {
            query.where("createAt").lt(beforeAt);
        } else if (afterAt > 0) {
            query.where("createAt").gt(afterAt);
        } else {
            query.where("createAt").lt(new Date().getTime());
        }

        query.skip((page - 1) * pageSize);
        query.sort({"createAt": -1})
        query.limit(pageSize * 1);
        query.exec(function (err, entity) {
            console.log("query result");
            if (err) {
                console.log("query result: err:" + JSON.stringify(err));
                res.format({
                    json: function () {
                        res.json({
                            code: 500,
                            msg: err.message
                        });
                    }
                });
            } else {
                console.log("query result: size:" + entity.length)
                res.format({
                    json: function () {
                        res.status(200).json({
                            "status": 200,
                            "data": entity
                        });
                    }
                });
            }
        });

    });

router.get('/collectstatus/:aid/:uid',
    function (req, res, next) {
        console.log("collectstatus")
        let conditions = {}
        conditions.userId = req.params.uid;
        conditions.articleId = req.params.aid;
        console.log()
        User2Article.findOne(conditions, function (err, entity) {
            if (err) {
                res.status(500).json(
                    {
                        status: 500,
                        message: err.message
                    }
                );
                return;
            }
            if (entity) {
                console.log(JSON.stringify(entity))
                res.json({
                    status: 200,
                    data: entity
                })
            } else {
                res.json({
                    status: 404,
                    message: "没有找到"
                })
            }
        });
    });

router.param('id', function (req, res, next, id) {
    console.log("id:" + req.params.id)
    Article.findById(id, function (err, entity) {
        if (err || !entity) {
            res.status(404)
            var err = new Error('没有找到文章', id);
            err.status = 404;
            res.format({
                json: function () {
                    res.json(
                        {
                            status: err.status,
                            message: err
                        }
                    );
                }
            });
            //if it is found we continue on
        } else {
            //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
            //console.log(blob);
            // once validation is done save the new item in the req
            req.id = id;
            req.article = entity;
            // go to the next thing
            next();
        }
    });
});


/**
 * subscribe entity
 */
router.get('/:id', function (req, res) {
    var entity = req.article;
    res.json({
        status: 200,
        data: entity
    })
});

/**
 * subscribe entity
 */
router.post('/:id/heart',
    validateToken,
    requireAuth, function (req, res) {
        var article = req.article;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.articleId = article._id;
        User2Article.findOne(conditions, function (err, entity) {
            if (err) {
                return next();
            }
            var data = {};
            if (entity) {
                if (entity.isBlock || entity.heart == false) {
                    data.isBlock = false;
                    data.heart = true;
                    entity.isBlock = false;
                    entity.heart = true;
                    entity.updateAt = new Date().getTime();
                    entity.update(data, function (err, resData) {
                        if (err) {
                            res.status(500).json(
                                {
                                    status: 500,
                                    message: err.message
                                }
                            );
                        } else {
                            res.format({
                                json: function () {
                                    res.json({
                                        status: 200,
                                        data: entity
                                    });
                                }
                            });
                            article.update({heartCount: article.heartCount + 1}, function (err, data) {
                            });
                            user.update({heartCount: user.heartCount + 1}, function (err, data) {
                            });
                        }
                    })
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
            } else {
                data.userId = user._id;
                data.articleId = article._id;
                data.userAvatar = user.avatar;
                data.articleName = article.title;
                data.siteName = article.siteName;
                data.siteId = article.siteId;
                data.heart = true;
                User2Article.create(data, function (err, entity) {
                    if (err) {
                        console.log(err);
                        res.status(500).json(
                            {
                                status: 500,
                                message: err.message
                            }
                        );
                    } else {
                        res.format({
                            //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                            //html: function(){
                            //  // If it worked, set the header so the address bar doesn't still say /adduser
                            //  res.location("blobs");
                            //  // And forward to success page
                            //  res.redirect("/blobs");
                            //},
                            json: function () {
                                res.json({
                                    status: 200,
                                    data: entity
                                });
                            }
                        });
                        article.update({heartCount: article.heartCount + 1}, function (err, data) {
                        });
                        user.update({heartCount: user.heartCount + 1}, function (err, data) {
                        });
                    }
                })
            }
        })
    });

/**
 * undelete entity
 */
router.post('/:id/unheart',
    validateToken,
    requireAuth, function (req, res) {
        var article = req.article;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.articleId = article._id;
        User2Article.findOne(conditions, function (err, entity) {
            if (err) {
                res.status(500).json(
                    {
                        status: 500,
                        message: err.message
                    }
                );
                return;
            }
            var data = {};
            if (entity) {
                if (!entity.isBlock || entity.heart == true) {
                    data.isBlock = true;
                    data.heart = false;
                    entity.heart = false;
                    entity.isBlock = true;
                    entity.update(data, function (err, resData) {
                        if (err) {
                            res.status(500).json(
                                {
                                    status: 500,
                                    message: err.message
                                }
                            );
                        } else {
                            res.format({
                                json: function () {
                                    res.json({
                                        status: 200,
                                        data: entity
                                    });
                                }
                            });
                            article.update({heartCount: article.heartCount - 1}, function (err, data) {
                            });
                            user.update({heartCount: user.heartCount - 1}, function (err, data) {
                            });
                        }
                    })
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
            } else {
                res.status(404).json(
                    {
                        status: 404,
                        message: "没有找到该记录"
                    }
                );
                return;
            }
        });
    });

/**
 * subscribe entity
 */
router.post('/:id/toread',
    validateToken,
    requireAuth, function (req, res) {
        var article = req.article;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.articleId = article._id;
        User2Article.findOne(conditions, function (err, entity) {
            if (err) {
                return next();
            }
            var data = {};
            if (entity) {
                if (entity.isBlock || entity.toread == false) {
                    data.isBlock = false;
                    data.toread = true;
                    entity.toread = true;
                    entity.isBlock = false;
                    entity.updateAt = new Date().getTime();
                    entity.update(data, function (err, resData) {
                        if (err) {
                            res.status(500).json(
                                {
                                    status: 500,
                                    message: err.message
                                }
                            );
                        } else {
                            res.format({
                                json: function () {
                                    res.json({
                                        status: 200,
                                        data: entity
                                    });
                                }
                            });
                            user.update({toReadCount: user.toReadCount + 1}, function (err, data) {
                            });
                        }
                    })
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
            } else {
                data.userId = user._id;
                data.articleId = article._id;
                data.userAvatar = user.avatar;
                data.articleName = article.title;
                data.siteName = article.siteName;
                data.siteId = article.siteId;
                data.toread = true;
                User2Article.create(data, function (err, entity) {
                    if (err) {
                        console.log(err);
                        res.status(500).json(
                            {
                                status: 500,
                                message: err.message
                            }
                        );
                    } else {
                        res.format({
                            json: function () {
                                res.json({
                                    status: 200,
                                    data: entity
                                });
                            }
                        });
                        user.update({toReadCount: user.toReadCount + 1}, function (err, data) {
                        });
                    }
                })
            }
        })
    });

/**
 * undelete entity
 */
router.post('/:id/untoread',
    validateToken,
    requireAuth, function (req, res) {
        var article = req.article;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.articleId = article._id;
        User2Article.findOne(conditions, function (err, entity) {
            if (err) {
                res.status(500).json(
                    {
                        status: 500,
                        message: err.message
                    }
                );
                return;
            }
            var data = {};
            if (entity) {
                if (!entity.isBlock || entity.toread == true) {
                    data.isBlock = true;
                    data.toread = false;
                    entity.toread = false;
                    entity.isBlock = true;
                    entity.update(data, function (err, resData) {
                        if (err) {
                            res.status(500).json(
                                {
                                    status: 500,
                                    message: err.message
                                }
                            );
                        } else {
                            res.format({
                                json: function () {
                                    res.json({
                                        status: 200,
                                        data: entity
                                    });
                                }
                            });
                            user.update({toReadCount: user.toReadCount - 1}, function (err, data) {
                            });
                        }
                    })
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
            } else {
                res.status(404).json(
                    {
                        status: 404,
                        message: "没有找到该记录"
                    }
                );
                return;
            }
        });
    });


/**
 * subscribe entity
 */
router.post('/:id/collect',
    validateToken,
    requireAuth, function (req, res) {
        var article = req.article;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.articleId = article._id;
        User2Article.findOne(conditions, function (err, entity) {
            if (err) {
                return next();
            }
            var data = {};
            if (entity) {
                if (entity.isBlock || entity.collect == false) {
                    data.isBlock = false;
                    data.collect = true;
                    entity.collect = true;
                    entity.isBlock = false;
                    entity.updateAt = new Date().getTime();
                    entity.save();
                    res.format({
                        json: function () {
                            res.json({
                                status: 200,
                                data: entity
                            });
                        }
                    });
                    article.collectCount = article.collectCount + 1;
                    article.save();
                    user.collectCount = user.collectCount + 1;
                    user.save();
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
            } else {
                // userId
                // articleId
                // articleName
                // from
                // update
                // img
                data.userId = user._id;
                data.articleId = article._id;
                data.userAvatar = user.avatar;
                data.href = article.href;
                data.articleName = article.title;
                data.account = article.account;
                data.img = article.img;
                data.update = article.update;
                data.tag = article.tag;
                data.collect = true;
                User2Article.create(data, function (err, entity) {
                    if (err) {
                        console.log(err);
                        res.status(500).json(
                            {
                                status: 500,
                                message: err.message
                            }
                        );
                    } else {
                        res.format({
                            json: function () {
                                res.json({
                                    status: 200,
                                    data: entity
                                });
                            }
                        });
                        article.collectCount = article.collectCount + 1;
                        article.save();
                        user.collectCount = user.collectCount + 1;
                        user.save();
                    }
                })
            }
        })
    });

/**
 * undelete entity
 */
router.post('/:id/uncollect',
    validateToken,
    requireAuth, function (req, res) {
        var article = req.article;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.articleId = article._id;
        User2Article.findOne(conditions, function (err, entity) {
            if (err) {
                res.status(500).json(
                    {
                        status: 500,
                        message: err.message
                    }
                );
                return;
            }
            var data = {};
            if (entity) {
                if (!entity.isBlock || entity.collect == true) {
                    data.isBlock = true;
                    data.collect = false;
                    entity.collect = false;
                    entity.isBlock = true;
                    entity.save();
                    res.format({
                        json: function () {
                            res.json({
                                status: 200,
                                data: entity
                            });
                        }
                    });
                    article.collectCount = article.collectCount - 1;
                    article.save();
                    user.collectCount = user.collectCount - 1;
                    user.save();
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
            } else {
                res.status(404).json(
                    {
                        status: 404,
                        message: "没有找到该记录"
                    }
                );
                return;
            }
        });
    });


module.exports = router;
