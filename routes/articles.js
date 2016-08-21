var express = require('express');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var User = mongoose.model('User');

var User2ArticleCollect = mongoose.model('User2ArticleCollect')
var User2ArticleHeart = mongoose.model('User2ArticleHeart')
var User2ArticleRead = mongoose.model('User2ArticleRead')
var User2ArticleShare = mongoose.model('User2ArticleToShare')
var User2ArticleToRead = mongoose.model('User2ArticleToRead')
var validateToken = require("../utils/authutil").validateToken;
var requireAuth = require("../utils/authutil").requireAuth;
var validateRole = require("../utils/authutil").validateRole;
var validator = require('validator');
var eventproxy = require('eventproxy');
var pro_error = "prop_error";
var unfind = "unfind";
var router = express.Router();
var bodyParser = require('body-parser'); // parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var DEFAULT_PAGE_SIZE = 20; // 默认每页数量
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
    var pageSize = req.param('pageSize') > 0 ? req.param('pageSize') : DEFAULT_PAGE_SIZE;
    var page = req.param('page') > 0 ? req.param('page') : DEFAULT_PAGE;
    var beforeAt = req.param('beforeAt');
    var afterAt = req.param('afterAt');
    var type = req.param('type');

    console.log("pageSize:" + pageSize + " page:" + page
        + " beforeAt:" + beforeAt + " afterAt:" + afterAt+" type:"+type);

    var conditions = {checked:false};
    var query = Article.find(conditions);
    if (beforeAt > 0 && afterAt > 0 && beforeAt > afterAt) {
        query.where("updateAt").gt(afterAt).lt(beforeAt);
    } else if (beforeAt > 0) {
        query.where("updateAt").lt(beforeAt);
    } else if (afterAt > 0) {
        query.where("updateAt").gt(afterAt);
    } else {
        query.where("updateAt").lt(new Date().getTime());
    }
    
    query.skip((page - 1) * pageSize);
    query.limit(pageSize * 1);
    query.sort({'likeCount':-1});
    query.select('title publishAt author authorId site siteId srcUrl ' +
        'topics age heartCount readCount collectCount shareCount commentCount createAt updateAt checked reason isBlock')
    query.exec(function (err, entity) {
        if (err) {
            res.format({
                json: function () {
                    res.json({
                        status: 500,
                        msg: err.message
                    });
                }
            });
        } else {
            res.format({
                json: function () {
                    res.status(200).json({
                        "code": 200,
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
    var data = {};
    if (req.body.title) {
        data.title = validator.trim(req.body.title);
    }
    if (req.body.content) {
        data.content = validator.trim(req.body.content);
    }
    if (req.body.author) {
        data.author = validator.trim(req.body.author);
    }
    if (req.body.authorId) {
        data.authorId = validator.trim(req.body.authorId);
    }

    if (req.body.site) {
        data.site = validator.trim(req.body.site);
    }
    if (req.body.siteId) {
        data.siteId = validator.trim(req.body.siteId);
    }
    if (req.body.srcUrl) {
        data.srcUrl = validator.trim(req.body.srcUrl);
    }
    if (req.body.topics) {
        data.topics = validator.trim(req.body.topics);
        data.topics = data.topics.split(",")
    }

    if (req.body.age) {
        data.age = validator.trim(req.body.age);
    }

    if (req.body.likeNum) {
        data.likeNum = validator.trim(req.body.likeNum);
    }
    if (req.body.commentNum) {
        data.commentNum = validator.trim(req.body.commentNum);
    }
    if (req.body.readNum) {
        data.readNum = validator.trim(req.body.readNum);
    }

    if (req.body.publishAt) {
        data.publishAt = validator.trim(req.body.publishAt);
    }

    Article.create(data, function (err, entity) {
        if (err) {
            if (err.code == 11000) {
                ep.emit(pro_error, '文章已经存在');
                return;
            } else {
                ep.emit(pro_error, err.message);
                return;
            }
        } else {
            res.format({
                //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                //html: function(){
                //  // If it worked, set the header so the address bar doesn't still say /adduser
                //  res.location("blobs");
                //  // And forward to success page
                //  res.redirect("/blobs");
                //},
                //JSON response will show the newly created blob
                json: function () {
                    res.json({
                        status: 200,
                        data: req.article
                    });
                }
            });
        }
    })
});

// route middleware to validate :id
router.param('id', function (req, res, next, id) {
    Article.findById(id, function (err, entity) {
        if (err || !entity) {
            res.status(404)
            var err = new Error('没有找到主题', id);
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

router.get('/:id', function (req, res) {
    var uid = req.query.uid;
    res.format({
        json: function () {
            res.json({
                status: 200,
                data: req.article
            });
        }
    });
    if(uid){
        User.update({'_id':uid}, {'$inc':{'readCount':1}}).exec();
        User2ArticleRead.findOne({"userId":uid, "articleId":req.id}, function (err, entity) {
            console.log("add read article");
            if(!entity){
                Article.update({"_id":req.id}, {"$inc":{"readCount":1} }).exec();
                var data = {"userId":uid, "articleId":req.id, "articleName":req.article.title};
                if (req.body.userAvatar) {
                    data.userAvatar = validator.trim(req.body.userAvatar);
                }
                var read = new User2ArticleRead(data);
                read.save();
            }
        });

    }

});

/**
 * 修改文章
 */
router.put('/:id', function (req, res, next) {
    var entity = req.article;
    var ep = new eventproxy();
    ep.fail(next);
    ep.on(pro_error, function (msg) {
        res.status(400).json({
            status: 40003,
            msg: msg,
        })
    });
    var data = {};
    if (req.body.title) {
        data.title = validator.trim(req.body.title);
    }
    if (req.body.content) {
        data.content = validator.trim(req.body.content);
    }
    if (req.body.author) {
        data.author = validator.trim(req.body.author);
    }
    if (req.body.authorId) {
        data.authorId = validator.trim(req.body.authorId);
    }

    if (req.body.site) {
        data.site = validator.trim(req.body.site);
    }
    if (req.body.siteId) {
        data.siteId = validator.trim(req.body.siteId);
    }
    if (req.body.srcUrl) {
        data.srcUrl = validator.trim(req.body.srcUrl);
    }
    if (req.body.topics) {
        data.topics = validator.trim(req.body.topics);
        data.topics = data.topics.split(",")
    }

    if (req.body.age) {
        data.age = validator.trim(req.body.age);
    }
    if (req.body.readCount) {
        data.readCount = validator.trim(req.body.readCount);
    }
    if (req.body.commentCount) {
        data.commentCount = validator.trim(req.body.commentCount);
    }
    if (req.body.heartCount) {
        data.heartCount = validator.trim(req.body.heartCount);
    }

    if (req.body.publishAt) {
        data.publishAt = validator.trim(req.body.publishAt);
    }
    entity.updateAt = new Date().getTime();
    data.updateAt = entity.updateAt;
    entity.update(data, function (err, blobID) {
        if (err) {
            var msg = err.message;
            if (err.code == 11000) {
                msg = "文章已经存在";
            }
            ep.emit(pro_error, msg);
            return;
        } else {
            //HTML responds by going back to the page or you can be fancy and create a new view that shows a success page.
            res.format({
                //html: function(){
                //  res.redirect("/blobs/" + blob._id);
                //},
                //JSON responds showing the updated values
                json: function () {
                    res.json({
                        status: 200,
                        data: req.article
                    });
                }
            });
        }
    })
});

/**
 * delete entity
 */
router.delete('/:id', function (req, res) {
    var entity = req.article;

    entity.remove(function (err, data) {
        if (err) {
            return next();
        } else {
            //Returning success messages saying it was deleted
            res.format({
                json: function () {
                    res.status(200).json({
                        "code": 200,
                        "msg": "delete article success"
                    });
                }
            });
        }
    });
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
        User2ArticleHeart.findOne(conditions, function (err, entity) {
            if (err) {
                return next();
            }
            var data = {};
            if (entity) {
                if (entity.isBlock) {
                    data.isBlock = false;
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
                            article.update({heartCount: article.heartCount + 1}, function (err, data) {});
                            user.update({heartCount: user.heartCount + 1}, function (err, data) {});
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
                User2ArticleHeart.create(data, function (err, entity) {
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
                        article.update({heartCount: article.heartCount + 1}, function (err, data) {});
                        user.update({heartCount: user.heartCount + 1}, function (err, data) {});
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
         User2ArticleHeart.findOne(conditions, function (err, entity) {
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
                if (!entity.isBlock) {
                    data.isBlock = true;
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
                            article.update({heartCount: article.heartCount - 1}, function (err, data) {});
                            user.update({heartCount: user.heartCount - 1}, function (err, data) {});
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
        User2ArticleToRead.findOne(conditions, function (err, entity) {
            if (err) {
                return next();
            }
            var data = {};
            if (entity) {
                if (entity.isBlock) {
                    data.isBlock = false;
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
                            user.update({toReadCount: user.toReadCount + 1}, function (err, data) {});
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
                User2ArticleToRead.create(data, function (err, entity) {
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
                        user.update({toReadCount: user.toReadCount + 1}, function (err, data) {});
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
        User2ArticleToRead.findOne(conditions, function (err, entity) {
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
                if (!entity.isBlock) {
                    data.isBlock = true;
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
                            user.update({toReadCount: user.toReadCount - 1}, function (err, data) {});
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
        User2ArticleCollect.findOne(conditions, function (err, entity) {
            if (err) {
                return next();
            }
            var data = {};
            if (entity) {
                if (entity.isBlock) {
                    data.isBlock = false;
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
                            article.update({collectCount: article.collectCount + 1}, function (err, data) {});
                            user.update({collectCount: user.collectCount + 1}, function (err, data) {});
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
                User2ArticleCollect.create(data, function (err, entity) {
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
                        article.update({collectCount: article.collectCount + 1}, function (err, data) {});
                        user.update({collectCount: user.collectCount + 1}, function (err, data) {});
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
        User2ArticleCollect.findOne(conditions, function (err, entity) {
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
                if (!entity.isBlock) {
                    data.isBlock = true;
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
                            article.update({collectCount: article.collectCount - 1}, function (err, data) {});
                            user.update({collectCount: user.collectCount - 1}, function (err, data) {});
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
router.post('/:id/share',
    validateToken,
    requireAuth, function (req, res) {
        var article = req.article;
        var user = req.user;
        var conditions = {};
        conditions.userId = user._id;
        conditions.articleId = article._id;
        User2ArticleShare.findOne(conditions, function (err, entity) {
            if (err) {
                return next();
            }
            var data = {};
            if (!entity) {
                data.userId = user._id;
                data.articleId = article._id;
                data.userAvatar = user.avatar;
                data.articleName = article.title;
                User2ArticleShare.create(data, function (err, entity) {
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
                        user.update({shareCount: user.shareCount + 1}, function (err, data) {});
                        article.update({shareCount: user.shareCount + 1}, function (err, data) {});
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
        })
    });

module.exports = router;
