/*
 * Note: This script is intended to be run inside PhantomJS, not Node.
 *
 * Also note: I ripped this off from
 * https://github.com/ariya/phantomjs/blob/master/examples/rasterize.js
 */

var page = require('webpage').create(),
    system = require('system'),
    address, output, size;
var fs = require("fs");

if (system.args.length < 3 || system.args.length > 5) {
    console.log('Usage: rener-web-page.js URL filename [paperwidth*paperheight|paperformat] [zoom]');
    console.log('  paper (pdf output) examples: "5in*7.5in", "10cm*20cm", "A4", "Letter"');
    phantom.exit(1);
} else {
    address = system.args[1];
    output = system.args[2];
    page.viewportSize = { width: 600, height: 600 };
    if (system.args.length > 3 && system.args[2].substr(-4) === ".pdf") {
        size = system.args[3].split('*');
        page.paperSize = size.length === 2 ? { width: size[0], height: size[1], margin: '0px' }
                                           : { format: system.args[3], orientation: 'portrait', margin: '1cm' };
    }
    if (system.args.length > 4) {
        page.zoomFactor = system.args[4];
    }
    if(address.indexOf("?") == -1) {
        address += "?phantomjs";
    }
    system.stdout.write("Opening Page: " + address + "\n");
    page.open(address, function (status) {
            //system.stdout.write(status);
        //fs.write("/dev/stdout", status, "w");
        if (status !== 'success') {
            //system.stdout.write(address + ":" + status);
            system.stderr.write("Unable to load website at URL: " + address);
//            console.log('Unable to load the address!');

            phantom.exit(1);
        } else {
            window.setTimeout(function () {
                page.render(output);
                phantom.exit();
            }, 200);
        }
    });
    page.onResourceReceived = function(resource) {
        //system.stdout.write("Received:  " + resource.url + " : " + resource.status + "\n");
        if (resource.url == address && parseInt(resource.status) >= 400 ) {
            //system.stdout.write(address + ":" + resource.status);
            system.stderr.write("Unable to capture page, received error: " + resource.status);
            phantom.exit(1);
        }
    };
}
