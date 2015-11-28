// Run this file with 'node example.js'

var $async = require('./src/async-native.js').init(($a) => eval($a));

// A test function that accepts a delay and a standard Node like callback: (error, result)
var testSleep = function(delay, callback) {
  setTimeout(function() {
    callback(null, new Date().getTime());
  }, delay);
};

module.exports = $async({
  seriesExample: function(callback) {
    console.log('\n\nSeries example:\n');

    testSleep(500, {$myTest1}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest1);

    testSleep(500, {$myTest2}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest2);

    testSleep(100, {$myTest3}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest3);

    callback(null, null);
  },

  parallelExample: function (callback) {
    console.log('\n\nParallel example:\n');

    // These are called in parallel
    var parallelCalls = {
      testA: testSleep(500, {$myTest1}),
      testB: testSleep(1, {$myTest2}),
      testC: testSleep(200, {$myTest3})
    }; /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */

    // Will print out after 3000 ms only
    console.log('A', $myTest1);
    console.log('B', $myTest2);
    console.log('C', $myTest3);

    callback(null, null);
  },

  threadExample: function(callback) {
    console.log('\n\nParallel example:\n');

    $: {
      test;
      console.log('myTest');
    };

    callback(null, null);
  },

  asyncErrorExample: function(callback) {
    console.log('\n\nError example:\n');

    setTimeout(function() {
      callback(new Error("This is a delayed test error"));
    }, 1000);

    //callback(new Error("This is an immediate test error")); // Handled too
  },

  _callExamplesAsynchronously: function() {
    try {
      module.exports.seriesExample({$one});
      module.exports.parallelExample({$two});
      module.exports.asyncErrorExample({$three});
    } catch(e) {
      if (e instanceof FutureError) {
        console.log('Error via async was:', e.message);
      } else {
        console.log('Immediate error was:', e.message);
      }
    }
  }
});

module.exports._callExamplesAsynchronously();