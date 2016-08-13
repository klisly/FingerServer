var express = require('express');
var mongoose = require('mongoose');
var validator = require('validator');
var User = mongoose.model('User');
var Article = mongoose.model('Article');
var User2Topic = mongoose.model('User2Topic');
var User2Site = mongoose.model('User2Site');

var eventproxy = require('eventproxy');
var userProxy = require("../proxy/user");
var getRandomAvatar = require("../utils/avatarutil").getRandomAvatar
var hash = require("../utils/encryptutil").hash;
var genToken = require("../utils/authutil").genToken;
var delToken = require("../utils/authutil").deleteToken;
var url = require('url')

var moment = require('moment');

var router = express.Router();
var bodyParser = require('body-parser'); // parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var DEFAULT_PAGE_SIZE = 20; // 默认每页数量
var DEFAULT_PAGE = 1; // 默认页号
var expires = moment().add(7, 'days').valueOf(); // 7天有效期
var suphone = "18301441595"
// 公用校验方法
var validateToken = require("../utils/authutil").validateToken;

var requireAuth = require("../utils/authutil").requireAuth;
//Any requests to this controller must pass through this 'use' function
//Copy and pasted from method-override
router.use(bodyParser.urlencoded({extended: true}))
router.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
    }
}))

var pro_error = "prop_error";
/**
 * 新增用户
 */
router.post('/register', function (req, res, next) {
    var loginname = validator.trim(req.body.loginname).toLowerCase();
    var passwd = "";
    if (req.body.passwd !== undefined) {
        passwd = validator.trim(req.body.passwd);
    }
    var name = ""
    if (req.body.nickname !== undefined) {
        name = validator.trim(req.body.nickname);
    } else {
        name = loginname;
    }
    var avatar = getRandomAvatar();
    if (req.body.avatar !== undefined) {
        avatar = validator.trim(req.body.avatar);
    }
    var brief = "一个新来的热爱读书的小伙伴!";
    if (req.body.brief !== undefined) {
        brief = validator.trim(req.body.brief);
    }
    var ep = new eventproxy();
    ep.fail(next);
    ep.on(pro_error, function (msg) {
        res.status(400).json({
            status: 40001,
            msg: msg,
        })
    });
    if ([loginname, passwd, name].some(function (item) {
            return item === '';
        })) {
        ep.emit(pro_error, "信息不完全");
        return;
    }

    if (validator.isMobilePhone(loginname)) {
        ep.emit(pro_error, "账户名必须是手机号");
        return;
    }

    if (passwd.length < 5) {
        ep.emit(pro_error, "密码太短了");
        return;
    }

    if (brief.length < 5) {
        ep.emit(pro_error, "简述太短了");
        return;
    }

    userProxy.getUserByLoginName(loginname, function (err, entity) {
        if (err) {
            return next(err);
        }
        console.log("find user done, loginname:" + loginname + " count:" + entity);
        if (entity) {
            ep.emit(pro_error, '手机号已经已被使用。');
            return;
        }
        hash(passwd, function (err, salt, hash) {
            if (err) {
                return next(err);
            }
            var user = {
                name: name,
                loginname: loginname,
                passwd: hash,
                brief: brief,
                avatar: avatar,
                createAt: Date.now(),
                updateAt: Date.now(),
                salt: salt,
            };
            console.log(user);
            User.create(user, function (err, entity) {
                if (err) {
                    return next(err);
                }
                token = genToken(entity._id, expires);
                var userJson = entity.toJSON();
                delete userJson["loginname"];
                delete userJson["passwd"];
                delete userJson["salt"];
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
                        res.json(
                            {
                                status: 200,
                                data: {
                                    token: token,
                                    exp: expires,
                                    user: userJson
                                }
                            }
                        );
                    }
                });
            });
        });
    })
    ;
})

