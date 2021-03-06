'use strict'

// dependencies
var path     = require('path'),
    request  = require('request'),
    stream   = require('stream'),
    util     = require('util'),
    Writable = stream.Writable;

// function to get all containers
function GetAllContainers(host, func) {
    request({
        json:   true,
        method: 'GET',
        uri:    host + '/containers/json?all=1'
    }, function (err, resp, body) {
        var containers = [];

        if (err) {
            return func(err, containers);
        }
    
        if (resp.statusCode != 200) {
            i// cli.debug("Server response:", resp);
            return func(new Error("Status from server was: " + resp.statusCode), containers);
        }
        
        if (body.length <= 0) {
            return func(new Error("You have no containers currently.", containers))
        }
        
        var containers
        body.forEach(function(el) {
            containers.push(el.Id);
        });

        return func(err, containers);
    });
};

function StatsStream(el, line, screen, options) {
    // allow use without new operator
    if (!(this instanceof StatsStream)) {
        return new StatsStream(el, options);
    }

    Writable.call(this, options);
    this.el     = el;
    this.line   = line;
    this.screen = screen;
    this.x      = [];
    this.y      = [];
};
util.inherits(StatsStream, Writable);
StatsStream.prototype._write = function (chunk, enc, cb) {
        chunk = chunk.toString();
        try {
            chunk = JSON.parse(chunk);
        } catch (e) {
            console.log(chunk, "is not JSON");
            return cb();
        }

        if (this.x.length > 10) {
            this.x.shift();
        }

        if (this.y.length > 10) {
            this.y.shift();
        }

        // append the chunk values
        var now = new Date();
        this.x.push(now.getUTCHours() + ':' + now.getUTCMinutes() + ':' + now.getUTCSeconds() + ':' + now.getUTCMilliseconds());
        this.y.push(chunk.cpu_stats.cpu_usage.total_usage);

        // set the data
        this.line.setData(this.x, this.y);
        // render
        this.screen.render();

        return cb();
};

function GetStats(host, el, line, screen) {
    var sstream = new StatsStream(el, line, screen);
    
    sstream.on('finish', function () {
        console.log('finished writing for', el);
    });

    request({
        json:   true,
        method: 'GET',
        uri:    host + '/containers/' + el + '/stats'
    }).pipe(sstream);  
};

exports.GetAllContainers = GetAllContainers;
exports.GetStats         = GetStats;
