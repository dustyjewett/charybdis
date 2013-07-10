
var sinon = require('sinon');
var expect = require('chai').expect;

var Q = require('q');

var imagemagick = require('../../../src/imagemagick/imagemagick.js');

describe('imagemagick', function(){
    describe('api', function(){


        it('exports compare', function(){
            expect(imagemagick.compare).to.exist;
        });
        it('exports identify', function(){
            expect(imagemagick.identify).to.exist;
        });
        it('exports makeThumbnail', function(){
            expect(imagemagick.makeThumbnail).to.exist;
        });


    })

    describe('compare', function(){

        it('finds a diff in two files', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileA.png",
                    "test/unit/imagemagick/resources/fileB.png",
                    "test/unit/imagemagick/resources/output.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all, "all").to.equal('4541.48 (0.0692985)')
                });

        });
        it('finds a diff in two files of differing sizes', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileD.png",
                    "test/unit/imagemagick/resources/fileE.png",
                    "test/unit/imagemagick/resources/output2.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all, "all").to.equal('7211.05 (0.110034)')
                });

        });
        it('finds no diff when comparing exact duplicate', function(done){
            return imagemagick.compare(
                    "test/unit/imagemagick/resources/fileA.png",
                    "test/unit/imagemagick/resources/fileA.png",
                    "test/unit/imagemagick/resources/output3.png"
                ).then(function(info){
                    expect(info.comparison.properties['Channel distortion'].all, "all").to.equal('0 (0)')
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