var Q = require('q');
var execFile = require('child_process').execFile;
var binPath = require('phantomjs').path;
var path = require('path');

/**
 *
 * @param urlToPage
 * @param outputFile
 * @param width viewport width
 * @param height viewport height
 * @return {*}
 */
module.exports = function webPageToImage(urlToPage, outputFile, width, height) {
    var deferred = Q.defer();
    width = width || 600;
    height = height || 600;
    var childArgs = [
        path.join(__dirname, 'renderWebPage.js'),
        urlToPage,
        outputFile,
        width,
        height
    ];
    //With all of these console statements, you'd think I have to debug this a lot...

    //console.log(binPath + " " + childArgs.join(" "));
    execFile(binPath, childArgs, function(error, stdout, stderr) {
        //console.error("Stdout", stdout);
        //console.error("Stderr", stderr);
        if(error) {
            deferred.reject({message:stderr, console:stdout});
        } else {
            //console.log("Rendered Url: " + urlToPage);
            //console.log("To File: " + outputFile);
            deferred.resolve(stdout);
        }
    });

    return deferred.promise;
};