

var cli = require('cli').enable('status'); //Enable status plugin
var winston = require("winston");
var logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)()
    ]
});

logger.cli();

cli.parse({
    report: ['r', 'Run a specific report', 'string', ''],
    host : ['h', 'Specify Scylla Hostname', 'string', 'localhost'],
    port : ['p', 'Specify Scylla Port', 'string', '3000']
});


var charybdis = require('./index');

cli.main(function (args, options) {
    'use strict';

    logger.info(args, options);
    charybdis().executeOnReport(options.host, options.port, options.report)
        .then(function(result){
            logger.info("Charybdis Finished", result);
        });
});



