var request = require("request");
var mongoose = require('mongoose');
var cheerio = require('cheerio')
var Chapter = mongoose.model('Chapter');
var Novel = mongoose.model('Novel');
var User2Novel = mongoose.model('User2Novel');
var util = require("../utils/commonutils")
var _ = require("lodash")
var config = require("../config");

var maxtry = 8;
function search(name, callback) {
    var url = 'http://zhannei.baidu.com/cse/search?q=' + name;
    var count = {}
    var options = {
        method: 'GET',
        url: 'http://so.mianhuatang.la/cse/search',
        qs: {
            click: '1',
            entry: '1',
            s: '14041278195252845489',
            nsid: '',
            q: name
        },
        headers: {
            'host':"117.42.202.193",
            'port':"808",
            'postman-token': '139bd025-2543-1f5d-bd86-08dd9d67f735',
            'cache-control': 'no-cache',
            "gzip": "true",
            "User-Agent":"Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; Trident/5.0; SLCC2;.NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0"
        }
    };

    count["count_" + url] = 0;
    function requestData() {
        console.log("url:" + url + " Count:" + JSON.stringify(count))
        count["count_" + url] = count["count_" + url] + 1;
        if (parseInt(count["count_" + url]) > maxtry) {
            return;
        }
        console.log("requestData " + count["count_" + url] + " url:" + url)
        request(options, function (error, response, body) {
            if (error) {
                console.log("crawl err:" + url);
                requestData();
            } else {
                callback(null, body);
            }
        });
    }

    requestData();
}


