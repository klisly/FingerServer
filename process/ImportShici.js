var express = require('express');
var mongoose = require('mongoose');
var secondDB = require("../model/seconddb");
var splash = require("../model/splash");
var channel = require("../model/topic");
var article = require("../model/article");
var author = require("../model/user");

var fs = require('fs')

var Article = mongoose.model('Article');

var count = 0;
var errCount = 0;
function readLines(input, func) {
    var remaining = '';
    input.on('data', function(data) {
        remaining += data;
        var index = remaining.indexOf('\n');
        while (index > -1) {
            var line = remaining.substring(0, index);
            remaining = remaining.substring(index + 1);
            func(line);
            index = remaining.indexOf('\n');
            count++;
        }

    });

    input.on('end', function() {
        if (remaining.length > 0) {
            func(remaining);
        }
        console.log("count:"+count+" errCount:"+errCount);
    });
}

function func(data) {
    //public String title;
    //public String age;
    //public String author;
    //public String content;
    //public Map<String, String> info ;
    //public List<String> tags;
    //title: String,
    //author:String,
    //content:String,
    //likeNum:{ type:Number,default:0},
    //commentNum:{ type:Number,default:0},
    //readNum:{ type:Number,default:0},
    //srcUrl:String,
    //belongAuthor:String,
    //belongChannel:String,
    //;
    try {
        var tmp = JSON.parse(data);
        // insert article
        var where = {};
        where.name = tmp.author;
        mongoose.model('Author').find(where, function (err, entity) {
                if (err) {
                    console.log(err);
                } else {
                    data = {}
                    data.title = tmp.title;
                    data.age = tmp.age;
                    data.author = tmp.author;
                    data.content = tmp.content;
                    data.tags = tmp.tags;
                    data.srcUrl = tmp.srcUrl;
                    data.belongChannel = "5722500b88dd0e7a6a0c5f2f";
                    if(entity.length > 0) {
                        data.belongAuthor = entity[0]._id;
                        console.log('find a user:' + data.belongAuthor);
                    } else {
                        console.log('no such user:'+tmp.author);
                    }
                    mongoose.model('Article').create(data, function (err, entity) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('creating new article');
                        }
                    })
                }
            })
    } catch (err){
        errCount++;
    }
}

var input = fs.createReadStream('../data/shici_final.txt');
readLines(input, func);



