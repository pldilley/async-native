/*jslint node: true, evil: true, indent: 2, maxlen: 80, esnext: true, -W028*/

// STEP 1: Import the async-native module like this - passing an eval function like so
//    NOTE: In this example the arrow notation was used: "$ => eval($)" for short
//          We can pass a normal function too: "function($) { eval($); }"
var $async = require('./src/async-native.js').init($ => eval($));

// A test function that calls a standard Node like callback - i.e. callback(error, result) after a CUSTOM duration in ms
function asynchronousTestSleep(delay, callback) {
  setTimeout(function() {
    callback(null, new Date().getTime());
  }, delay);
}

// Use $async to convert these functions to asychronous functions
module.exports = $async({     // STEP 2: Use $async to convert functions within to asychronous functions

  // STEP 3: Don't pass callback's to the asynchronous methods you want to use
  //         Instead, use an async-native placeholder {$<var_name_that_will_be_populated}
  //         Treat these placeholders like normal callbacks within - i.e. "callback(error, result)"
  parallelExample: function () {
    console.log('\n\nParallel example:\n');

    // These are called in parallel
    var parallelCalls = {
      testA: testSleep(2000, {$myTest1}),
      testB: testSleep(1, {$myTest2}),
      testC: testSleep(200, {$myTest3})
    };    // STEP 4: Be ABSOLUTELY sure to include semi-colons at the end of the statement
          //         Async-native will pause after the semi-colon and wait for the callback to

    // Will print out after 2000 ms only, even if the others finish first
    console.log('A', $myTest1);
    console.log('B', $myTest2);
    console.log('C', $myTest3);
  }

});

module.exports.parallelExample();
