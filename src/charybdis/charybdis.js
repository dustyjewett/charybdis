module.exports = function (webPageToImage, imagemagick, pngIO, scyllaService) {
    'use strict';
    var Q = require('q');
    var Qe = require('../qExtension/qExtension');
    var fsQ = require("q-io/fs");
    var temp = require("temp");

    var util = require("util");

    var scylla;

    var tmpOpts = {
        reportThumb:{
            prefix: 'charybdis-rt-',
            suffix: '.png'
        },
        diffmaster:{
            prefix: 'charybdis-dm-',
            suffix: '.png'
        },
        diffnew:{
            prefix: 'charybdis-dn-',
            suffix: '.png'
        },
        diffdiff:{
            prefix: 'charybdis-dd-',
            suffix: '.png'
        },
        reportRender:{
            prefix: 'charybdis-rr-',
            suffix: '.png'
        },
        thumbString:{
            prefix: 'charybdis-ts-',
            suffix: '.png'
        },
        compareA:{
            prefix: 'charybdis-ca-',
            suffix: '.png'
        },
        compareB:{
            prefix: 'charybdis-cb-',
            suffix: '.png'
        },
        compareC:{
            prefix: 'charybdis-cc-',
            suffix: '.png'
        }
    };

    var saveNewReportResult = function saveNewReportResult(report, imageFile) {
        //console.log("Saving result for file: ", imageFile);
        var fullImage;
        var thumbFile = temp.path(tmpOpts.reportThumb);
        var thumb;
        return pngIO.readPng(imageFile)
            .then(function (imageString) {
                fullImage = imageString;
                return imagemagick.makeThumbnail(imageFile, thumbFile, 120);
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
                console.log("During Report: " + report + " Unable to open file: ", error);
                throw new Error(error);
            })
            .then(function (passthrough) {
                return fsQ.remove(thumbFile)
                    .then(function () {
                        return passthrough;
                    });
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

        var masterFile = temp.path(tmpOpts.diffmaster);
        var newFile = temp.path(tmpOpts.diffnew);
        var diffFile = temp.path(tmpOpts.diffdiff);

        return Q.all([
                pngIO.writePng(masterFile, imageA),
                pngIO.writePng(newFile, imageB)
            ])
            .then(function () {
                return imagemagick.compare(masterFile, newFile, diffFile);
            })
            .then(function (info) {
                var distortion = info.distortion;
                //parseFloat(info.comparison.properties["Channel distortion"].all.split(" ")[0])
                return pngIO.readPng(diffFile)
                    .then(function (imageString) {
                        return {
                            image     : imageString,
                            distortion: distortion
                        };

                    });
            })
            .fin(function (passthrough) {
                return Q.all([
                        fsQ.remove(masterFile),
                        fsQ.remove(newFile),
                        fsQ.remove(diffFile)
                    ])
                    .then(function () {
                        return passthrough;
                    });
            });
    };

    var renderAndSaveNewReportResult = function renderAndSaveNewReportResult(report) {
        console.log("Retrieved: " + report._id);
        var webPageRenderPath = temp.path(tmpOpts.reportRender);

        return webPageToImage(report.url, webPageRenderPath, report.width, report.height)
            .then(function (message) {
                report.message = message;
                return saveNewReportResult(report, webPageRenderPath)
                    .then(function (passthrough) {
                        return fsQ.remove(webPageRenderPath)
                            .then(function () {
                                return passthrough;
                            });
                    });
            }, function(error){
                console.error('Error capturing screenshot', util.inspect(error));
                var result = {
                    report   : report,
                    timestamp: new Date().toISOString(),
                    "result" : "",
                    thumb    : ""
                };
                return scylla.newReportResult(report._id, result);
            });
    };

    var processReport = function (reportId) {
        var currentReport;
        var currentMaster;
        var currentResult;
        return scylla.getReport(reportId)
            .then(function (report) {
                currentReport = report;
                return scylla.getMaster(reportId)
                    .then(function(theMaster){
                        console.log("Retrieved Master Image");
                        currentMaster = theMaster;
                        return currentReport;
                    })
                    .then(renderAndSaveNewReportResult);
            })
            .then(function (newResult) {
                currentResult = newResult;
                if (currentReport.masterResult) {
                    return diffTwoBase64Images(currentMaster, currentResult.result)
                        .then(function (diff) {
                            return scylla.newResultDiff({
                                report           : currentReport,
                                reportResultA    : currentReport.masterResult,
                                reportResultAName: currentReport.masterResult.timestamp,
                                reportResultB    : currentResult,
                                reportResultBName: currentResult.timestamp,
                                distortion       : diff.distortion,
                                image            : diff.image
                            });
                        }, function (error) {
                            console.log("Report Result Diff Exception: ", require('util').inspect(error));
                            return scylla.newResultDiff({
                                report           : currentReport,
                                reportResultA    : currentReport.masterResult,
                                reportResultAName: currentReport.masterResult.timestamp,
                                reportResultB    : currentResult,
                                reportResultBName: currentResult.timestamp,
                                distortion       : -1,
                                error            : error,
                                image            : undefined
                            });
                        });
                }
                console.log("No Master Result defined for: ", currentReport.name);
                return scylla.newResultDiff({
                    report           : currentReport,
                    reportResultA    : undefined,
                    reportResultAName: undefined,
                    reportResultB    : undefined,
                    reportResultBName: undefined,
                    distortion       : -1,
                    error            : {messages: ["No Master Result defined."]},
                    image            : undefined
                });
            })
            .then(function (diff) {
                return {
                    report    : currentReport,
                    result    : currentResult,
                    resultDiff: diff
                };
            }, function(error){
                console.error("Error Saving Result:", util.inspect(error));
                console.error(error.stack);
                return {
                    report:reportId,
                    result:error.result,
                    resultDiff:{
                        distortion:-1,
                        error:{
                            messages:[error.message]
                        }
                    }
                };
            });

    };

    var getThumbnailString = function (filename) {
        var fileThumb = temp.path(tmpOpts.thumbString);
        return imagemagick.makeThumbnail(filename, fileThumb, 120)
            .then(function () {
                return pngIO.readPng(fileThumb);
            })
            .then(function(fileString){
                return fsQ.remove(fileThumb) // Cleanup
                .then(function(){
                   return fileString;
                });
            });
    };

    /**
     * Returns a promise for a thumbnail
     * @param filename - File to be opened
     * @param size - square size, defaults to 120
     * @returns {Promise} - Binary file contents of the thumbnail
     */
    var getThumbnail = function(filename, size){
        size = size || 120;
        var fileThumb = temp.path(tmpOpts.thumbString + size);
        return imagemagick.makeThumbnail(filename, fileThumb, size)
            .then(function () {
                return fsQ.read(filename, "b");
            })
            .then(function(fileContents){
                return fsQ.remove(fileThumb) // Cleanup
                    .then(function(){
                        return fileContents;
                    });
            });
    };


    /**
     * Diffs two URLS using the specified width and height.
     *
     * @param urlA
     * @param urlB
     * @param width
     * @param height
     * @returns {Promise} result of the diff:
     *                      {
     *                          snapA: Snapshot representing Url A
     *                          snapB: Snapshot representing Url B
     *                          diff: Binary file contents of the diff between images
     *                      }
     */
    var diffTwoUrls = function (urlA, urlB, width, height) {
        return Q.all([
                webPageToSnapshot(urlA, width, height),
                webPageToSnapshot(urlB, width, height)
            ])
            .spread(function (snapA, snapB) {
                console.log("Snapshots Created");
                return diffTwoSnapshots(snapA, snapB)
                    .then(function(diff){
                        return {
                            diff:diff,
                            snapA:snapA,
                            snapB:snapB
                        };
                    });
            });
    };


    /**
     * Screen capture a URL and return a bunch of info about it.
     *
     * @param url
     * @param width
     * @param height
     * @returns {Promise}
     */
    var webPageToSnapshot = function webPageToSnapshot(url, width, height){
        var file = temp.path(tmpOpts.compareA);
        return webPageToImage(url, file, width, height)
            .then(function(output){
                console.log("Image Rendered for URL: " + url);
                return fsQ.read(file, "b")
                    .then(function(contents){
                        return {
                            console:output.console,
                            message:output.message,
                            state:"Captured",
                            image:{
                                contents:contents
                            }
                        };

                    });
            })
            .fin(cleanupFiles(file));
    };

    /**
     * Given two screenshots, diff the two and return the result.
     * @param snapshotA
     * @param snapshotB
     * @returns {*}
     */
    var diffTwoSnapshots = function(snapshotA, snapshotB){
        console.log("Comparing Snapshots");
        var fileA = temp.path(tmpOpts.compareA);
        var fileB = temp.path(tmpOpts.compareB);
        var diffFile = temp.path(tmpOpts.compareC);

        return Q.all([
                fsQ.write(fileA, snapshotA.image.contents),
                fsQ.write(fileB, snapshotB.image.contents)
            ]).then(function(){
                return imagemagick.compare(fileA, fileB, diffFile)
                .then(function (info) {
                    console.log("Diff Generated");
                    //console.log(info);
                    //console.log("Pixel Diff:" + info.comparison.properties["Channel distortion"].all.split(" ")[0]);
                    //console.log("Total Diff:" + info.distortion);
                    var result = {};
                    result.distortion = info.distortion;
                    result.warning = info.warning;
                    result.timestamp = new Date().toISOString();
                    return fsQ.read(diffFile, "b")
                        .then(function (diff) {
                            result.image = {contents:diff};
                            return result;
                        });
                });

            })
            .fin(cleanupFiles(diffFile));

    };

    var cleanupFiles = function(fileNames){
        if(!Array.isArray(fileNames)){
            fileNames = [fileNames];
        }
        return function(){
            return Q.allSettled(
                    fileNames.map(function(fileName){ fsQ.remove(fileName);})
                );
        };
    };

    var compareTwoUrls = function (urlA, urlB, returnImages, width, height) {
        if (!urlA) {
            console.fatal("Url A is required");
            throw "Url A is required";
        }
        if (!urlB) {
            console.fatal("Url B is required");
            throw "Url B is required";
        }
        console.log("Comparing Urls: " + urlA + " / " + urlB);
        return diffTwoUrls(urlA, urlB, width, height)
            .then(function(result){
                console.log("The Result: ", require('util').inspect(result));
            })
            .fail(function(error){
                console.log("Got Error: ", require('util').inspect(error));
            });
    };

    var executeABCompare = function (host, port, compareId) {
        if (!host) {
            console.fatal("Host is required");
            throw "Host is required";
        }
        if (!port) {
            console.fatal("Port is required");
            throw "Port is required";
        }
        scylla = scyllaService(host, port);
        console.log("Charybdis setup against server: http://" + host + ":" + port);

        if (!compareId || typeof compareId !== "string" && compareId.length === 0) {
            var d = Q.defer();
            d.reject(new Error("AbCompare ID is required"));
            return d.promise;
        }

        console.log("Executing with Compare: " + compareId);

        return scylla.getCompare(compareId)
            .then(function (abCompare) {
                return compareTwoUrls(abCompare.urlA, abCompare.urlB, true, abCompare.width, abCompare.height)
                    .then(function (compareResults) {
                        //console.log("Compare Results:\n", compareResults);
                        return scylla.newCompareResult(compareId, compareResults)
                            .then(function (abCompareResults) {
                                return {
                                    abCompare      : abCompare,
                                    abCompareResult: abCompareResults
                                };
                            });
                    });
            });
    };

    var validateInputs = function validateInputs(host, port, id){
        if (!host) {
            console.error("Host is required");
            throw "Host is required";
        }
        if (!port) {
            console.error("Port is required");
            throw "Port is required";
        }
        scylla = scyllaService(host, port);
        console.log("Charybdis setup against server: http://" + host + ":" + port);

        if (!id || typeof id !== "string" && id.length === 0) {
            console.error("ID is required");
            throw "ID is required";
        }

    };

    var executeOnReport = function (host, port, reportId) {
        validateInputs(host, port, reportId);
        console.log("Executing with Report: " + reportId);
        return processReport(reportId);
    };

    var captureReportSnapshot = function (host, port, reportId) {
        validateInputs(host, port, reportId);
        console.log("Executing with Report: " + reportId);
        return scylla.getReport(reportId)
            .then(function (report) {
                return renderAndSaveNewReportResult(report);
            });
    };

    /**
     * Retrieves and executes a batch of reports from a Scylla Webserver.
     * @param host Scylla Host
     * @param port Scylla Port
     * @param batchId Scylla Batch Id
     * @return {*}
     */
    var executeOnBatch = function (host, port, batchId) {
        validateInputs(host, port, batchId);
        console.log("Executing with Batch: " + batchId);

        /**
         * Retrieve a list of urls we're to screenshot
         */
        return scylla.getBatch(batchId)
            .then(function (batch) {
                var list = batch.reports;
                //console.log("Processing Reports: ", list);
                var batchResult = {
                    batch                : batch,
                    pass                 : 0,
                    fail                 : 0,
                    exception            : 0,
                    start                : new Date().toISOString(),
                    end                  : "",
                    reportResultSummaries: {}
                };

                var captureQueuePromise =
                    Qe.eachItemIn(list)
                        .aggregateThisPromise(function(value){
                            console.log("Processing Report: " + value);
                            return processReport(value)
                                    .then(function (result) {
                                        console.log("Setting Result Summary");
                                        //console.log(util.inspect(result));
                                        if (result.resultDiff.distortion === 0){
                                            batchResult.pass++;
                                        }else if (result.resultDiff.distortion === -1){
                                            batchResult.exception++;
                                        }else{
                                            batchResult.fail++;
                                        }
                                        var reportSummary = {
                                            resultDiffId: result.resultDiff._id,
                                            distortion  : result.resultDiff.distortion,
                                            error       : (result.resultDiff.distortion === -1) ? result.resultDiff.error : undefined,
                                            name        : result.report.name
                                        };
                                        batchResult.reportResultSummaries[result.result._id] = reportSummary;
                                        return reportSummary;
                                    });
                        });
                return Q.when(captureQueuePromise)
                    .then(function () {
                        batchResult.end = new Date().toISOString();
                        console.log("Batch Processing finished at: " + batchResult.end);
                        return scylla.newBatchResult(batch._id, batchResult)
                            .then(function (batchResult) {
                                console.log("Saved batch result: " + batchResult._id);
                                /** ATTENTION **/
                                /* This is the final return for Charybdis */
                                return {
                                    batch      : batch,
                                    batchResult: batchResult
                                };
                            });
                    });
            }, function (error) {
                console.log("Error: ", error);
                throw error;
            });


    };

    return {
        executeOnReport       : executeOnReport,
        captureReportSnapshot : captureReportSnapshot,
        executeOnBatch        : executeOnBatch,
        compareTwoUrls        : compareTwoUrls,
        diffTwoSnapshots      : diffTwoSnapshots,
        webPageToSnapshot     : webPageToSnapshot,
        executeABCompare      : executeABCompare
    };
};




