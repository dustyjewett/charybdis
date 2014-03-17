module.exports = function () {
    'use strict';
    var webPageToImage  = require("./phantomjs/webPageToImage");
    var imagemagick     = require('./imagemagick/imagemagick');
    var pngIO           = require('./pngIO/pngIO');
    var scyllaService   = require('./services/scyllaJson');

    var charybdis       = require('./charybdis/charybdis')(
        webPageToImage,
        imagemagick,
        pngIO,
        scyllaService
    );


    return {
        webPageToImage       : webPageToImage,
        imagemagick          : imagemagick,
        pngIO                : pngIO,
        executeOnReport      : charybdis.executeOnReport,
        captureReportSnapshot: charybdis.captureReportSnapshot,
        executeOnBatch       : charybdis.executeOnBatch,
        compareTwoUrls       : charybdis.compareTwoUrls,
        executeABCompare     : charybdis.executeABCompare,

        webPageToSnapshot    : charybdis.webPageToSnapshot
    };
};




