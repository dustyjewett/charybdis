module.exports = function (host, port) {

    var http = require("q-io/http");

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
                    //console.log("Response Received");
                    return response.body.read()
                        .then(function (body) {
                            //console.log("Got JSON: ", body.toString());
                            return JSON.parse(body.toString());
                        });
                } else {
                    console.error("HTTP Error (" + requestObject.path + "): ", response);
                    throw new Error(response);
                }
            });

    };
    var getReport = function (reportId) {
        var reportRequest = getRequest("/reports/" + reportId + "?includeFullImage=true");
        return getJsonObject(reportRequest);
    };

    var getBatch = function (batchId) {
        var batchRequest = getRequest("/batches/" + batchId);
        return getJsonObject(batchRequest);
    };

    var getCompare = function (compareId) {
        var compareRequest = getRequest("/abcompares/" + compareId);
        return getJsonObject(compareRequest);
    };

    var newCompareResult = function newReportResult(compareId, result) {
        var compareResultPost = postRequest("/abcompares/" + compareId + "/results/", result);

        return getJsonObject(compareResultPost);
    };

    var newReportResult = function newReportResult(reportId, result) {
        var reportResultPost = postRequest("/reports/" + reportId + "/results/", result);

        return getJsonObject(reportResultPost);
    };
    var newBatchResult = function newBatchResult(batchId, batchResult) {

        var batchResultPost = postRequest("/batches/" + batchId + "/results/", batchResult);
        return getJsonObject(batchResultPost);

    };
    var newResultDiff = function newResultDiff(resultDiff) {
        var resultDiffPost = postRequest("/result-diffs/", resultDiff);
        return getJsonObject(resultDiffPost);
    };

    return {
        getReport       : getReport,
        getBatch        : getBatch,
        newReportResult : newReportResult,
        newBatchResult  : newBatchResult,
        newResultDiff   : newResultDiff,
        getCompare      : getCompare,
        newCompareResult: newCompareResult
    };
};

