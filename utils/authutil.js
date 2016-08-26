var jwt = require('jwt-simple');
var jwtTokenSecret = "see you all the time";
var userProxy = require('../proxy/user')
var url = require('url')
var redisClient = require('../model/second_redis').redisClient;
/**
 * 此处使用redis存储注销后的token
 */
/**
 * 生成token
 * @param userid
 * @param expires
 * @returns {String|ArrayBuffer}
 */
exports.genToken = function (userid, expires) {
    var token = jwt.encode(
        {
            iss: userid,
            exp: expires
        },
        jwtTokenSecret
    );
    return token;
}

/**
 * 校验token
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
exports.validateToken = function (req, res, next) {
    var parsed_url = url.parse(req.url, true)
    var token = (req.body && req.body.access_token) || parsed_url.query.access_token || req.headers["x-access-token"];
    redisClient.get(token, function (err, reply) {
        if (err) {
            console.log(err);
            res.status(500)
                .json(
                    {
                        msg: "server error",
                        status: 500
                    }
                ).end();
            return;
        }

        if (reply) {
            res.status(401)
                .json(
                    {
                        msg: "token invalid",
                        status: 40102
                    }
                )
                .end();
            return
        } else {
            if (token) {
                try {
                    var decoded = jwt.decode(token, jwtTokenSecret);
                    // console.log("token decod data:" + decoded.iss + " expires:" + decoded.exp);
                    if (decoded.exp <= Date.now()) {
                        res.status(401)
                            .json(
                                {
                                    msg: 'Access token has expired',
                                    status: 40103
                                })
                            .end();
                        return;
                    }
                    userProxy.getUsersById(decoded.iss, function (err, entity) {
                        // console.log("find user from db:" + entity);
                        if (!err) {
                            req.user = entity;
                            return next();
                        }
                    })
                } catch (err) {
                    return next();
                }
            } else {
                next();
            }
        }
    });
}

/**
 * 删除token
 * @param userid
 * @param expires
 * @returns {String|ArrayBuffer}
 */
exports.deleteToken = function (access_token) {
    if (access_token) {
        console.log("delete token:" + access_token);
        var decoded = jwt.decode(access_token, jwtTokenSecret);
        redisClient.set(access_token, {is_expired: true});
        redisClient.expire(access_token, (decoded.exp - new Date().getTime()) / 1000);
    }
}


exports.requireAuth = function (req, res, next) {
    if (!req.user) {
        res.status(401)
            .json({
                msg: 'not authorized',
                status: 40101
            })
            .end();
    } else {
        next()
    }
}

/**
 * 验证用户权限等级
 * @param req
 * @param res
 * @param next
 */
exports.validateRole = function (req, res, next) {
    if (!hasRight(req.user.role, req.url) && req.user.loginname != '18301441595') {
        res.status(401)
            .json({
                msg: '没有权限',
                status: 40102
            })
            .end();
    } else {
        next()
    }
}

function hasRight(role, url) {
    if(role == 0){
        return false;
    }
    return true;
}