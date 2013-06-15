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

    var compare = function compare(fileA, fileB, outFile, pixelsToCompare){
        var execDeferred = Q.defer();
        var cmd = ["compare",
                   "-metric mae",
                   "-verbose",
                   '"' + fileA + '"' + ((pixelsToCompare) ? "[" + pixelsToCompare + "+0+0]" : ""),
                   '"' + fileB + '"' + ((pixelsToCompare) ? "[" + pixelsToCompare + "+0+0]" : ""),
                   '"' + outFile + '"'].join(" ");
        //console.log(cmd);
        exec(cmd, function(error, stdout, stderr){
            if(error){
                //console.log(stderr);
                execDeferred.reject(parseCompareVerboseMAEError(stderr.split("\n")));
            } else {
                var info = parseCompareVerboseMAEOutput(stderr.split("\n"));
                info.distortion = parseFloat(info.comparison.properties["Channel distortion"].all.split(" ")[0]);
                execDeferred.fulfill(info);
            }
        });
        return execDeferred.promise
            .fail(function(failedOutput){
                if(failedOutput.messages[0] == 'image widths or heights differ'){
                    if(!pixelsToCompare) {
                        var sizeA = failedOutput.fileA.properties.ResolutionInPixels.split("x");
                        var sizeB = failedOutput.fileB.properties.ResolutionInPixels.split("x");
                        var size = Math.min(parseInt(sizeA[0], 10), parseInt(sizeB[0], 10)) + "x" +
                                   Math.min(parseInt(sizeA[1], 10), parseInt(sizeB[1], 10));
                        return compare(fileA, fileB, outFile, size)
                            .then(function(info){
                                var biggest = Math.max(sizeA[0], sizeB[0]) * Math.max(sizeA[1], sizeB[1]);
                                var smallest = Math.min(sizeA[0], sizeB[0]) * Math.min(sizeA[1], sizeB[1]);
                                info.distortion += (biggest - smallest);

                                info.warning = "Images not the same size: " + sizeA.join("x") + " vs " + sizeB.join("x");
                                return info;
                            });
                    }
                }
                return failedOutput;
            });
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

    var makeThumbnail = function resize(fileA, outFile, pixels){
        var execDeferred = Q.defer();
        //convert fileD.png -resize 120x120^ -gravity North -extent 120x120 thumb.png
        var cmd = ["convert",
                   '"' + fileA + '"',
                   "-resize",
                   "" + pixels + "x" + pixels + "^", //The ^ forces the output to fill the image
                   "-gravity",
                   "North",
                   "-extent",
                   "" + pixels + "x" + pixels,
                   "-verbose",
                   '"' + outFile + '"'
        ].join(" ");
        exec(cmd, function(error, stdout, stderr){
            if(error){
                execDeferred.reject(error);
            } else {
                var info = stderr.split('\n');
                execDeferred.fulfill(parseIdentifySingleLineOutput(info[0]));
            }
        });
        return execDeferred.promise;
    }


    return {
        compare:compare,
        identify:identify,
        makeThumbnail:makeThumbnail
    };
})();