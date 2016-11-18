var request = require("request");
var mongoose = require('mongoose');
let cheerio = require('cheerio')
var Chapter = mongoose.model('Chapter');
var Novel = mongoose.model('Novel');
var User2Novel = mongoose.model('User2Novel');
var _ = require("lodash")
function search(name, callback) {
    var options = {
        method: 'GET',
        url: 'http://zhannei.baidu.com/cse/search',
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


function crawUpdates(novel, callback) {
    var pref = novel.href;
    crawlPage(novel.href, function (err, body) {
        try {
            console.log("home done");
            let $ = cheerio.load(body);
            var datas = []
            //*[@id="list"]/dl/dd[89]#list > dl > dd:nth-child(6)
            $('#list > dl > dd > a').each(function (idx, element) {
                var data = {}
                data.href = pref + $(this).attr('href');
                data.title = $(this).text().trim();
                if(data.title[0]=="第"){
                    data.no = getNo(data.title.split(" ")[0]);
                } else {
                    data.no = "";
                }
                datas.push(data)
            });
            var count = 0;
            var maxCount = 10;
            var stop = false;
            if (novel.lastCheck == 0) { // 首次抓取
                maxCount = 10;
                novel
            }
            var newest = datas[datas.length - 1];
            Novel.update({"_id":novel._id.toString()},{"latest":newest.title, "lastCheck":new Date().getTime()}).exec()
            User2Novel.update({"novelId":novel._id.toString()},{"lastUpdate":new Date().getTime()}).exec()

            datas.reverse().forEach(function (data) {
                if (stop) {
                    return;
                }
                if (maxCount > 0) {
                    if (count > maxCount) {
                        stop = true
                        return;
                    }
                } else if (data.title == novel.latest) {
                    stop = true;
                    return;
                }
                if(data.no == ""){
                    return;
                }
                count++;
                console.log("crawl "+data.href);
                crawlPage(data.href, function (err, body) {
                    try {
                        let $ = cheerio.load(body);
                        var chapter = {}
                        chapter.content = $('#content').html();
                        chapter.no = data.no;
                        chapter.title = data.title;
                        chapter.href = data.href;
                        chapter.nid = novel._id;
                        chapter.nname = novel.title;
                        chapter.author = novel.author;
                        createAt = new Date().getTime();
                        updateAt= createAt;
                        var entity = new Chapter(chapter)
                        entity.save()
                    } catch (e) {
                    }
                })
            })
        } catch (e) {
            console.log("e.msg:"+e.message)
        }
    })
}

function getNo(title){
    var index = 0;
    var no = ""
    for(; index < title.length; index++){
        if(title[index] == "一"){
            no+='1';
        } else if(title[index] == "二" || title[index] == "两"){
            no+='2';
        } else if(title[index] == "三"){
            no+='3';
        } else if(title[index] == "四"){
            no+='4';
        } else if(title[index] == "五"){
            no+='5';
        } else if(title[index] == "六"){
            no+='6';
        } else if(title[index] == "七"){
            no+='7';
        } else if(title[index] == "八"){
            no+='8';
        } else if(title[index] == "九"){
            no+='9';
        } else if(title[index] == "零"){
            no+=getMoreNo(title, index);
        }
    }
    if(title[title.length-2] == "十"){
        no +='0';
    } else if(title[title.length-2] == "百"){
        no +='00';
    } else if(title[title.length-2] == "千"){
        no +='000';
    }
    if(no == ''){
        no = title.replace("第", "").replace("章","");
    }
    return no;
}

function getMoreNo(title, index) {
    if(title[index-1] == "千" && title[index+2] == "百"){
        return "0";
    } else if(title[index-1] == "千" && title[index+2] != "十"){
        return "00";
    } else {
        return "0";
    }
}

function crawlPage(url, callback) {
    var options = {
        method: 'GET',
        url: url,
        headers: {
            'postman-token': '139bd025-2543-1f5d-bd86-08dd9d67f735',
            'cache-control': 'no-cache',
            "gzip": "true"
        }
    };
    var count = 0;
    var done = false;
    function requestData() {
        count++;
        if(done){
            return;
        }
        console.log("requestData " + count+ " url:"+url)
        request(options, function (error, response, body) {
            if(done){
                return;
            }
            if (error) {
                if (count > 4) {
                    clearInterval(interval);
                    callback(error, null);
                } else {
                    console.log("er:"+error.message)
                }
            } else {
                clearInterval(interval);
                callback(null, body);
                done = true;
            }
        });
    }

    var period = 6000; // 6 second
    requestData();
    var interval = setInterval(function () {
        console.log("execut get date interval")
        requestData()
    }, period);
}

module.exports = {
    search: search,
    crawUpdates: crawUpdates
}