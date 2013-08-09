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
        path.join(__dirname, 'renderWebPage.js'),
        urlToPage,
        outputFile
    ];
    //With all of these console statements, you'd think I have to debug this a lot...

    //console.log(binPath + " " + childArgs.join(" "));
    execFile(binPath, childArgs, function(error, stdout, stderr) {
        //console.error("Stdout", stdout);
        //console.error("Stderr", stderr);
        if(error) {
            deferred.reject({message:stderr});
        } else {
            //console.log("Rendered Url: " + urlToPage);
            //console.log("To File: " + outputFile);
            deferred.resolve(stdout);
        }
    });

    return deferred.promise;
};