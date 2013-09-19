var expect = require('chai').expect;


describe('pngIO', function(){
    'use strict';

    describe('api', function(){

        var pngIO = require('../../../src/pngIO/pngIO.js');

        it('exports readPng', function(){
            expect(pngIO.readPng).to.exist;
        });
        it('exports writePng', function(){
            expect(pngIO.writePng).to.exist;
        });


    });
});