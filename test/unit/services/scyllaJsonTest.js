var expect = require('chai').expect;


describe('scylla service package', function(){

    describe('json', function(){

        describe('api', function(){
            var scyllaPackage = require('../../../src/services/scyllaJson.js')("localhost", 8080);

            it('exports getReport', function(){
                expect(scyllaPackage.getReport).to.exist;
            });
            it('exports getBatch', function(){
                expect(scyllaPackage.getBatch).to.exist;
            });
            it('exports newReportResult', function(){
                expect(scyllaPackage.newReportResult).to.exist;
            });
            it('exports newBatchResult', function(){
                expect(scyllaPackage.newBatchResult).to.exist;
            });
            it('exports newResultDiff', function(){
                expect(scyllaPackage.newResultDiff).to.exist;
            });
            it('exports getCompare', function(){
                expect(scyllaPackage.getCompare).to.exist;
            });
            it('exports newCompareResult', function(){
                expect(scyllaPackage.newCompareResult).to.exist;
            });

        });

    });
});