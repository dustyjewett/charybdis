/*global phantom:false*/
/*
 * Note: This script is intended to be run inside PhantomJS, not Node.
 *
 * Also note: I ripped this off from
 * https://github.com/ariya/phantomjs/blob/master/examples/rasterize.js
 */

var page = require('webpage').create(),
    system = require('system'),
    address, output, size;

if (system.args.length < 3 || system.args.length > 5) {
    console.log('Usage: render-web-page.js URL filename width height');
    console.log('  screen sizes examples: iphone 4: "640 960", nexus 4: "1280 768"');
    phantom.exit(1);
} else {
    address = system.args[1];
    output = system.args[2];
    width = system.args[3] || 600;
    height = system.args[4] || 600;
    page.viewportSize = { width: width, height: height };
    if(address.indexOf("?") === -1) {
        address += "?phantomjs";
    }
    system.stdout.write("Opening Page: " + address + "\n");
    page.open(address, function (status) {
        'use strict';
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
    page.onAlert = function(str) {
        system.stdout.writeLine(str);
    };
    page.onError = function (msg, trace) {
        system.stdout.writeLine("PAGE ERROR:" + msg);
        trace.forEach(function(item) {
            system.stdout.writeLine('  ', item.file, ':', item.line);
        })
    };
    page.onResourceReceived = function(resource) {
        'use strict';
        //system.stdout.write("Received:  " + resource.url + " : " + resource.status + "\n");
        if (resource.url === address && parseInt(resource.status, 10) >= 400 ) {
            //system.stdout.write(address + ":" + resource.status);
            system.stderr.write("Unable to capture page, received error: " + resource.status);
            phantom.exit(1);
        }
    };
}
