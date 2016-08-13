var express = require('express');
var mongoose = require('mongoose');
var secondDB = require("../model/seconddb");
var splash = require("../model/splash");
var channel = require("../model/topic");
var article = require("../model/article");
var fs = require('fs')

var Article = mongoose.model('Article');

console.log('data');
var count = 0;
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
        }

    });

    input.on('end', function() {
        if (remaining.length > 0) {
            func(remaining);
        }
    });
}

function func(data) {
    var entity = JSON.parse(data);
    console.log(entity.name+"_"+entity.biref+"_"+entity.avatar+"_"+entity.srcUrl);
}

var input = fs.createReadStream('../data/authors.txt');
readLines(input, func);

// insert article
//mongoose.model('Article').find({}, function (err, entities) {
//    console.log(entities.length);
//    for(var i = 0; i < entities.length; i++){
//        console.log(entities[i]._id);
//    }
//});

