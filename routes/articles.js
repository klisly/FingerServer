var express = require('express');
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
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
    query.sort({'likeNum':-1});
    query.select('title publishAt author authorId site siteId srcUrl ' +
        'topics age likeNum commentNum readNum createAt updateAt checked reason isBlock')
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
                //HTML returns us back to the main page, or you can create a success page
                //html: function(){
                //  res.redirect("/blobs");
                //},
                //JSON returns the item with the message that is has been deleted
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
                    res.json(entity);
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

    res.format({
        //html: function(){
        //  res.render('blobs/show', {
        //    "blobdob" : blobdob,
        //    "blob" : blob
        //  });
        //},
        json: function () {
            res.json(req.article);
        }
    });

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
                    res.json(entity);
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
                //HTML returns us back to the main page, or you can create a success page
                //html: function(){
                //  res.redirect("/blobs");
                //},
                //JSON returns the item with the message that is has been deleted
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


module.exports = router;
