var cli = require('cli').enable('status'); //Enable status plugin
var winston = require("winston");
var logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)()
    ]
});

logger.cli();

cli.parse({
    urlA : ['a', 'The First url', 'string', 'http://whattimeisit.com'],
    urlB : ['b', 'The Second url', 'string', 'http://whattimeisit.com']
});


var charybdis = require('./charybdis');

cli.main(function (args, options) {
    logger.info(args, options);
    charybdis(options.host, options.port).compareTwoUrls(options.urlA, options.urlB)
        .then(function(result){
            logger.info("Charybdis Finished", result);
        });
});



