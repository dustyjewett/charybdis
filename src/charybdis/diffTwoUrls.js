/**
 * Dependency Injection
 *
 * @param Q
 * @param fsQ
 * @param temp
 * @param pngIO
 * @param imagemagick
 * @param webPageToImage
 * @return {Function}
 */
module.exports = function(Q, fsQ, temp, pngIO, imagemagick, webPageToImage){

    var tmpOpts = require('./tempFileNames');

    var getThumbnailString = function (filename) {
        var fileThumb = temp.path(tmpOpts.thumbString);
        return imagemagick.makeThumbnail(filename, fileThumb, 120)
            .then(function () {
                return pngIO.readPng(fileThumb)
            })
            .then(function(fileString){
                return fsQ.remove(fileThumb) // Cleanup
                    .then(function(){
                        return fileString;
                    })
            });
    };

    var diffTwoUrls = function (urlA, urlB, returnImages, width, height) {
        var fileA = temp.path(tmpOpts.compareA);
        var fileB = temp.path(tmpOpts.compareB);
        var diffFile = temp.path(tmpOpts.compareC);
        return Q.all([
                webPageToImage(urlA, fileA, width, height),
                webPageToImage(urlB, fileB, width, height)
            ])
            .then(function () {
                return imagemagick.compare(fileA, fileB, diffFile)
                    .then(function (info) {
                        var result = {};
                        //console.log(info);
                        //console.log("Pixel Diff:" + info.comparison.properties["Channel distortion"].all.split(" ")[0]);
                        //console.log("Total Diff:" + info.distortion);
                        return getThumbnailString(fileA)
                            .then(function (thumbString) {
                                result.thumbA = thumbString;
                                return getThumbnailString(fileB)
                                    .then(function (thumbString) {
                                        result.thumbB = thumbString;
                                    })
                            })
                            .then(function () {
                                return pngIO.readPng(diffFile)
                            })
                            .then(function (imageString) {
                                result.image = imageString;
                                result.distortion = info.distortion;
                                result.warning = info.warning;
                                result.timestamp = new Date().toISOString();
                                if (returnImages) {
                                    return Q.all([
                                            pngIO.readPng(fileA),
                                            pngIO.readPng(fileB)
                                        ]).spread(function (imgA, imgB) {
                                            result.resultA = imgA;
                                            result.resultB = imgB;
                                            return result;
                                        });
                                }

                                return result;
                            })
                    })
            })
            .then(function(passthrough){
                return Q.allSettled([
                        fsQ.remove(fileA),
                        fsQ.remove(fileB),
                        fsQ.remove(diffFile)
                    ])
                    .then(function () {
                        return passthrough;
                    });
            })

    };

    return diffTwoUrls;
};