var expect = require('chai').expect;


describe('charybdis package', function(){

    describe('api', function(){

        var charybdisPackage = require('../../src/index.js')();

        it('exports executeOnBatch', function(){
            expect(charybdisPackage.executeOnBatch).to.exist;
        });
        it('exports compareTwoUrls', function(){
            expect(charybdisPackage.compareTwoUrls).to.exist;
        });
        it('exports executeABCompare', function(){
            expect(charybdisPackage.executeABCompare).to.exist;
        });
        it('exports webPageToImage', function(){
            expect(charybdisPackage.webPageToImage).to.exist;
        });
        it('exports imagemagick', function(){
            expect(charybdisPackage.imagemagick).to.exist;
        });
        it('exports pngIO', function(){
            expect(charybdisPackage.pngIO).to.exist;
        });


    })
});