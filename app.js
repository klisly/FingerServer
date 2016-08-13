var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var compression = require('compression')
var pkg = require('./package.json');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require("fs");
var FileStreamRotator = require('file-stream-rotator')
var jwt = require('jwt-simple');

var secondDB = require("./model/second_db");
var splash = require("./model/splash");
var topic = require("./model/topic");
var site = require("./model/site");
var user2topic = require("./model/user2topic");
var article = require("./model/article");
var author = require("./model/user");
var user2site = require("./model/user2site");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var logDirectory = __dirname + "/log";
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
var accessLogStream = FileStreamRotator.getStream({
    date_format: 'YYYYMMDD',
    filename: logDirectory + '/access-%DATE%.log',
    frequency: 'daily',
    verbose: false
})
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'})
app.use(compression())
app.use(logger('combined', {stream: accessLogStream}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var indexs = require('./routes/index');
var apiSplashes = require("./routes/splashes");
var apiTopics = require("./routes/topics");
var apiSites = require("./routes/sites");

var apiArticles = require("./routes/articles");
var apiUsers = require("./routes/users");

app.use('/', indexs);
app.use("/splashes", apiSplashes);
app.use("/topics", apiTopics);
app.use("/sites", apiSites);
app.use("/articles", apiArticles);
app.use("/users", apiUsers);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: {}
    });
});


module.exports = app;