function crawUpdates(novel, callback) {
    var pref = novel.href;
    console.log("home crawl " + novel.href);
    crawlPage(novel.href, function (err, body) {
        try {
            console.log("home done " + novel.href);
            var $ = cheerio.load(body);
            var datas = []
            //*[@id="list"]/dl/dd[89]#list > dl > dd:nth-child(6)
            var count = 1;
            $('#list > dl > dd > a').each(function (idx, element) {
                var data = {}
                data.href = pref + $(this).attr('href');
                data.title = $(this).text().trim();
                data.no = count++;
                datas.push(data)
            });
            var count = 0;
            var maxCount = 10;
            var stop = false;
            if(datas.length <= 0){

                return;
            }
            Novel.update({"_id": novel._id.toString()}, {
                "lastCheck": new Date().getTime()
            }).exec()
            datas.reverse().forEach(function (data) {
                if (stop) {
                    return;
                }

                if (count > maxCount || (novel.lastUpdate > 0 && data.title == novel.latest)) {
                    stop = true
                    return;
                }

                if (data.no == "") {
                    return;
                }
                count++;
                console.log("to crawl " + data.href);
                crawlPage(data.href, function (err, body) {
                    try {
                        console.log("crawl done " + data.href);
                        var $ = cheerio.load(body);
                        var chapter = {}
                        chapter.content = $('#content').html();
                        chapter.no = data.no;
                        chapter.title = data.title;
                        chapter.href = data.href;
                        chapter.nid = novel._id;
                        chapter.nname = novel.title;
                        chapter.author = novel.author;
                        chapter.createAt = new Date().getTime();
                        chapter.updateAt = chapter.createAt;
                        if (chapter.content.length > 500) {
                                Chapter.update({"no": chapter.no,"nid": chapter.nid}, chapter, {upsert: true})
                                .exec()
                                .then((data)=>{
                                    console.log("crawl chapter:"+JSON.stringify(chapter)+" res:"+JSON.stringify(data));
                                    return new Promise((resolve, reject)=>{
                                        Novel.update({"_id": novel._id.toString(), "no": {"$lt": parseInt(chapter.no)}}, {
                                            "latest": chapter.title,
                                            "latestno": chapter.no,
                                            "updateAt": new Date().getTime(),
                                        }).exec(function (err, resData) {
                                            if(err){
                                                reject(err)
                                            } else {
                                                resolve(resData)
                                            }
                                        })
                                    })
                                })
                                .then((data)=>{
                                    console.log("novel udpate:"+JSON.stringify(data));
                                    return new Promise((resolve, reject)=>{
                                        User2Novel.update({"nid": novel._id.toString(), "latestno": {"$lt": parseInt(chapter.no)}}, {
                                            "latestno": chapter.no,
                                            "latest": chapter.title,
                                            "updateAt": new Date().getTime(),
                                        }).exec(function (err, resData) {
                                            if(err){
                                                reject(err)
                                            } else {
                                                resolve(resData)
                                            }
                                        })
                                    })
                                })
                                .catch((err)=>{
                                    console.log("err:"+err.message);
                                })
                        }
                    } catch (e) {
                    }
                })
            })
        } catch (e) {
            console.log("e.msg:" + e.message)
        }
    })
}
//
// function getNo(title) {
//     var index = 0;
//     var no = ""
//     for (; index < title.length; index++) {
//         if (title[index] == "一") {
//             no += '1';
//         } else if (title[index] == "二" || title[index] == "两") {
//             no += '2';
//         } else if (title[index] == "三") {
//             no += '3';
//         } else if (title[index] == "四") {
//             no += '4';
//         } else if (title[index] == "五") {
//             no += '5';
//         } else if (title[index] == "六") {
//             no += '6';
//         } else if (title[index] == "七") {
//             no += '7';
//         } else if (title[index] == "八") {
//             no += '8';
//         } else if (title[index] == "九") {
//             no += '9';
//         } else if (title[index] == "零") {
//             no += getMoreNo(title, index);
//         }
//     }
//     if (title[title.length - 2] == "十") {
//         no += '0';
//     } else if (title[title.length - 2] == "百") {
//         no += '00';
//     } else if (title[title.length - 2] == "千") {
//         no += '000';
//     }
//     if (no == '') {
//         no = title.replace("第", "").replace("章", "");
//     }
//     return no;
// }
//
// function getMoreNo(title, index) {
//     if (title[index - 1] == "千" && title[index + 2] == "百") {
//         return "0";
//     } else if (title[index - 1] == "千" && title[index + 2] != "十") {
//         return "00";
//     } else {
//         return "0";
//     }
// }
function crawlPage(url, callback) {
    var count = {}

    count["count_" + url] = 0;
    function requestData() {
        var index = util.getRandomNum(0, config.ips.length);
        let host;
        let port;
        if(config.ips.length > 0 ){
            host = config.ips[index % config.ips.length][0];
            port = parseInt(config.ips[index % config.ips.length][1]);
        }
        var proxyUri = 'http://'+host+':'+port;
        var options = {
            method: 'GET',
            url: url,
            proxy:proxyUri,
            headers: {
                'postman-token': '139bd025-2543-1f5d-bd86-08dd9d67f735',
                'cache-control': 'no-cache',
                "gzip": "true",
                "User-Agent":"Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.23 Mobile Safari/537.36"
            },
        };
        if( parseInt(count["count_" + url])  == maxtry || host == undefined){
            delete options["proxy"];
        }
        console.log("options:"+JSON.stringify(options));
        count["count_" + url] = count["count_" + url] + 1;
        if (parseInt(count[" " + url]) > maxtry) {
            return;
        }
        request(options, function (error, response, body) {
            if (error) {
                console.log("crawl err:" + url + " msg:" + error.message);
                requestData();
            } else {
                callback(null, body);
            }
        });
    }

    requestData();
}

function crawProxy() {
    console.log("start crawl ips");
    crawlPage("http://api.xicidaili.com/free2016.txt", function (err, body) {
        var ips = body.split("\r\n");
        var ipArray = []
        for(var index = 0; index < ips.length; index++){
            ipArray.push(ips[index].split(":"))
        }
        config.ips = ipArray;
        console.log("ipArray:"+config.ips);
    })
}
module.exports = {
    search: search,
    crawUpdates: crawUpdates,
    crawlProxy:crawProxy
}