module.exports = function (host, port) {
    var Q = require('q');
    var fsQ = require("q-io/fs");
    var webPageToImage = require("./webPageToImage");
    var temp = require("temp");
    var exec = require('child_process').exec;
    var imagemagick = require('./imagemagick/imagemagick');
    var pngIO = require('./pngIO');

    if (!host) {
        console.fatal("Host is required");
        throw "Host is required";
    }
    if (!port) {
        console.fatal("Port is required");
        throw "Port is required";
    }
    var scylla = require('./services/scylla-json')(host, port)
    console.log("Charybdis setup against server: http://" + host + ":" + port);


    var saveNewReportResult = function saveNewReportResult(report, imageFile) {
        //console.log("Saving result for file: ", imageFile);
        return pngIO.readPng(imageFile)
            .then(function (imageString) {
                var result = {
                    report   : report,
                    timestamp: new Date().toISOString(),
                    "result" : imageString
                };
                //console.log("Saving Report Result: ", result);
                return scylla.newReportResult(report._id, result);

            }, function (error) {
                console.log("Unable to open file: ", error);
                throw new Error(error);
            });
    };


    var diffTwoReportResults = function diffTwoReportResults(masterResult, newResult) {
        console.log("Diffing Results:", masterResult.timestamp, newResult.timestamp);
        var masterFile = temp.path({suffix: '.png'});
        var newFile = temp.path({suffix: '.png'});
        var diffFile = temp.path({suffix: '.png'});

        return Q.all([
                pngIO.writePng(masterFile, masterResult.result),
                pngIO.writePng(newFile, newResult.result)
            ])
            .then(function () {
                return imagemagick.compare(masterFile, newFile, diffFile)
            })
            .then(function (info) {
                var distortion = parseFloat(info.comparison.properties["Channel distortion"].all.split(" ")[0])
                return pngIO.readPng(diffFile)
                    .then(function (imageString) {
                        return {
                            image     : imageString,
                            distortion: distortion
                        };

                    })
            });
    };


    var execute = function (batch) {

        console.log("Executing with Batch: " + batch);


        /**
         * Retrieve a list of urls we're to screenshot
         */
        if (!batch || typeof batch !== "string" && batch.length == 0) {
            var d = Q.defer();
            d.reject(new Error("Batch ID is required"));
            return d.promise;
        }
        ;

        return scylla.getBatch(batch)
            .then(function (batch) {
                var list = batch.reports;
                console.log("Processing Reports: ", list);
                var batchResult = {
                    batch                : batch,
                    pass                 : 0,
                    fail                 : 0,
                    exception            : 0,
                    start                : new Date().toISOString(),
                    end                  : "",
                    reportResultSummaries: {}
                };
                var promises = [];
                while (list.length) {
                    var nextId = list.shift();
                    console.log("Processing Report: " + nextId);

                    promises.push(
                        scylla.getReport(nextId)
                            .then(function (next) {
                                console.log("Retrieved: " + next._id);
                                var tmpName = temp.path({suffix: '.png'});
                                var currentResult;

                                return webPageToImage(next.url, tmpName)
                                    .then(function () {
                                        return saveNewReportResult(next, tmpName);
                                    })
                                    .then(function (newResult) {
                                        currentResult = newResult;
                                        if (next.masterResult) {
                                            return diffTwoReportResults(next.masterResult, currentResult)
                                                .then(function (diff) {

                                                    batchResult[(diff.distortion == 0 ? "pass" : "fail")]++;

                                                    return scylla.newDiff({
                                                        report           : next,
                                                        reportResultA    : next.masterResult,
                                                        reportResultAName: next.masterResult.timestamp,
                                                        reportResultB    : currentResult,
                                                        reportResultBName: currentResult.timestamp,
                                                        distortion       : diff.distortion,
                                                        image            : diff.image
                                                    }).then(function (diff) {
                                                            batchResult.reportResultSummaries[currentResult._id] = {
                                                                diffId: diff._id,
                                                                diff  : diff.distortion,
                                                                name  : next.name
                                                            };
                                                        })
                                                }, function (error) {
                                                    console.log("Report Diff Exception: ", error.message);
                                                    batchResult.exception++;
                                                    return scylla.newDiff({
                                                        report           : next,
                                                        reportResultA    : next.masterResult,
                                                        reportResultAName: next.masterResult.timestamp,
                                                        reportResultB    : currentResult,
                                                        reportResultBName: currentResult.timestamp,
                                                        distortion       : -1,
                                                        image            : undefined
                                                    }).then(function (diff) {
                                                            batchResult.reportResultSummaries[currentResult._id] = {
                                                                diffId: diff._id,
                                                                error : error,
                                                                diff  : -1,
                                                                name  : next.name

                                                            }
                                                        });

                                                });
                                        }
                                        batchResult.reportResultSummaries[currentResult._id] = -1;
                                        batchResult.exception++;
                                        console.log("No Master Result defined for: ", next.name);
                                    })
                                    .then(function () {
                                        return fsQ.remove(tmpName);
                                    });
                            })
                    );

                };
                return Q.all(promises)
                    .then(function () {
                        batchResult.end = new Date().toISOString();
                        return scylla.newBatchResult(batch._id, batchResult);
                    });
            }, function (error) {
                console.log("Error: ", error);
                throw error;
            });


    };

    return {
        execute: execute
    };
}




