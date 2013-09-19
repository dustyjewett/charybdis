var Mocha = require('mocha');
var mochaAsPromised = require("mocha-as-promised");
    mochaAsPromised(Mocha);
var glob = require("glob");

var mocha = new Mocha({
    reporter: 'spec',
    ui: 'bdd',
    timeout: 500
});

//var testDir = './test/unit/qExtension/*Test.js';
var testDir = './test/unit/**/*Test.js';
glob(testDir, function (err, files) {
    'use strict';
    if (err) {
        console.log(err);
        return;
    }
    files.forEach(function (file) {
        console.log('adding test file: %s', file);
        mocha.addFile(file);
    });

    var runner = mocha.run(function () {
        console.log('finished');
        process.exit();
    });
    console.log(runner);

});