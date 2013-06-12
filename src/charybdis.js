module.exports = function () {
    var Q = require('q');
    var fsQ = require("q-io/fs");
    var webPageToImage = require("./phantomjs/webPageToImage");
    var temp = require("temp");
    var imagemagick = require('./imagemagick/imagemagick');
    var pngIO = require('./pngIO');

    var scylla;


    var saveNewReportResult = function saveNewReportResult(report, imageFile) {
        //console.log("Saving result for file: ", imageFile);
        var fullImage;
        var thumbFile = temp.path({suffix: '.png'});
        var thumb;
        return pngIO.readPng(imageFile)
            .then(function (imageString) {
                fullImage = imageString;
                return imagemagick.makeThumbnail(imageFile, thumbFile, 120)
            })
            .then(function () {
                return pngIO.readPng(thumbFile);
            })
            .then(function (thumbString) {
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


    /**
     * Compares two base64 images.
     * @param imageA
     * @param imageB
     * @return {Promise} for
     *      Success: {image:String (Base64), distortion:Number}
     *      Failure: {message:}
     */
    var diffTwoBase64Images = function diffTwoBase64Images(imageA, imageB) {

        var masterFile = temp.path({suffix: '.png'});
        var newFile = temp.path({suffix: '.png'});
        var diffFile = temp.path({suffix: '.png'});

        return Q.all([
                pngIO.writePng(masterFile, imageA),
                pngIO.writePng(newFile, imageB)
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
            .fin(function (passthrough) {
                return Q.allResolved([
                        fsQ.remove(masterFile),
                        fsQ.remove(newFile),
                        fsQ.remove(diffFile)
                    ])
                    .then(function () {
                        return passthrough
                    })
            });
    };

    var processReport = function (reportId) {
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
                            return diffTwoBase64Images(report.masterResult.result, currentResult.result)
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
                            error            : {messages: ["No Master Result defined."]},
                            image            : undefined
                        })
                    })
                    .then(function (diff) {
                        return {
                            report: report,
                            result: currentResult,
                            diff  : diff
                        }
                    })
                    .fin(function (passthrough) {
                        return fsQ.remove(webPageRenderPath)
                            .then(function () {
                                return passthrough
                            });
                    })

            })
    };
    var diffTwoUrls = function(urlA, urlB) {
        var fileA = temp.path({suffix: '.png'});
        var fileB = temp.path({suffix: '.png'});
        var diffFile = temp.path({suffix: '.png'});
        return Q.all([
            webPageToImage(urlA, fileA),
            webPageToImage(urlB, fileB)
        ]).then(function(results){
                return imagemagick.compare(fileA, fileB, diffFile)
                    .then(function(info){
                        console.log(info);
                        var distortion = parseFloat(info.comparison.properties["Channel distortion"].all.split(" ")[0])
                        console.log("Distortion:" + distortion);
                        return pngIO.readPng(diffFile)
                            .then(function (imageString) {
                                return {
                                    image     : imageString,
                                    distortion: distortion
                                };

                            })
                    })
            })

    }

    var compareTwoUrls = function(urlA, urlB) {
        if (!urlA) {
            console.fatal("Url A is required");
            throw "Url A is required";
        }
        if (!urlB) {
            console.fatal("Url B is required");
            throw "Url B is required";
        }
        console.log("Comparing Urls: " + urlA + " / " + urlB);
        return diffTwoUrls(urlA, urlB)
            .then()
    };

    var executeABCompare = function(host, port, compareId) {
        if (!host) {
            console.fatal("Host is required");
            throw "Host is required";
        }
        if (!port) {
            console.fatal("Port is required");
            throw "Port is required";
        }
        scylla = require('./services/scylla-json')(host, port);
        console.log("Charybdis setup against server: http://" + host + ":" + port);

        console.log("Executing with Compare: " + compareId);
    }

    /**
     * Retrieves and executes a batch of reports from a Scylla Webserver.
     * @param host Scylla Host
     * @param port Scylla Port
     * @param batchId Scylla Batch Id
     * @return {*}
     */
    var executeOnBatch = function (host, port, batchId) {
        if (!host) {
            console.fatal("Host is required");
            throw "Host is required";
        }
        if (!port) {
            console.fatal("Port is required");
            throw "Port is required";
        }
        scylla = require('./services/scylla-json')(host, port);
        console.log("Charybdis setup against server: http://" + host + ":" + port);

        /**
         * Retrieve a list of urls we're to screenshot
         */
        if (!batchId || typeof batchId !== "string" && batchId.length == 0) {
            var d = Q.defer();
            d.reject(new Error("Batch ID is required"));
            return d.promise;
        };
        console.log("Executing with Batch: " + batchId);

        return scylla.getBatch(batchId)
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
                                if (result.diff.distortion == 0)
                                    batchResult.pass++;
                                else if (result.diff.distortion == -1)
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
                        return scylla.newBatchResult(batch._id, batchResult)
                            .then(function (batchResult) {
                                /** ATTENTION **/
                                /* This is the final return for Charybdis */
                                return {
                                    batch      : batch,
                                    batchResult: batchResult
                                }
                            });
                    });
            }, function (error) {
                console.log("Error: ", error);
                throw error;
            });


    };

    return {
        executeOnBatch: executeOnBatch,
        compareTwoUrls: compareTwoUrls,
        executeABCompare:executeABCompare
    };
}




