
var sinon = require('sinon');
var expect = require('chai').expect;

var Q = require('q');

var imagemagick = require('../../../src/imagemagick/imagemagick.js');

describe('imagemagick', function(){

    describe('compare', function(){

        it('finds a diff in two files', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileA.png",
                    "test/unit/imagemagick/resources/fileB.png",
                    "test/unit/imagemagick/resources/output.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all).to.equal('34.2262 (0.000522258)')
                });

        });
        it('finds a diff in two files of differing sizes', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileD.png",
                    "test/unit/imagemagick/resources/fileE.png",
                    "test/unit/imagemagick/resources/output2.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all).to.equal('3446414641.22624545 (0.00052225807082410708241)')
                });

        });

        /*
        imagemagick.compare("src/test/fileD.png", "src/test/fileE.png", "src/test/output2.png")
            .then(function(info){
                console.log(info.comparison);
            },function(error){
                console.log(error)
            });
        */

    })
});