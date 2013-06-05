var Q = require('q');
var execFile = require('child_process').execFile;
var binPath = require('phantomjs').path;
var path = require('path');

/**
 *
 * @param urlToPage
 * @param outputFile
 * @return {*}
 */
module.exports = function webPageToImage(urlToPage, outputFile) {
    var deferred = Q.defer();

    var childArgs = [
        path.join(__dirname, '../', 'src', 'phantomjs', 'renderWebPage.js'),
        urlToPage,
        outputFile
    ];

    execFile(binPath, childArgs, function(error, stdout, stderr) {
        if(error) {
            deferred.reject(error);
        } else {
            console.log("Rendered Url: " + urlToPage);
            console.log("To File: " + outputFile);
            deferred.resolve(stdout);
        }
    });

    return deferred.promise;
};