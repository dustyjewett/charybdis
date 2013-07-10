

var cli = require('cli').enable('status'); //Enable status plugin
var winston = require("winston");
var logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)()
    ]
});

logger.cli();

cli.parse({
    compare: ['c', 'Run a specific compare', 'string', ''],
    host : ['h', 'Specify Scylla Hostname', 'string', 'localhost'],
    port : ['p', 'Specify Scylla Port', 'string', '3001']
});


var charybdis = require('./index');

cli.main(function (args, options) {
    logger.info(args, options);
    charybdis().executeABCompare(options.host, options.port, options.compare)
        .then(function(result){
            logger.info("Charybdis Finished", result);
        });
});



