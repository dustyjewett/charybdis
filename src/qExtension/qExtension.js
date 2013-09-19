//IIFE
module.exports = (function(){
    'use strict';
    var Q = require('q');

    var sequentiallyDeQueue = function(values, func){
        if(!values || values.length === 0){
            console.log("No More Values, returning []");
            var empty = Q.defer();
            empty.resolve([]);
            return empty.promise;
        }
        var vals = values;
        var results = [];
        var root = Q.defer();//The base promise
        var head = root.promise;//The most recently created promise
        vals.forEach(function(value){
            head = head.then(function(){
                //console.log("Calling Fn with: ", value);
                return Q.fcall(func, value)
                    .then(function(result){
                        console.log("Result for: ", value, " is ", result);
                        results.push(result);
                    });
            });

        });
        root.resolve();
        return head.then(function(){
            return results;
        });

    };

    var eachItemIn = function eachItemIn(values) {
        return {
            aggregateThisPromise:function aggregateThisPromise(fn){
                return sequentiallyDeQueue(values, fn);
            }
        };
    };

    return {
        eachItemIn:eachItemIn
    };
})();

