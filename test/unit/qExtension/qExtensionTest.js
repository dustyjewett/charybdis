var expect = require('chai').expect;


describe('qExtension', function(){

    var Q = require('q');

    describe('api', function(){

        var qExtension = require('../../../src/qExtension/qExtension.js');

        it('exports eachItemIn', function(){
            expect(qExtension.eachItemIn).to.exist;
        });

        it('eachItemIn exports aggregateThisPromise', function(){
            expect(qExtension.eachItemIn([]).aggregateThisPromise ).to.exist;
        });

    });


    describe('aggregateThisPromise', function(){

        var qExtension = require('../../../src/qExtension/qExtension.js');

        it('handles empty array fine', function(done){
            var aggregatedPromise = qExtension
                .eachItemIn([])
                .aggregateThisPromise(function(val){
                    return Q.delay(50)
                        .then(function(){return 'Item: ' + val});
            });
            aggregatedPromise.then(function(values){
                expect(values).to.exist;
                expect(values).to.be.an('array');
                expect(values.length).to.equal(0);
                done();
            })
        });


        it('handles single item fine', function(done){
            var aggregatedPromise = qExtension
                .eachItemIn([1])
                .aggregateThisPromise(function(val){
                    console.log("generating result for: ", val);
                    d = Q.defer();
                    d.resolve("Item: " + val);
                    return d.promise;
                });
            aggregatedPromise.then(function(values){
                expect(values.length).to.equal(1);
                done();

            })
        });

        it('handles ten items fine', function(done){
            var aggregatedPromise = qExtension
                .eachItemIn([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
                .aggregateThisPromise(function(val){
                    console.log("generating result for: ", val);
                    return Q.delay(20)
                        .then(function(){
                            return "Item: " + val;
                        })
                });
            aggregatedPromise.then(function(values){
                expect(values.length).to.equal(10);
                done();

            })
        })



    });

});