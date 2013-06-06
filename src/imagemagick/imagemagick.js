/**
 * Promise-based interface to some specific imagemagick utilities.
 *
 * These expect imagemagick to be installed and available via command line.
 */
//IIFE
module.exports = (function(){
    var Q = require('q');
    var fsQ = require("q-io/fs");
    var temp = require("temp");
    var exec = require('child_process').exec;



    var parseCompareVerboseMAEError = function parseCompareVerboseMAEOutput(lines){
        var errorInfo = {
            messages:[]
        }
        while(lines.length){
            var line = lines.shift();
            if(line == "") continue;
            if(line.indexOf("compare.") == 0){
                errorInfo.messages.push(line.split(":")[1].split("`")[0].trim())
            } else if(!errorInfo.hasOwnProperty("fileA")) {
                errorInfo.fileA = parseIdentifySingleLineOutput(line)
            } else if(!errorInfo.hasOwnProperty("fileB")) {
                errorInfo.fileB = parseIdentifySingleLineOutput(line)
            }
        }
        return errorInfo;
    };

    var parseCompareVerboseMAEOutput = function parseCompareVerboseMAEOutput(lines){
        if(lines[lines.length-1] == "") lines.pop();
        var info = {
            fileA: parseIdentifySingleLineOutput(lines.shift()),
            fileB: parseIdentifySingleLineOutput(lines.shift()),
            output: parseIdentifySingleLineOutput(lines.pop()),
            comparison:parseIdentifyOutputWithNewlines(lines)
        };
        return info
    };

    var parseIdentifySingleLineOutput = function parseIdentifySingleLineOutput(line){
        var parts = line.split(" ");
        return {
            Image:parts[0],
            properties:{
                Format:parts[1],
                ResolutionInPixels:parts[2],
                Geometry:parts[3],
                Depth:parts[4],
                Class:parts[5],
                Filesize:parts[6],
                'User time':parts[7],
                'Elapsed time:':parts[8]
            }
        }
    };

    var parseIdentifyOutputWithNewlines = function parseIdentifyOutputWithNewlines(linesArray) {
        var firstLine = linesArray.shift().split(":");
        var mainObject = {};
        mainObject[firstLine[0]] = firstLine[1];

        var currentObject = mainObject;
        var lastProperty = "properties";
        var objectStack = [];
        for(var i = 0; i < linesArray.length; i++) {
            var line = linesArray[i];
            if(line == "") continue;
            var colonPos = line.lastIndexOf(":");
            var propName = line.substring(0, colonPos);
            var value = line.substring(colonPos + 1).trim();

            var numOfSpaces = propName.match(/^( *)/)[0].length;
            if(numOfSpaces / 2 < objectStack.length ) {
                objectStack.pop();
                currentObject = objectStack[objectStack.length-1];
            } else if (numOfSpaces / 2 > objectStack.length) {
                var nextObj = {};
                currentObject[lastProperty] = nextObj
                currentObject = nextObj
                objectStack.push(currentObject)
            }
            lastProperty = propName.trim();
            currentObject[lastProperty] = value;
        }
        return mainObject;
    };

    var compare = function compare(fileA, fileB, outFile){
        var execDeferred = Q.defer();
        var cmd = ["compare",
                   "-metric mae",
                   "-verbose",
                   '"' + fileA + '"',
                   '"' + fileB + '"',
                   '"' + outFile + '"'].join(" ");
        exec(cmd, function(error, stdout, stderr){
            if(error){
                console.log(stderr);
                execDeferred.reject(parseCompareVerboseMAEError(stderr.split("\n")));
            } else {
                execDeferred.fulfill(parseCompareVerboseMAEOutput(stderr.split("\n")));
            }
        });
        return execDeferred.promise;
    };

    var identify = function identify(fileA){
        var execDeferred = Q.defer();
        var cmd = ["identify",
                   "-verbose",
                   '"' + fileA + '"'
                  ].join(" ");
        exec(cmd, function(error, stdout, stderr){
            if(error){
                execDeferred.reject(error);
            } else {
                var info = stdout.split('\n');
                execDeferred.fulfill(parseIdentifyOutputWithNewlines(info));
            }

        });
        return execDeferred.promise;
    };


    return {
        compare:compare,
        identify:identify
    };
})();