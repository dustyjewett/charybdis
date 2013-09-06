/**
 * Dependency Injection
 *
 * @param Q
 * @param fsQ
 * @param temp
 * @param pngIO
 * @param imagemagick
 * @param scylla
 * @return {Function}
 */
module.exports = function(Q, fsQ, temp, pngIO, imagemagick, scylla){

    var tmpOpts = require('./tempFileNames');

    var saveNewReportResult = function saveNewReportResult(report, imageFile) {
        //console.log("Saving result for file: ", imageFile);
        var fullImage;
        var thumbFile = temp.path(tmpOpts.reportThumb);
        var thumb;
        return pngIO.readPng(imageFile)
            .then(function (imageString) {
                fullImage = imageString;
                return imagemagick.makeThumbnail(imageFile, thumbFile, 120)
            })
            .then(function () {
                return pngIO.readPng(thumbFile);
            })
            .then(function (thumbString) {
                thumb = thumbString;
            })
            .then(function () {
                var result = {
                    report   : report,
                    timestamp: new Date().toISOString(),
                    "result" : fullImage,
                    thumb    : thumb
                };
                //console.log("Saving Report Result: ", result);
                return scylla.newReportResult(report._id, result);

            }, function (error) {
                console.log("During Report: " + report + " Unable to open file: ", error);
                throw new Error(error);
            })
            .then(function (passthrough) {
                return fsQ.remove(thumbFile)
                    .then(function () {
                        return passthrough
                    });
            })
    };

    return saveNewReportResult;
};