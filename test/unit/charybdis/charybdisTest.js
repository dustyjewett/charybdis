var expect = require('chai').expect;


describe('charybdis', function(){

    describe('api', function(){

        var charybdis = require('../../../src/charybdis/charybdis.js')();

        it('exports executeOnBatch', function(){
            expect(charybdis.executeOnBatch).to.exist;
        });
        it('exports compareTwoUrls', function(){
            expect(charybdis.compareTwoUrls).to.exist;
        });
        it('exports compareTwoUrls', function(){
            expect(charybdis.executeABCompare).to.exist;
        });
    });

    //TODO: Write actual tests :-/
    //I went through the work of figuring out how to separate out the other logic
    //The very least I could do is follow through on some tests.
});