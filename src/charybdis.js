module.exports = function (host, port) {
    var Q = require('q');
    var fsQ = require("q-io/fs");
    var webPageToImage = require("./webPageToImage");
    var temp = require("temp");
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
        var fullImage;
        var thumbFile = temp.path({suffix: '.png'});
        var thumb;
        return pngIO.readPng(imageFile)
            .then(function(imageString){
                fullImage = imageString;
                return imagemagick.makeThumbnail(imageFile, thumbFile, 120 )
            })
            .then(function(){
                return pngIO.readPng(thumbFile);
            })
            .then(function(thumbString){
                thumb = thumbString;
            })
            .then(function () {
                var result = {
                    report   : report,
                    timestamp: new Date().toISOString(),
                    "result" : fullImage,
                    thumb    : thumb
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
            })
            .fin(function(passthrough){
                return Q.allResolved([
                        fsQ.remove(masterFile),
                        fsQ.remove(newFile),
                        fsQ.remove(diffFile)
                ])
                    .then(function(){return passthrough})
            });
    };

    var processReport = function(reportId){
        var currentResult;
        return scylla.getReport(reportId)
            .then(function (report) {
                console.log("Retrieved: " + report._id);
                var webPageRenderPath = temp.path({suffix: '.png'});

                return webPageToImage(report.url, webPageRenderPath)
                    .then(function () {
                        return saveNewReportResult(report, webPageRenderPath);
                    })
                    .then(function (newResult) {
                        currentResult = newResult;
                        if (report.masterResult) {
                            return diffTwoReportResults(report.masterResult, currentResult)
                                .then(function (diff) {
                                    return scylla.newDiff({
                                        report           : report,
                                        reportResultA    : report.masterResult,
                                        reportResultAName: report.masterResult.timestamp,
                                        reportResultB    : currentResult,
                                        reportResultBName: currentResult.timestamp,
                                        distortion       : diff.distortion,
                                        image            : diff.image
                                    })
                                }, function (error) {
                                    console.log("Report Diff Exception: ", error.messages);
                                    return scylla.newDiff({
                                        report           : report,
                                        reportResultA    : report.masterResult,
                                        reportResultAName: report.masterResult.timestamp,
                                        reportResultB    : currentResult,
                                        reportResultBName: currentResult.timestamp,
                                        distortion       : -1,
                                        error            : error,
                                        image            : undefined
                                    })
                                });
                        }
                        console.log("No Master Result defined for: ", report.name);
                        return scylla.newDiff({
                            report           : report,
                            reportResultA    : undefined,
                            reportResultAName: undefined,
                            reportResultB    : undefined,
                            reportResultBName: undefined,
                            distortion       : -1,
                            error            : {messages:["No Master Result defined."]},
                            image            : undefined
                        })
                    })
                    .then(function(diff){
                        return {
                            report:report,
                            result:currentResult,
                            diff:diff
                        }
                    })
                    .fin(function (passthrough) {
                        return fsQ.remove(webPageRenderPath)
                            .then(function(){ return passthrough});
                    })

            })
    }

    var execute = function (batch) {

        console.log("Executing with Batch: " + batch);


        /**
         * Retrieve a list of urls we're to screenshot
         */
        if (!batch || typeof batch !== "string" && batch.length == 0) {
            var d = Q.defer();
            d.reject(new Error("Batch ID is required"));
            return d.promise;
        };

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
                        processReport(nextId)
                            .then(function (result) {
                                console.log("Setting Result Summary");
                                if(result.diff.distortion == 0)
                                    batchResult.pass++
                                else if(result.diff.distortion == -1)
                                    batchResult.exception++;
                                else
                                    batchResult.fail++;
                                batchResult.reportResultSummaries[result.result._id] = {
                                    diffId: result.diff._id,
                                    diff  : result.diff.distortion,
                                    error : (result.diff.distortion == -1) ? result.diff.error : undefined,
                                    name  : result.report.name
                                };
                            })
                    );

                };
                return Q.all(promises)
                    .then(function () {
                        batchResult.end = new Date().toISOString();
                        console.log("Batch Processing finished at: " + batchResult.end);
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




