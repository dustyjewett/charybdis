module.exports = function(host, port){
    var Q = require('q');
    var fsQ = require("q-io/fs");
    var http = require("q-io/http");
    var webPageToImage = require("./webPageToImage");
    var temp = require("temp");
    var exec = require('child_process').exec;

    if(!host){
        console.fatal("Host is required");
        throw "Host is required";
    }
    if(!port){
        console.fatal("Port is required");
        throw "Port is required";
    }
    console.log("Charybdis setup against server: http://" + host + ":" + port);

    var newRequest = function (method, path, body) {
        return {
            host   : host,
            port   : port,
            method : method,
            path   : path,
            headers: {"Content-type": "application/json"},
            body   : (body) ? [JSON.stringify(body)] : undefined
        };
    };

    var getRequest = function (path) {
        return newRequest("GET", path);
    }

    var postRequest = function (path, body) {
        return newRequest("POST", path, body);
    }

    var getJsonObject = function (requestObject) {
        console.log("Sending Request: ", requestObject);
        return http.request(requestObject)
            .then(function (response) {
                if (response && response.status == 200) {
                    //console.log("Response Received");
                    return response.body.read()
                        .then(function (body) {
                            //console.log("Got JSON: ", body.toString());
                            return JSON.parse(body.toString());
                        });
                } else {
                    console.fatal("HTTP Error (" + requestObject.path + "): ", response);
                    throw new Error(response);
                }
            });

    };

    var getBatch = function (batchId) {
        var batchRequest = getRequest("/batches/" + batchId);
        return getJsonObject(batchRequest);
    };

    var readPng = function (filename) {
        return fsQ.read(filename, "b")
            .then(function (imageData) {
                return "data:image/png;base64," + imageData.toString("base64");
            });
    };

    var writePng = function (filename, imageString) {
        var d = Q.defer();
        var fileContents = imageString.replace(/^data:image\/png;base64,/, "");
        require("fs").writeFile(filename, fileContents, "base64", function (err) {
            if (err) {
                console.log(err); // writes out file without error, but it's not a valid image
                d.reject(err);
            } else {
                d.fulfill();
            }
        });
        return d.promise;
    };


    var saveNewReportResult = function saveNewReportResult(report, imageFile) {
        //console.log("Saving result for file: ", imageFile);
        return readPng(imageFile)
            .then(function (imageString) {
                var result = {
                    report   : report,
                    timestamp: new Date().toISOString(),
                    "result" : imageString
                };
                //console.log("Saving Report Result: ", result);
                var reportResultPost = postRequest("/reports/" + report._id + "/results/", result);

                return getJsonObject(reportResultPost);

            }, function (error) {
                console.log("Unable to open file: ", error);
                throw new Error(error);
            });
    };

    var saveNewBatchResult = function saveNewBatchResult(batchResult) {

        var batchResultPost = postRequest("/batches/" + batchResult.batch._id + "/results/", batchResult);
        return getJsonObject(batchResultPost);

    }

    var diffTwoReportResults = function diffTwoReportResults(masterResult, newResult) {
        console.log("Diffing Results:", masterResult.timestamp, newResult.timestamp);
        var masterFile = temp.path({suffix: '.png'});
        var newFile = temp.path({suffix: '.png'});
        var diffFile = temp.path({suffix: '.png'});

        return Q.all([
                writePng(masterFile, masterResult.result),
                writePng(newFile, newResult.result)
            ])
            .then(function () {
                var execDeferred = Q.defer();
                var cmd = ["compare",
                           "-metric mae",
                           '"' + masterFile + '"',
                           '"' + newFile + '"',
                           '"' + diffFile + '"'].join(" ");
                exec(cmd, function (error, stdout, stderr) {
                    if (error) {
                        debugger;
                        if(stderr.indexOf("image widths or heights differ") != -1){
                            var masterImageSizeCommand = ["identify", '"' + masterFile + '"'].join(" ");
                            var newImageSizeCommand = ["identify", '"' + newFile + '"'].join(" ");
                            exec(masterImageSizeCommand, function(error, stdout, stderr){
                                var masterResult = stdout.split(" ");
                                exec(newImageSizeCommand, function(error, stdout, stderr){
                                    var newResult = stdout.split(" ");
                                    console.log("File Size Mismatch.", masterResult[2], " --> ", newResult[2]);
                                    execDeferred.reject(new Error(JSON.stringify({
                                        message:"File Size Mismatch",
                                        masterSize:masterResult[2],
                                        currentSize:newResult[2]
                                    })));
                                });
                            });
                        } else {
                            console.log("Error: ", error);
                            execDeferred.reject(error);
                        }
                    } else {
                        readPng(diffFile)
                            .then(function (imageString) {
                                execDeferred.resolve({
                                    image     : imageString,
                                    distortion: parseFloat(stderr)
                                });

                            })
                    }
                });
                return execDeferred.promise
            },function(error){
                console.fatal("Oh Shit, Error! ", error);
            })
        /*
         .fin(function(){
         return Q.all([fsQ.remove(masterFile), fsQ.remove(newFile), fsQ.remove(diffFile)]);
         });
         */

    }

    var saveDiff = function saveDiff(diff) {

        var diffPost = postRequest("/diffs/", diff);
        return getJsonObject(diffPost);

    };

    var execute = function (batch) {

        console.log("Executing with Batch: " + batch);


        /**
         * Retrieve a list of urls we're to screenshot
         */
        var getBatchPromise;
        if (batch && typeof batch === "string" && batch.length > 0) {
            getBatchPromise = getBatch(batch);
        } else {
            var d = Q.defer();
            d.reject(new Error("Batch ID is required"));
            return d.promise;
        }

        return getBatchPromise.then(function (batch) {
            var list = batch.reports;
            console.log("Processing Reports: ", list);
            var batchResult = {
                batch        : batch,
                pass         : 0,
                fail         : 0,
                exception    : 0,
                start        : new Date().toISOString(),
                end          : "",
                reportResultSummaries: {}
            };
            var promises = [];
            while (list.length) {
                var nextId = list.shift();
                console.log("Processing Report: " + nextId);
                var nextReportRequest = getRequest("/reports/" + nextId);
                promises.push(
                    getJsonObject(nextReportRequest)
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

                                                return saveDiff({
                                                    report           : next,
                                                    reportResultA    : next.masterResult,
                                                    reportResultAName: next.masterResult.timestamp,
                                                    reportResultB    : currentResult,
                                                    reportResultBName: currentResult.timestamp,
                                                    distortion       : diff.distortion,
                                                    image            : diff.image
                                                }).then(function(diff){
                                                        batchResult.reportResultSummaries[currentResult._id] = {
                                                            diffId:diff._id,
                                                            diff:diff.distortion,
                                                            name:next.name
                                                        };
                                                    })
                                            },function(error){
                                                console.log("Report Diff Exception: ", error.message);
                                                batchResult.exception++;
                                                return saveDiff({
                                                    report           : next,
                                                    reportResultA    : next.masterResult,
                                                    reportResultAName: next.masterResult.timestamp,
                                                    reportResultB    : currentResult,
                                                    reportResultBName: currentResult.timestamp,
                                                    distortion       : -1,
                                                    image            : undefined
                                                }).then(function(diff){
                                                        batchResult.reportResultSummaries[currentResult._id] = {
                                                            diffId:diff._id,
                                                            error:error.message,
                                                            diff:-1,
                                                            name:next.name

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

            }
            return Q.all(promises)
                .then(function () {
                    batchResult.end = new Date().toISOString();
                    return saveNewBatchResult(batchResult);
                })
        }, function (error) {
            console.log("Error: ", error);
            throw error;
        });


    };

    return {
        execute:execute
    }
}




