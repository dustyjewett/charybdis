var Q = require('q');
var fsQ = require("q-io/fs");
var webPageToImage = require("./webPageToImage");
var temp = require("temp");
var request = require("request");
var exec = require('child_process').exec;


var cli = require('cli').enable('status'); //Enable 2 plugins

cli.parse({
    batch: ['b', 'Run a specific batch', 'string', 'e48c92ba73a8ab00'],
    serve: [false, 'Serve static files from PATH', 'path', './public']
});

var getBatch = function (batchId) {
    var deferred = Q.defer();
    console.log("Getting Batch: ", batchId)
    request({uri: 'http://localhost:5000/batches/' + batchId}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("Got Batch: ", body);
            deferred.resolve(JSON.parse(body));
        } else {
            console.log(error)
            deferred.reject(error)
        }
    });
    return deferred.promise;
}

var readPng = function(filename){
    return fsQ.read(filename, "b")
        .then(function(imageData) {
            return "data:image/png;base64," + imageData.toString("base64")
        });
}

var writePng = function(filename, imageString){
    var d = Q.defer();
    var fileContents = imageString.replace(/^data:image\/png;base64,/,"");
    require("fs").writeFile(filename, fileContents, "base64", function(err) {
        if(err){
            console.log(err); // writes out file without error, but it's not a valid image
            d.reject(err);
        } else {
            d.fulfill();
        }
    });
    return d.promise;
}


var saveNewReportResult = function saveNewReportResult(report, imageFile) {
    var deferred = Q.defer();
    console.log("Saving result for file: ", imageFile);
    readPng(imageFile)
        .then(function (imageString) {
            var result = {
                report   : report.id,
                timestamp: new Date().toISOString(),
                "result" : imageString
            };
            console.log("Saving Report Result: ", result);
            request({
                uri   : "http://localhost:5000/report-results",
                method: "POST",
                json  : result

            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log("Saved Report Result: ", body);
                    deferred.resolve(body);
                } else {
                    console.log("Error Posting New Result", body);
                    deferred.reject(error);
                }
            });
        }, function (error) {
            console.log("Unable to open file: ", error);
            deferred.reject(error);
        });

    console.log("Created Report Result");
    return deferred.promise;
}

var diffTwoReportResults = function diffTwoReportResults(masterResult, newResult) {
    var deferred = Q.defer();
    console.log("Diffing Results:", masterResult.timestamp, newResult.timestamp);
    var masterFile = temp.path({suffix: '.png'});
    var newFile = temp.path({suffix: '.png'});
    var diffFile = temp.path({suffix: '.png'});

    return Q.all([
            writePng(masterFile, masterResult.result),
            writePng(newFile, newResult.result)
        ])
        .then(function(){
            var execDeferred = Q.defer();
            var cmd = ["compare",
                       "-metric mae",
                       '"' + masterFile + '"',
                       '"' + newFile + '"',
                       '"' + diffFile + '"'].join(" ");
            exec(cmd, function(error, stdout, stderr){
                if(error){
                    console.log("Error: ", error);
                    execDeferred.reject(error);
                } else {
                    readPng(diffFile)
                        .then(function(imageString){
                            execDeferred.resolve({
                                image:imageString,
                                distortion:parseFloat(stderr)
                            });

                        })
                }
            });
            return execDeferred.promise
        })
        /*
        .fin(function(){
            return Q.all([fsQ.remove(masterFile), fsQ.remove(newFile), fsQ.remove(diffFile)]);
        });
        */


    return deferred.promise;
}

var saveDiff = function saveDiff(diff){
    var deferred = Q.defer();

    request({
        uri   : "http://localhost:5000/diffs",
        method: "POST",
        json  : diff

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("Saved Diff: ", body);
            deferred.resolve(body);
        } else {
            console.log("Error Posting Diff", body);
            deferred.reject(error);
        }
    });

    return deferred.promise;
}

cli.main(function (args, options) {
    var commandLine = this;
    /**
     * Retrieve a list of urls we're to screenshot
     */
    console.log(args, options);
    var getBatchPromise;
    if (options.batch && options.batch.length > 0) {
        getBatchPromise = getBatch(options.batch);
    }


    getBatchPromise.then(function (batch) {
        console.log("Processing Batch", batch);
        var list = batch.reports;
        while (list.length) {
            var nextId = list.shift();
            request({uri: "http://localhost:5000/reports/" + nextId}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var next = JSON.parse(body);
                    var tmpName = temp.path({suffix: '.png'});
                    var currentResult;

                    webPageToImage(next.url, tmpName)
                        .then(function () {
                            return saveNewReportResult(next, tmpName)
                        })
                        .then(function (newResult) {
                            currentResult = newResult;
                            if(next.masterResult){
                                return diffTwoReportResults(next.masterResult, currentResult);
                            }
                            console.log("No Master Result defined for: ", next.name);
                            return true;
                        })
                        .then(function (diff){
                            return saveDiff({
                                reportResultA:next.masterResult.id,
                                reportResultAName:next.masterResult.timestamp,
                                reportResultB:currentResult.id,
                                reportResultBName:currentResult.timestamp,
                                distortion:diff.distortion,
                                image:diff.image
                            })
                        })
                        .then(function(){
                            return fsQ.remove(tmpName);
                        })
                } else {
                    console.log(response);
                }
            })
        }
    }, function (error) {
        commandLine.error(error);
    });


});



