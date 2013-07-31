
var sinon = require('sinon');
var expect = require('chai').expect;

var Q = require('q');

var webPageToImage = require('../../../src/phantomjs/webPageToImage');
var http = require("http");

describe('webPageToImage', function(){
    describe('api', function(){

        it('exports a function', function(){
            expect(webPageToImage).to.be.a('function');
        });


    });
    describe('happy path', function(){

        var server;
        var serverPort;
        describe('200 OK', function(){
            before(function(){
                server = http.createServer(function(request,response){
                    response.writeHead(200, {"Content-Type":"text/html"});
                    response.write("<!doctype html><body bgcolor='#FF0000'></body>");
                    response.end();
                });
                serverPort = Math.round((Math.random() * 50000) + 10000);
                server.listen(serverPort)
            });
            after(function(){
                server.close();
            });
            it('renders a file', function(done){
                var tmp = "/tmp/testHappyPath.png";
                webPageToImage("http://localhost:" + serverPort + "/", tmp)
                    .then(function(stdout){
                        done();
                    }, function(err){
                        throw new Error();
                    })

            });
        });

        describe('3xx Redirect', function(){
            before(function(){
                server = http.createServer(function(request,response){
                    if(request.url.indexOf('redirect') === -1){
                        response.writeHead(301, {"Location":"/redirect"});
                        response.end();
                    } else {
                        response.writeHead(200, {"Content-Type":"text/html"});
                        response.write("<!doctype html><body bgcolor='#FF0000'></body>");
                        response.end();
                    }
                });
                serverPort = Math.round((Math.random() * 50000) + 10000);
                server.listen(serverPort)
            });
            after(function(){
                server.close();
            });
            it('renders a file', function(done){
                var tmp = "/tmp/testHappyPath.png";
                webPageToImage("http://localhost:" + serverPort + "/", tmp)
                    .then(function(stdout){
                        done();
                    }, function(err){
                        throw new Error();
                    })

            });
        })

    });

    describe('not-happy path', function(){
        var server;
        var serverPort;
        describe('404', function(){
            before(function(){
                server = http.createServer(function(request,response){
                    response.writeHead(404, {"Content-Type":"text/html"});
                    response.end();
                });
                serverPort = Math.round((Math.random() * 50000) + 10000);
                server.listen(serverPort)
            });
            after(function(){
                server.close();
            });
            it('handles 404 errors', function(done){
                var tmp = "/tmp/testHappyPath.png";
                webPageToImage("http://localhost:" + serverPort + "/", tmp)
                    .then(function(stdout){
                        done(new Error("Should not have resolved the promise"));
                    }, function(err){
                        done();
                    })

            });
        });

        describe('500', function(){
            before(function(){
                server = http.createServer(function(request,response){
                    response.writeHead(500, {"Content-Type":"text/html"});
                    response.write("<!doctype html><body bgcolor='#FF0000'>Error!</body>");
                    response.end();
                });
                serverPort = Math.round((Math.random() * 50000) + 10000);
                server.listen(serverPort)
            });
            after(function(){
                server.close();
            });
            it('handles 500 errors', function(done){
                var tmp = "/tmp/testHappyPath.png";
                webPageToImage("http://localhost:" + serverPort + "/", tmp)
                    .then(function(stdout){
                        done(new Error("Should not have resolved the promise"));
                    }, function(err){
                        done();
                    })

            });
        });
    });

    /*
    describe('compare', function(){

        it('finds a diff in two files', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileA.png",
                    "test/unit/imagemagick/resources/fileB.png",
                    "test/unit/imagemagick/resources/output.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all, "all").to.equal('4541.48 (0.0692985)')
                });

        });
        it('finds a diff in two files of differing sizes', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileD.png",
                    "test/unit/imagemagick/resources/fileE.png",
                    "test/unit/imagemagick/resources/output2.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all, "all").to.equal('7211.05 (0.110034)')
                });

        });
        it('finds no diff when comparing exact duplicate', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileA.png",
                    "test/unit/imagemagick/resources/fileA.png",
                    "test/unit/imagemagick/resources/output3.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all, "all").to.equal('0 (0)')
                });

        });

    });
    */
});