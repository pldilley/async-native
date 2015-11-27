var aysncNative = require('./src/async-native.js').configure(($a) => eval($a));

// A test function that accepts a delay and a standard Node like callback: (error, result)
var testSleep = function(delay, callback) {
  setTimeout(function() {
    callback(null, new Date().getTime());
  }, delay);
};

module.exports = {
  seriesExample: function(callback) {
    console.log('\n\nSeries example:\n');
    testSleep(3000, {$myTest1}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest1);

    testSleep(2000, {$myTest2}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest2);

    testSleep(1000, {$myTest3}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest3);

    callback(null, null);
  },

  parallelExample: function (callback) {
    console.log('\n\nParallel example:\n');

    // These are called in parallel
    var parallelCalls = {
      testA: testSleep(3000, {$myTest1}),
      testB: testSleep(1, {$myTest2}),
      testC: testSleep(1000, {$myTest3})
    }; /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */

    // Will print out after 3000 ms only
    console.log('A', $myTest1);
    console.log('B', $myTest2);
    console.log('C', $myTest3);

    callback(null, null);
  },

  asyncErrorExample: function(callback) {
    console.log('\n\nError example:\n');
    setTimeout(function() {
      callback(new Error("This is a test error"));
    }, 1000);
  },

  _callExamplesAsynchronously: function() {
    try {
      module.exports.seriesExample({$one});
      module.exports.parallelExample({$two});
      module.exports.asyncErrorExample({$three});
    } catch(e) {
      if (e instanceof aysncNative.FutureError) {
        console.log('Error via callback was:', e.message);
      } else {
        console.log('Immediate error was:', e.message);
      }
    }
  }
};

aysncNative.process(module.exports);

module.exports._callExamplesAsynchronously();