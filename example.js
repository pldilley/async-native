/*jslint node: true, evil: true, indent: 2, maxlen: 80, esnext: true, -W028*/

// Import the async-native module like this
var $async = require('./src/async-native.js').init($ => eval($), {
      outputConvertedFns: true,       // console.log's the converted function source
      outputTimesOfFns: true         // console.log's the time it took to process the functions
    });

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
  },

  parallelExample: function () {
    console.log('\n\nParallel example:\n');

    // These are called in parallel
    var parallelCalls = {
      testA: testSleep(2000, {$myTest1}),
      testB: testSleep(1, {$myTest2}),
      testC: testSleep(200, {$myTest3})
    }; /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */

    // Will print out after 2000 ms only
    console.log('A', $myTest1);
    console.log('B', $myTest2);
    console.log('C', $myTest3);
  },

  nonErrorCallbackExample: function() {
    console.log('\n\No Error Callback example:\n');
    testSleep(1000, $async.noError({$myTestNoError}), true); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
    console.log('exampleFn1', $myTestNoError);
  },

  noThreadExample: function() {
    console.log('\n\nNo Threading example:\n');

    blinking(true);

    var fib = 43;

    function fibo (n) {
      return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
    }

    console.log(fibo(fib));

    blinking(false);
  },

  threadExample: function() {
    console.log('\n\nThreading example:\n');

    blinking(true);

    var fib = 43;

    try {
      // Executes the provided code immediately
      $:fib => {
        function fibo (n) {
          return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }

        fibo(fib);

        //throw "BOGUS ERROR";

        return false; //fibo(fib);
      };  /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */

    } catch (e) {
      // Errors that occur inside the thread can be caught
      if (e instanceof ThreadError) {
        console.log('Error via thread was:', e.message, '\n');
      } else {
        console.log('Unexpected error was:', e.message, '\n');
      }
      console.log(e.stack, '\n');
    }

    console.log($fib);

    blinking(false);
  },

  asyncErrorExample: function() {
    // What happens if an error occurs inside the method being called?
    console.log('\n\nError example:\n');

    function willMakeAnError(callback) {
      setTimeout(function() {
        callback(new Error("This is a delayed test error"));
      }, 1000);

      //callback(new Error("This is an immediate test error")); // Handled too
    }

    try {
      willMakeAnError({$doMeAnError});
    } catch (e) {
      if (e instanceof FutureError) {
        console.log('Error via async was:', e.message);
      } else {
        console.log('Immediate error was:', e.message);
      }
      console.log('\n', e);
      console.log(e.stack);
    }
  },

  ignoreMultipleCallbackExample: function() {
    console.log('\n\nIgnore Multiple Callback example:\n');

    function willCallbackTwice(callback) {
      callback(null, true);
      callback(null, false);
    }

    // Call a method which will callback twice (usually results in error)
    willCallbackTwice($async.ignoreMultipleCallback({$callback}));

    console.log("value is " + $callback);
  },

  timeoutExample: function() {
    console.log('\n\nTimeout example:\n');

    // Make a really long sleep, too long, and we'll have it timeout with an error
    testSleep(2000, $async.timeout({$timeout}, 1000));
  }
});


var example = $async({
  init: function() {
    module.exports.seriesExample({$});
    module.exports.parallelExample({$});
    module.exports.nonErrorCallbackExample({$});
    module.exports.noThreadExample();
    module.exports.threadExample({$});
    module.exports.asyncErrorExample({$});
    module.exports.ignoreMultipleCallbackExample({$});
    module.exports.timeoutExample({$});
  }
});

example.init();