router.param('id', function (req, res, next, id) {
    User.findById(id, function (err, entity) {
        if (err || !entity) {
            res.status(404)
            var err = new Error('没有找到该用户', id);
            err.status = 404;
            res.format({
                //html: function(){
                //  next(err);
                //},
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

            req.user = entity;
            // go to the next thing
            next();
        }
    });
});


router.get('/:id', function (req, res) {
    var userJson = req.user.toJSON();
    delete userJson["loginname"];
    delete userJson["passwd"];
    delete userJson["salt"];
    res.format({
        //html: function(){
        //  res.render('blobs/show', {
        //    "blobdob" : blobdob,
        //    "blob" : blob
        //  });
        //},
        json: function () {
            res.json(userJson);
        }
    });

});

/**
 * login
 */
router.post('/login', function (req, res, next) {
    var loginname = "";
    if (req.body.loginname) {
        loginname = validator.trim(req.body.loginname).toLowerCase();
    }
    var passwd = "";
    if (req.body.passwd) {
        passwd = validator.trim(req.body.passwd);
    }
    var platform = "LOCAL";
    if (req.body.platform) {
        platform = validator.trim(req.body.platform);
    }
    var ep = new eventproxy();
    ep.fail(next);
    ep.on(pro_error, function (msg) {
        res.status(400).json({
            status: 40001,
            msg: msg,
        })
    });
    if ([loginname, passwd].some(function (item) {
            return item === '';
        })) {
        ep.emit(pro_error, "信息不完全");
        return;
    }

    if (validator.isMobilePhone(loginname)) {
        ep.emit(pro_error, "账户名必须是手机号");
        return;
    }

    if (passwd.length < 5) {
        ep.emit(pro_error, "密码太短了");
        return;
    }

    userProxy.getUserByLoginName(loginname, function (err, entity) {
        if (err) {
            return next(err);
        }
        console.log("find user done, loginname:" + loginname + " entity:" + entity);
        if (!entity) {
            ep.emit(pro_error, '账户不存在');
            return;
        }
        if (entity.avatar == null || entity.avatar == '') {
            entity.avatar = getRandomAvatar();
        }
        hash(passwd, entity.salt, function (err, hash) {
            if (err) {
                return next(err);
            }
            if (hash == entity.passwd) {
                token = genToken(entity._id, expires);
                var userJson = entity.toJSON();
                delete userJson["loginname"];
                delete userJson["passwd"];
                delete userJson["salt"];
                delete userJson["__v"];

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
                            data: {
                                token: token,
                                exp: expires,
                                user: userJson
                            }
                        });
                    }
                });
            } else {
                ep.emit(pro_error, "用户名或者密码出错");
            }
        });
    });
});


/**
 * 修改密码
 */
router.post('/resetpasswd', function (req, res, next) {
    var loginname = "";
    if (req.body.loginname) {
        loginname = validator.trim(req.body.loginname).toLowerCase();
    }
    var passwd = "";
    if (req.body.passwd) {
        passwd = validator.trim(req.body.passwd);
    }
    var ep = new eventproxy();
    ep.fail(next);
    ep.on(pro_error, function (msg) {
        res.status(400).json({
            status: 40001,
            msg: msg,
        })
    });
    if ([loginname, passwd].some(function (item) {
            return item === '';
        })) {
        ep.emit(pro_error, "信息不完全");
        return;
    }

    if (validator.isMobilePhone(loginname)) {
        ep.emit(pro_error, "账户名必须是手机号");
        return;
    }

    if (passwd.length < 5) {
        ep.emit(pro_error, "密码太短了");
        return;
    }

    userProxy.getUserByLoginName(loginname, function (err, entity) {
        if (err) {
            return next(err);
        }
        console.log("find user done, loginname:" + loginname + " entity:" + entity);
        if (!entity) {
            ep.emit(pro_error, '账户不存在');
            return;
        }

        hash(passwd, function (err, salt, hash) {
            if (err) {
                return next(err);
            }
            entity.passwd = hash;
            entity.salt = salt;
            entity.updateAt = new Date().getTime();
            entity.save(function (err) {
                if (err) {
                    return next(err);
                }
                token = genToken(entity._id, expires);
                var userJson = entity.toJSON();
                delete userJson["loginname"];
                delete userJson["passwd"];
                delete userJson["salt"];
                delete userJson["__v"];

                res.format({
                    json: function () {
                        res.json({
                            status: 200,
                            data: {
                                token: token,
                                exp: expires,
                                user: userJson
                            }
                        });
                    }
                });

            });
        });
    });
});


/**
 * 支持分页查询
 */
