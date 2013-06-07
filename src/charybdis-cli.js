

var cli = require('cli').enable('status'); //Enable status plugin
var winston = require("winston");
var logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)()
    ]
});

logger.cli();

cli.parse({
    batch: ['b', 'Run a specific batch', 'string', '51b0f1c4dd7d4f891c000007'],
    host : ['h', 'Specify Scylla Hostname', 'string', 'localhost'],
    port : ['p', 'Specify Scylla Port', 'string', '3000']
});


var charybdis = require('./charybdis');

cli.main(function (args, options) {
    logger.info(args, options);
    charybdis(options.host, options.port).execute(options.batch)
        .then(function(result){
            logger.info("Charybdis Finished", result);
        })
});



