var request = require("request");
var mongoose = require('mongoose');
var cheerio = require('cheerio')
var Chapter = mongoose.model('Chapter');
var Novel = mongoose.model('Novel');
var User2Novel = mongoose.model('User2Novel');
var _ = require("lodash")
var maxtry = 3;
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
            Novel.update({"_id": novel._id.toString()}, {
                "lastCheck": new Date().getTime()
            }).exec()
            datas.reverse().forEach(function (data) {
                if (stop) {
                    return;
                }

                if (count > maxCount || data.title == novel.latest) {
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
                            Chapter.update({
                                "no": chapter.no,
                                "nid": chapter.nid
                            }, chapter, {upsert: true}).exec(function (err, resData) {
                                if (!resData) {
                                    console.log("insert a new chapter for " + chapter.nid + " into db");
                                }
                            })

                            Novel.update({"_id": novel._id.toString(), "no": {"$lt": chapter.no}}, {
                                "latest": chapter.title,
                                "latestno": chapter.no,
                                "updateAt": new Date().getTime(),
                            }).exec()

                            User2Novel.update({"nid": novel._id.toString(), "latestno": {"$lt": chapter.no}}, {
                                "latestno": chapter.no,
                                "latest": chapter.title,
                                "updateAt": new Date().getTime(),
                            }).exec()
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

function getNo(title) {
    var index = 0;
    var no = ""
    for (; index < title.length; index++) {
        if (title[index] == "一") {
            no += '1';
        } else if (title[index] == "二" || title[index] == "两") {
            no += '2';
        } else if (title[index] == "三") {
            no += '3';
        } else if (title[index] == "四") {
            no += '4';
        } else if (title[index] == "五") {
            no += '5';
        } else if (title[index] == "六") {
            no += '6';
        } else if (title[index] == "七") {
            no += '7';
        } else if (title[index] == "八") {
            no += '8';
        } else if (title[index] == "九") {
            no += '9';
        } else if (title[index] == "零") {
            no += getMoreNo(title, index);
        }
    }
    if (title[title.length - 2] == "十") {
        no += '0';
    } else if (title[title.length - 2] == "百") {
        no += '00';
    } else if (title[title.length - 2] == "千") {
        no += '000';
    }
    if (no == '') {
        no = title.replace("第", "").replace("章", "");
    }
    return no;
}

function getMoreNo(title, index) {
    if (title[index - 1] == "千" && title[index + 2] == "百") {
        return "0";
    } else if (title[index - 1] == "千" && title[index + 2] != "十") {
        return "00";
    } else {
        return "0";
    }
}
function crawlPage(url, callback) {
    var count = {}
    var options = {
        method: 'GET',
        url: url,
        headers: {
            'postman-token': '139bd025-2543-1f5d-bd86-08dd9d67f735',
            'cache-control': 'no-cache',
            "gzip": "true",
            "User-Agent":"Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; Trident/5.0; SLCC2;.NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0"
        }
    };

    count["count_" + url] = 0;
    function requestData() {
        count["count_" + url] = count["count_" + url] + 1;
        if (parseInt(count["count_" + url]) > maxtry) {
            return;
        }
        console.log("requestData " + count["count_" + url] + " url:" + url)
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

module.exports = {
    search: search,
    crawUpdates: crawUpdates
}