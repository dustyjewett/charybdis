var Q = require('q');
var execFile = require('child_process').execFile;
var binPath = require('phantomjs').path;
var path = require('path');
var temp = require('temp');
var fs = require('fs');

/*
* Converts editThisCookie (chrome plugin) export JSON to something phantomjs will accept
* Expecting cookies in the form of the output generated by
* https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg
*/ 

function convertCookieJSON(cookieJSON) {
    var cookies = [];
    var chromePluginFormattedCookies = JSON.parse(cookieJSON);
    for (var i = 0; i < chromePluginFormattedCookies.length; i++) {
        var oldCookie = chromePluginFormattedCookies[i];
        cookies.push(
            {
                'name': oldCookie.name,
                'value': oldCookie.value,
                'domain': oldCookie.domain,
                'httponly': ("" + oldCookie.httpOnly).toUpperCase(),
                'domain': oldCookie.domain,
                'secure': ("" + oldCookie.secure).toUpperCase(),
                'path': oldCookie.path,
                'expires': ("" + oldCookie.expirationDate)
            }
        );
    }

    return cookies;
}

/**
 *
 * @param urlToPage
 * @param outputFile
 * @param width viewport width
 * @param height viewport height
 * @return {*}
 */

module.exports = function webPageToImage(urlToPage, outputFile, width, height, timeout, cookies) {
    'use strict';
    var deferred = Q.defer();
    width = width || 600;
    height = height || 600;
    timeout = timeout || 2000;
    var childArgs = [
        "--ignore-ssl-errors=true",
        "--ssl-protocol=tlsv1",
        path.join(__dirname, 'renderWebPage.js'),
        urlToPage,
        outputFile,
        width,
        height,
        timeout
    ];
    if (cookies) {
        cookies = JSON.stringify(convertCookieJSON(cookies));
        childArgs.push(cookies);
    }
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
            deferred.resolve({message:stderr, console:stdout});
        }
    });

    return deferred.promise;
};
