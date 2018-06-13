var express = require('express');
var mongoose = require('mongoose');
var Joke = mongoose.model('jcontent');
var User = mongoose.model('User');
var randomInt = require('random-integral');
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
var worgProxy = require("../../proxy/user");

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
    console.log(req.url)
    var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
    var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
    console.log("pageSize:" + pageSize + " page:" + page);
    var type = req.query.type
    var data = {};
    if (type) {
        data.type = type.trim()
    }

    console.log("condition:" + JSON.stringify(data))
    var query = Joke.find(data);
    query.skip((page - 1) * pageSize);
    query.sort({"pub_time": -1})
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


// /**
//  * 支持分页查询
//  *
//  */
// router.get('/search', function (req, res) {
//     var pageSize = req.query.pageSize > 0 ? req.query.pageSize : DEFAULT_PAGE_SIZE;
//     var page = req.query.page > 0 ? req.query.page : DEFAULT_PAGE;
//     console.log("pageSize:" + pageSize + " page:" + page);
//     var keyword = req.query.keyword
//     if (keyword) {
//         var data = {"name": {$regex: ".*" + keyword + ".*"}}
//         console.log("condition:" + JSON.stringify(data))
//         var query = WxOrg.find(data);
//         query.sort({"index_scores": -1})
//         query.limit(DEFAULT_PAGE_SIZE);
//         query.exec(function (err, entity) {
//             if (err) {
//                 console.log("query result: err:" + JSON.stringify(err));
//                 res.format({
//                     json: function () {
//                         res.json({
//                             code: 500,
//                             msg: err.message
//                         });
//                     }
//                 });
//             } else {
//                 console.log("query result: size:" + entity.length)
//                 res.format({
//                     json: function () {
//                         res.status(200).json({
//                             "status": 200,
//                             "data": entity
//                         });
//                     }
//                 });
//             }
//         });
//     } else {
//         res.format({
//             json: function () {
//                 res.status(200).json({
//                     "status": 200,
//                     "data": []
//                 });
//             }
//         });
//     }
// });
//
//
// /**
//  * 新增公众号
//  */
// router.post('/',
//     validateToken,
//     requireAuth, function (req, res, next) {
//         WxOrg.create(req.body, function (err, entity) {
//             if (err) {
//                 res.format({
//                     json: function () {
//                         res.json(
//                             {
//                                 status: 401,
//                                 msg: "添加失败"
//                             }
//                         );
//                     }
//                 });
//             } else {
//                 res.format({
//                     json: function () {
//                         res.json(
//                             {
//                                 status: 200,
//                                 data: entity
//                             }
//                         );
//                     }
//                 });
//             }
//         });
//     });
//
//
// router.param('id', function (req, res, next, id) {
//     console.log("id:" + req.params.id)
//     WxOrg.findById(id, function (err, entity) {
//         if (err || !entity) {
//             res.status(404)
//             var err = new Error('没有找到公众号', id);
//             err.status = 404;
//             res.format({
//                 json: function () {
//                     res.json(
//                         {
//                             status: err.status,
//                             message: err
//                         }
//                     );
//                 }
//             });
//             //if it is found we continue on
//         } else {
//             //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
//             //console.log(blob);
//             // once validation is done save the new item in the req
//             req.id = id;
//             req.entity = entity;
//             // go to the next thing
//             next();
//         }
//     });
// });
//
//
// /**
//  * subscribe entity
//  */
// router.get('/:id', function (req, res) {
//     res.json({
//         status: 200,
//         data: req.entity
//     })
// });
//
// /**
//  * delete entity
//  */
// router.delete('/:id', function (req, res) {
//     var entity = req.entity;
//     entity.remove(function (err, data) {
//         if (err) {
//             return next();
//         } else {
//             //Returning success messages saying it was deleted
//             res.format({
//                 json: function () {
//                     res.status(200).json({
//                         "code": 200,
//                         "msg": "delete success"
//                     });
//                 }
//             });
//         }
//     });
// });
//
// /**
//  * subscribe entity
//  */
// router.post('/:id/collect',
//     validateToken,
//     requireAuth, function (req, res) {
//         var item = req.entity;
//         var user = req.user;
//         var conditions = {};
//         conditions.userId = user._id;
//         conditions.wxOrgId = item._id;
//         User2WxOrg.findOne(conditions, function (err, entity) {
//             if (err) {
//                 return next();
//             }
//             var data = {};
//             if (entity) {
//                 res.format({
//                     json: function () {
//                         res.json({
//                             status: 200,
//                             data: entity
//                         });
//                     }
//                 });
//             } else {
//                 data.userId = user._id;
//                 data.wxOrgId = item._id;
//                 data.userAvatar = user.avatar;
//                 data.wxOrgName = item.name;
//                 data.updateAt = new Date().getTime();
//                 User2WxOrg.create(data, function (err, entity) {
//                     if (err) {
//                         console.log(err);
//                         res.status(500).json(
//                             {
//                                 status: 500,
//                                 message: err.message
//                             }
//                         );
//                     } else {
//                         res.format({
//                             json: function () {
//                                 res.json({
//                                     status: 200,
//                                     data: entity
//                                 });
//                             }
//                         });
//                     }
//                 })
//             }
//         })
//     });
//
// /**
//  * undelete entity
//  */
// router.post('/:id/uncollect',
//     validateToken,
//     requireAuth, function (req, res) {
//         var entity = req.entity;
//         var user = req.user;
//         var conditions = {};
//         conditions.userId = user._id;
//         conditions.wxOrgId = entity._id;
//         User2WxOrg.findOne(conditions, function (err, entity) {
//             if (err) {
//                 res.status(500).json(
//                     {
//                         status: 500,
//                         message: err.message
//                     }
//                 );
//                 return;
//             }
//             var data = {};
//             if (entity) {
//                 entity.remove(function (err, data) {
//                     if (err) {
//                         return next();
//                     } else {
//                         //Returning success messages saying it was deleted
//                         res.format({
//                             json: function () {
//                                 res.status(200).json({
//                                     "code": 200,
//                                     "msg": "delete success"
//                                 });
//                             }
//                         });
//                     }
//                 });
//             } else {
//                 res.status(404).json(
//                     {
//                         status: 404,
//                         message: "没有找到该记录"
//                     }
//                 );
//                 return;
//             }
//         });
//     });


module.exports = router;
