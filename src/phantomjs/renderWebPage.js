/*global phantom:false*/
/*
 * Note: This script is intended to be run inside PhantomJS, not Node.
 *
 * Also note: I ripped this off from
 * https://github.com/ariya/phantomjs/blob/master/examples/rasterize.js
 */

var page = require('webpage').create(),
    system = require('system'),
    address, output;

if (system.args.length < 3 || system.args.length > 7) {
    console.log('Usage: render-web-page.js URL filename width height timeout cookie');
    console.log('  screen sizes examples: iphone 4: "640 960", nexus 4: "1280 768"');
    phantom.exit(1);
} else {
    console.log('command executing: ');
    console.log(system.args.join(" "));
    address = system.args[1];
    output = system.args[2];
    var width = system.args[3] || 600;
    var height = system.args[4] || 600;
    var timeout = system.args[5] || 2000;
    var cookieString = system.args[6] || "" ;
    page.viewportSize = { width: width, height: height };
    if(address.indexOf("?") === -1) {
        address += "?phantomjs"; 
    }
    system.stdout.write("Opening Page: " + address + "\n");
    var rendered = false;
    var renderAndExit = function(){
        if (rendered) {return;}
        rendered = true;
        page.render(output);
        phantom.exit();
    }
    if (cookieString.length > 0) { 
        var bakedCookies = JSON.parse(cookieString);
        for (var i = 0; i < bakedCookies.length; i++) {
            console.log('ADDEM A COOKIERP');
            phantom.addCookie(bakedCookies[i]);
        }
        
    }
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
            window.setTimeout(renderAndExit, timeout);
        }
    });
    page.onAlert = function(str) {
        'use strict';
        if(str == "take-snapshot"){
            renderAndExit();
        } else {
            system.stdout.writeLine(str);
        }
    };
    page.onError = function (msg, trace) {
        'use strict';
        system.stdout.writeLine("PAGE ERROR:" + msg);
        trace.forEach(function(item) {
            system.stdout.writeLine('  ', item.file, ':', item.line);
        });
    };
    page.onResourceReceived = function(resource) {
        'use strict';
        // system.stdout.write("Received:  " + resource.url + " : " + resource.status + "\n");
        if (resource.url === address && parseInt(resource.status, 10) >= 400 ) {
            system.stdout.write(address + ":" + resource.status);
            system.stderr.write("Unable to capture page, received error: " + resource.status);
            phantom.exit(1);
        }
    };
 }
