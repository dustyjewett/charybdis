module.exports = (function(){
    var Q = require('q');
    var fsQ = require("q-io/fs");

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

    return {
        readPng:readPng,
        writePng:writePng
    }
})();