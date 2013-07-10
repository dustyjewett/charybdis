

var cli = require('cli').enable('status'); //Enable status plugin
var winston = require("winston");
var logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)()
    ]
});

logger.cli();

cli.parse({
    batch: ['b', 'Run a specific batch', 'string', ''],
    host : ['h', 'Specify Scylla Hostname', 'string', 'localhost'],
    port : ['p', 'Specify Scylla Port', 'string', '3000']
});


var charybdis = require('./index');

cli.main(function (args, options) {
    logger.info(args, options);
    charybdis().executeOnBatch(options.host, options.port, options.batch)
        .then(function(result){
            logger.info("Charybdis Finished", result);
        });
});



