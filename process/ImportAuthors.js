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
    //public String name;
    //public String avatar;
    //public String biref;
    //public String age;
    //public String srcUrl;
    //public Map<String,String> info;

    try {
        var entity = JSON.parse(data);
        // insert article
        mongoose.model('Author').create(entity, function (err, entity) {
                if (err) {
                    console.log(err);

                } else {
                    console.log('creating new entity');
                }
            })
    } catch (err){
        errCount++;
    }
}

var input = fs.createReadStream('../data/authors_final.txt');
readLines(input, func);



