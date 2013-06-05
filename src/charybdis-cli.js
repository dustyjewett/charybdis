

var cli = require('cli').enable('status'); //Enable status plugin
var winston = require("winston");
var logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)()
    ]
});

logger.cli();

cli.parse({
    batch: ['b', 'Run a specific batch', 'string', '51ad103f82aa1a0231000001'],
    //batch: ['b', 'Run a specific batch', 'string', 'e48c92ba73a8ab00'],
    host : ['h', 'Specify Scylla Hostname', 'string', 'localhost'],
    port : ['p', 'Specify Scylla Port', 'string', '3001'],
    serve: [false, 'Serve static files from PATH', 'path', './public']
});


var charybdis = require('./charybdis');

cli.main(function (args, options) {
    logger.info(args, options);
    charybdis(options.host, options.port).execute(options.batch)
        .then(function(result){
            logger.info("Charybdis Finished", result);
        })
});



