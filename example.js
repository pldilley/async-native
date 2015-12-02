/*jslint node: true, evil: true, indent: 2, maxlen: 80, esnext: true, -W028*/
var $async = require('./src/async-native.js').init($ => eval($));

// A test function that accepts a delay and a standard Node like callback
var testSleep = function(delay, callback) {
  setTimeout(function() {
    callback(null, new Date().getTime());
  }, delay);
};

// Output a dot to the console every second
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
    if (doBlink) blinking();
  }, 1000);
};

module.exports = $async({
  seriesExample: function(callback) {
    console.log('\n\nSeries example:\n');

    testSleep(1000, {$myTest1}); /* <-- WILL PAUSE HERE (SEMI-COLON IMPORTANT) */
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
      testA: testSleep(2000, {$myTest1}),
      testB: testSleep(1, {$myTest2}),
      testC: testSleep(200, {$myTest3})
    }; /* <-- WILL PAUSE HERE (THIS SEMI-COLON IS ESSENTIAL) */

    // Will print out after 3000 ms only
    console.log('A', $myTest1);
    console.log('B', $myTest2);
    console.log('C', $myTest3);

    callback(null, null);
  },

  noThreadExample: function(callback) {
    console.log('\n\nNo Threading example:\n');

    blinking(true);

    var fib = 43;

    function fibo (n) {
      return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
    }

    console.log(fibo(fib));

    blinking(false);

    callback(null, null);
  },

  threadExample: function(callback) {
    console.log('\n\nThreading example:\n');

    blinking(true);

    var fib = 43;

    $:fib => {
      function fibo (n) {
        return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
      }

      return fibo(fib);
    };

    console.log($fib);

    blinking(false);

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
      module.exports.noThreadExample({$three});
      module.exports.threadExample({$four});
      module.exports.asyncErrorExample({$five});
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
