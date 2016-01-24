/*jslint node: true, evil: true, indent: 2, maxlen: 80, esnext: true, -W028*/

// STEP 1: Import the async-native module like this - passing an eval function like so
//    NOTE: In this example the arrow notation was used: "$ => eval($)" for short
//          We can pass a normal function too: "function($) { eval($); }"
var $async = require('./src/async-native.js').init($ => eval($));

// Define our test function that calls a callback only result
function resultOnlyCallbackFn(callback) {
  setTimeout(function() {
    callback("This is my result only test, with only one parameter (non-standard for node");
  }, 1000);
}

// Use $async to convert these functions to asychronous functions
module.exports = $async({

  // STEP 3: Don't pass callback's to the asynchronous methods you want to use
  //         Instead, use an async-native placeholder {$<var_name_that_will_be_populated}
  //         Treat these placeholders like normal callbacks within - i.e. "callback(error, result)"
  resultOnlyCallbackExample: function() {
    console.log('\n\No Error Callback example:\n');

    // STEP 4: Souround the placeholder by using the method: $async.noError
    //         This will produce a new callback function that wraps around the original injected one
    //         After this you only need to pass a result
    resultOnlyCallbackFn($async.noError({$myTestResultOnly}));

    console.log('exampleFn1', $myTestResultOnly);
  }
});

module.exports.resultOnlyCallbackExample();
