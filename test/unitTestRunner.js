var Mocha = require('mocha'),
    path = require('path'),
    fs = require('fs');
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

});