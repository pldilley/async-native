/*jslint node: true, evil: true, indent: 2, maxlen: 80, esnext: true, -W028*/

// STEP 1: Import the async-native module like this - passing an eval function like so
//    NOTE: In this example the arrow notation was used: "$ => eval($)" for short
//          We can pass a normal function too: "function($) { eval($); }"
var $async = require('./src/async-native.js').init($ => eval($));

// A test function that calls a standard Node like callback - i.e. callback(error, result) after 1000ms
function asynchronousTestSleep(callback) {
  setTimeout(function() {
      callback(null, new Date().getTime());
  }, 1000);
}

module.exports = $async({   // STEP 2: Use $async to convert functions within to asychronous functions

  // STEP 3: Don't pass callback's to the asynchronous methods you want to use
  //         Instead, use an async-native placeholder {$<var_name_that_will_be_populated}
  //         Treat these placeholders like normal callbacks within - i.e. "callback(error, result)"
  seriesExample: function() {
    console.log('\n\nSeries example:\n');

    asynchronousTestSleep({$myTest1}); // STEP 4: Be ABSOLUTELY sure to include semi-colons at the end of the statement
                                       //         Async-native will pause after the semi-colon and wait for the callback to

    // STEP 5: The console.log and the rest of the code will not happen until the above asynchronousTestSleep calls back
    console.log('exampleFn1', $myTest1);


    asynchronousTestSleep({$myTest2});
    console.log('exampleFn2', $myTest2);

    // STEP 6: Will not happen until the above asynchronousTestSleep calls back
    asynchronousTestSleep({$myTest3});
    console.log('exampleFn3', $myTest3);
  }
});

module.exports.seriesExample();
