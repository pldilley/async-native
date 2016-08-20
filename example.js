/*jslint node: true, evil: true, indent: 2, maxlen: 80, esnext: true, -W028*/

// Import the async-native module like this
var $async = require('./src/async-native.js').init($ => eval($), {
      // outputConvertedFns: true,       // console.log's the converted function source
      outputTimesOfFns: true,         // console.log's the time it took to process the functions
      skipReturnYieldCheck: false     // Set to true to supress ParseError caused by use of return/yield
    }, this);

// A test function that accepts a delay and a standard Node like callback
var testSleep = function(delay, callback, withOneArgOnly) {
  setTimeout(function() {
    if (withOneArgOnly) {
      callback(new Date().getTime());
    } else {
      callback(null, new Date().getTime());
    }
  }, delay);
};

// A yesy function that outputs a dot to the console every second
var doBlink = true;
var blinking = function(setState) {
  if (setState === false) {
    doBlink = false;
    return;
  } else if (setState === true) {
    doBlink = true;
  }

  setTimeout(function() {
    console.log('.');
    if (doBlink) {
      blinking();
    }
  }, 1000);
};

// Use $async to convert these functions to asychronous functions
module.exports = $async({
  seriesExample: function() {
    console.log('\n\nSeries example:\n');

    testSleep(1000, {$myTest1}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest1);

    testSleep(2000, {$myTest2}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest2);

    testSleep(1000, {$myTest3}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTest3);
  }

  // seriesLoopExample: function () {
  //   console.log('\n\nSeries Loop example:\n');

  //   for (var i=1000; i < 5000; i+=1000) {
  //     testSleep(i, {$}); /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */
  //     console.log("DONE TEST: " + i + "ms");
  //   }
  // },

  // parallelExample: function () {
  //   console.log('\n\nParallel example:\n');

  //   // These are called in parallel
  //   var parallelCalls = {
  //     testA: testSleep(2000, {$myTest1}),
  //     testB: testSleep(1, {$myTest2}),
  //     testC: testSleep(200, {$myTest3})
  //   };  // <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) 

  //   // Will print out after 2000 ms only
  //   console.log('A', $myTest1);
  //   console.log('B', $myTest2);
  //   console.log('C', $myTest3);
  // },

  // parallelLoopExample: function () {
  //   console.log('\n\nParallel Loop example:\n');

  //   for (var i=1000; i < 5000; i+=1000) {
  //     testSleep(i, {$}),
  //     console.log('DOING TEST: ' + i + 'ms')
  //   };  /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */

  //   // Will print out after 5000 ms only
  //   console.log("DONE TEST");
  // },

  // nonErrorCallbackExample: function() {
  //   console.log('\n\No Error Callback example:\n');
  //   testSleep(1000, $async.noError({$myTestNoError}), true); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
  //   console.log('exampleFn1', $myTestNoError);
  // },

  // noThreadExample: function() {
  //   console.log('\n\nNo Threading example:\n');

  //   blinking(true);

  //   var fib = 43;

  //   function fibo (n) {
  //     return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
  //   }

  //   console.log(fibo(fib));

  //   blinking(false);
  // },

  // threadExample: function() {
  //   console.log('\n\nThreading example:\n');

  //   blinking(true);

  //   var fib = 43;

  //   try {
  //     // Executes the provided code immediately
  //     $:fib => {
  //       function fibo (n) {
  //         return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
  //       }

  //       fibo(fib);

  //       //throw "BOGUS ERROR";

  //       return false; //fibo(fib);
  //     };  /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */
  //   } catch (e) {
  //     // Errors that occur inside the thread can be caught
  //     if (e instanceof ThreadError) {
  //       console.log('Error via thread was:', e.message, '\n');
  //     } else {
  //       console.log('Unexpected error was:', e.message, '\n');
  //     }
  //     console.log(e.stack, '\n');
  //   }

  //   console.log($fib);

  //   blinking(false);
  // },

  // asyncErrorExample: function() {
  //   // What happens if an error occurs inside the method being called?
  //   console.log('\n\nAsync Error example:\n');

  //   function willMakeAnError(callback) {
  //     setTimeout(function() {
  //       callback(new Error("This is a delayed test error"));
  //     }, 1000);

  //     //callback(new Error("This is an immediate test error")); // Handled too
  //   }

  //   try {
  //     willMakeAnError({$doMeAnError});
  //   } catch (e) {
  //     if (e instanceof FutureError) {
  //       console.log('Error via async was:', e.message);
  //     } else {
  //       console.log('Immediate error was:', e.message);
  //     }
  //     console.log('\n', e);
  //     console.log(e.stack);
  //   }
  // },

  // ignoreMultipleCallbackExample: function() {
  //   console.log('\n\nIgnore Multiple Callback example:\n');

  //   function willCallbackTwice(callback) {
  //     callback(null, true);
  //     callback(null, false);
  //   }

  //   // Call a method which will callback twice (usually results in error)
  //   willCallbackTwice($async.ignoreMultipleCallback({$callback}));

  //   console.log("value is " + $callback);
  // },

  // anonymousErrorHandling: function(hypotheticalResultObj) {
  //   console.log('\n\Anonymous Error Handling example:\n');

  //   testSleep(1, {$myTest1}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */

  //   // You can throw an error (for anonymous only)
  //   throw new Error("POOP");

  //   hypotheticalResultObj.whatever = true;
  // },

  // timeoutExample: function() {
  //   console.log('\n\nTimeout example:\n');

  //   // Make a really long sleep, too long, and we'll have it timeout with an error
  //   testSleep(2000, $async.timeout({$timeout}, 1000));
  // },

  // badIdeas: function() {
  //   console.log('\n\n\n\nWhat NOT to do:\n');

  //   console.log('- Reusing a placeholder via a variable...');
  //   // You cannot reuse the same placeholder more than once
  //   // var a = {$badIdea},
  //   //     b = testSleep(1000, a),
  //   //     c = testSleep(1001, a);  

  //   console.log('- Reusing a named placeholder...');
  //   // You cannot repeat the same placeholder more than once
  //   // testSleep(1000, {$badIdea});
  //   // testSleep(1001, {$badIdea});

  //   console.log('- Reusing a named placeholder in a loop...');
  //   // You cannot reuse the same placeholder more than once
  //   // for (var i=0; i < 2; i++) {
  //   //   testSleep(1000, {$badIdea});
  //   // }

  //   console.log('- Using a placeholer with a semi-colon after it...');
  //   //{$test};  // This has no hope of being called!
  // }
});


var example = $async({
  init: function init() {
    console.log(module.id);
    module.exports.seriesExample({$});
    // module.exports.seriesLoopExample({$});
    // module.exports.parallelExample({$});
    // module.exports.parallelLoopExample({$});
    // module.exports.nonErrorCallbackExample({$});
    // module.exports.noThreadExample();
    // module.exports.threadExample({$});
    // module.exports.asyncErrorExample({$});
    // module.exports.ignoreMultipleCallbackExample({$});

    // try {
    //   var hypotheticalResultObj = {};
    //   module.exports.anonymousErrorHandling(hypotheticalResultObj, {$});
    // } catch(e) {
    //   if (e.asyncFnName === 'init::(anonymousErrorHandling)') {
    //     console.log('Expected error', e);
    //   } else {
    //     console.log('Unknown error', e);
    //   }
    // }

    // try {
    //   module.exports.timeoutExample({$});
    // } catch(e) {
    //   if (e.asyncFnName === 'timeoutExample') {
    //     console.log('Expected error', e);
    //   } else {
    //     console.log('Unknown error', e);
    //   }
    // }

    //module.exports.badIdeas({$});
  }
});

example.init();




