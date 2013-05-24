var Q = require('q');
var fsQ = require("q-io/fs");
var http = require("q-io/http");
var webPageToImage = require("./webPageToImage");
var temp = require("temp");
var exec = require('child_process').exec;


var cli = require('cli').enable('status'); //Enable status plugin

cli.parse({
    //batch: ['b', 'Run a specific batch', 'string', '9c2cedbe26409aa9'],
    batch: ['b', 'Run a specific batch', 'string', 'e48c92ba73a8ab00'],
    host : ['h', 'Specify Scylla Hostname', 'string', 'localhost'],
    port : ['p', 'Specify Scylla Port', 'string', '5000'],
    serve: [false, 'Serve static files from PATH', 'path', './public']
});

var host = "";
var port = "";

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
    //console.log("Sending Request: ", requestObject);
    return http.request(requestObject)
        .then(function (response) {
            if (response && response.status == 200) {
                console.log("Response Received");
                return response.body.read()
                    .then(function (body) {
                        console.log("Got JSON: ", body.toString());
                        return JSON.parse(body.toString());
                    });
            } else {
                cli.fatal("HTTP Error (" + requestObject.path + "): ", response);
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
    console.log("Saving result for file: ", imageFile);
    return readPng(imageFile)
        .then(function (imageString) {
            var result = {
                reportId   : report.id,
                timestamp: new Date().toISOString(),
                "result" : imageString
            };
            cli.ok("Saving Report Result: ", result);
            var reportResultPost = postRequest("/report-results/", result);

            return getJsonObject(reportResultPost);

        }, function (error) {
            console.log("Unable to open file: ", error);
            throw new Error(error);
        });
};

var saveNewBatchResult = function saveNewBatchResult(batchResult) {

    var batchResultPost = postRequest("/batch-results/", batchResult);
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
                    console.log("Error: ", error);
                    execDeferred.reject(error);
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
            cli.fatal("Oh Shit, Error! ", error);
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

cli.main(function (args, options) {
    console.log(args, options);

    var commandLine = this;
    host = options.host;
    port = options.port;

    /**
     * Retrieve a list of urls we're to screenshot
     */
    var getBatchPromise;
    if (options.batch && options.batch.length > 0) {
        getBatchPromise = getBatch(options.batch);
    }



    getBatchPromise.then(function (batch) {
        var list = batch.reportIds;
        var batchResult = {
            batchId        : batch.id,
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
            var nextReportRequest = getRequest("/reports/" + nextId);
            promises.push(
                getJsonObject(nextReportRequest)
                    .then(function (next) {
                        var tmpName = temp.path({suffix: '.png'});
                        var currentResult;

                        return webPageToImage(next.url, tmpName)
                            .then(function () {
                                return saveNewReportResult(next, tmpName);
                            })
                            .then(function (newResult) {
                                currentResult = newResult;
                                if (next.masterResultId) {
                                    return diffTwoReportResults(next.masterResult, currentResult)
                                        .then(function (diff) {
                                            batchResult.reportResultSummaries[currentResult.id] = {
                                                diff:diff.distortion,
                                                name:next.name
                                            };
                                            batchResult[(diff.distortion == 0 ? "pass" : "fail")]++;
                                            return saveDiff({
                                                reportId           : next.id,
                                                reportResultAId    : next.masterResult.id,
                                                reportResultAName: next.masterResult.timestamp,
                                                reportResultBId    : currentResult.id,
                                                reportResultBName: currentResult.timestamp,
                                                distortion       : diff.distortion,
                                                image            : diff.image
                                            })
                                        })
                                }
                                batchResult.reportResultSummaries[currentResult.id] = -1;
                                batchResult.exception++;
                                console.log("No Master Result defined for: ", next.name);
                            })
                            .then(function () {
                                return fsQ.remove(tmpName);
                            });
                    })
            );

        }
        Q.all(promises)
            .then(function () {
                batchResult.end = new Date().toISOString();
                saveNewBatchResult(batchResult);
            })
    }, function (error) {
        commandLine.error(error);
    });


});