router.get('/:id/articles', function (req, res) {
    var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
    var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
    var beforeAt = req.query.beforAt;
    var afterAt = req.query.afterAt;
    console.log("pageSize:" + pageSize + " page:" + page + " beforeAt:" + beforeAt + " afterAt:" + afterAt);

    var conditions = {};
    conditions.authorId = req.id;
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
                //html: function(){
                //  res.render('blobs/show', {
                //    "blobdob" : blobdob,
                //    "blob" : blob
                //  });
                //},
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
 * 修改信息
 */
router.put('/',
    validateToken,
    requireAuth,
    function (req, res, next) {
        var entity = req.user;
        var ep = new eventproxy();
        ep.fail(next);
        ep.on(pro_error, function (msg) {
            res.status(400).json({
                status: 400,
                msg: msg,
            })
        });
        var data = {};
        if (req.body.name) {
            data.name = validator.trim(req.body.name);
            entity.name = data.name;
        }
        if (req.body.avatar) {
            data.avatar = validator.trim(req.body.avatar);
            entity.avatar = data.avatar;
        }
        if (req.body.brief) {
            data.brief = validator.trim(req.body.brief);
            entity.brief = data.brief;
        }
        if (req.body.role) {
            data.role = validator.trim(req.body.role);
            entity.role = data.role;
        }

        if (req.body.isBlock) {
            data.isBlock = validator.trim(req.body.isBlock);
            entity.isBlock = data.isBlock;
        }
        if (req.body.isBasicSet) {
            data.isBasicSet = validator.trim(req.body.isBasicSet);
            entity.isBasicSet = data.isBasicSet;
        }
        if (req.body.likeCount) {
            data.likeCount = validator.trim(req.body.likeCount);
            entity.likeCount = data.likeCount;
        }
        if (req.body.replyCount) {
            data.replyCount = validator.trim(req.body.replyCount);
            entity.replyCount = data.replyCount;
        }

        if (req.body.followerCount) {
            data.followerCount = validator.trim(req.body.followerCount);
            entity.followerCount = data.followerCount;
        }
        if (req.body.followingSite) {
            data.followingSite = validator.trim(req.body.followingSite);
            entity.followingSite = data.followingSite;
        }
        if (req.body.followingTopic) {
            data.followingTopic = validator.trim(req.body.followingTopic);
            entity.followingTopic = data.followingTopic;
        }
        if (req.body.followingPeople) {
            data.followingPeople = validator.trim(req.body.followingPeople);
            entity.followingPeople = data.followingPeople;
        }

        entity.updateAt = new Date().getTime();
        data.updateAt = entity.updateAt;
        entity.update(data, function (err, blobID) {
            if (err) {
                var msg = err.message;
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
                            data: entity
                        });
                    }
                });
            }
        })
    });

/**
 * 退出
 */
router.post('/logout',
    validateToken,
    requireAuth,
    function (req, res, next) {
        var parsed_url = url.parse(req.url, true);
        var token = (req.body && req.body.access_token) || parsed_url.query.access_token || req.headers["x-access-token"];
        delToken(token);
        res.format({
            json: function () {
                res.status(200).json({
                    status: 200,
                });
            }
        });
    });

/**
 * 查询所有的用户
 */
router.get('/', function (req, res) {
    var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
    var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
    var beforeAt = req.query.beforAt;
    var afterAt = req.query.afterAt;
    console.log("pageSize:" + pageSize + " page:" + page + " beforeAt:" + beforeAt + " afterAt:" + afterAt);

    var conditions = {};
    var query = User.find(conditions);
    if (beforeAt > 0 && afterAt > 0 && beforeAt > afterAt) {
        query.where("updateAt").gt(afterAt).lt(beforeAt);
    } else if (beforeAt > 0) {
        query.where("updateAt").lt(beforeAt);
    } else if (afterAt > 0) {
        query.where("updateAt").gt(afterAt);
    } else {
        query.where("updateAt").lt(new Date().getTime());
    }
    query.select("_id name brief platform updateAt createAt followingPeople followingTopic" +
        " followingSite likeCount followingCount followerCount " +
        "replyCount likeCount isBlock role avatar")
    query.skip((page - 1) * pageSize);
    query.limit(pageSize * 1);
    query.sort('-updateAt desc');
    query.exec(function (err, entity) {
        if (err) {
            console.log('GET Error: There was a problem retrieving: ' + err);
        } else {
            console.log('GET Retrieving ID: ' + req.id + "result:" + entity);
            res.format({
                // html: function(){
                //  res.render('blobs/show', {
                //    "blobdob" : blobdob,
                //    "blob" : blob
                //  });
                // },
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
 * list subscribe topics
 */
router.get('/:uid/topics', function (req, res) {
    var conditions = {};
    conditions.userId = req.param('uid');
    conditions.isBlock = false;
    User2Topic.find(conditions, function (err, entity) {
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
 * list subscribe topics
 */
router.get('/:uid/sites', function (req, res) {
    var conditions = {};
    conditions.userId = req.param('uid');
    conditions.isBlock = false;
    User2Site.find(conditions, function (err, entity) {
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
router.put('/:id/topics/reorder',
    validateToken,
    requireAuth, function (req, res, next) {
        var orders = req.body.data;
        var user = req.user;
        var objects = JSON.parse(orders);
        objects.forEach(function (entity) {
            User2Topic.findByIdAndUpdate(entity.id, {"seq": entity.seq}, function (err) {
                console.log(err);
            });
        });

        res.status(200).json({
            status: 200
        })

    });

/**
 * subscribe entity
 */
router.put('/:id/sites/reorder',
    validateToken,
    requireAuth, function (req, res, next) {
        var orders = req.body.data;
        var user = req.user;
        var objects = JSON.parse(orders);
        objects.forEach(function (entity) {
            User2Site.findByIdAndUpdate(entity.id, {"seq": entity.seq}, function (err) {
                console.log(err);
            });
        });

        res.status(200).json({
            status: 200
        })

    });


module.exports = router;
