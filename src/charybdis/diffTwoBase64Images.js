/**
 * Dependency Injection
 *
 * @param Q
 * @param fsQ
 * @param temp
 * @param pngIO
 * @param imagemagick
 * @return {Function}
 */
module.exports = function(Q, fsQ, temp, pngIO, imagemagick){

    var tmpOpts = require('./tempFileNames');

    /**
     * Compares two base64 images.
     * @param imageA
     * @param imageB
     * @return {Promise} for
     *      Success: {image:String (Base64), distortion:Number}
     *      Failure: {message:}
     */
    var diffTwoBase64Images = function diffTwoBase64Images(imageA, imageB) {

        var masterFile = temp.path(tmpOpts.diffmaster);
        var newFile = temp.path(tmpOpts.diffnew);
        var diffFile = temp.path(tmpOpts.diffdiff);

        return Q.all([
                pngIO.writePng(masterFile, imageA),
                pngIO.writePng(newFile, imageB)
            ])
            .then(function () {
                return imagemagick.compare(masterFile, newFile, diffFile)
            })
            .then(function (info) {
                var distortion = info.distortion;
                //parseFloat(info.comparison.properties["Channel distortion"].all.split(" ")[0])
                return pngIO.readPng(diffFile)
                    .then(function (imageString) {
                        return {
                            image     : imageString,
                            distortion: distortion
                        };

                    })
            })
            .fin(function (passthrough) {
                return Q.all([
                        fsQ.remove(masterFile),
                        fsQ.remove(newFile),
                        fsQ.remove(diffFile)
                    ])
                    .then(function () {
                        return passthrough
                    })
            });
    };

    return diffTwoBase64Images;
};