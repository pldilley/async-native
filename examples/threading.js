/*jslint node: true, evil: true, indent: 2, maxlen: 80, esnext: true, -W028*/

// STEP 1: Import the async-native module like this - passing an eval function like so
//    NOTE: In this example the arrow notation was used: "$ => eval($)" for short
//          We can pass a normal function too: "function($) { eval($); }"
var $async = require('./src/async-native.js').init($ => eval($));

// A method to blink a dot on the screen every second
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


module.exports = $async({   // STEP 2: Use $async to convert functions within to asychronous functions and threads

  // Below is an example of the same function, one written to run in the current javascript execution thread, and one
  // written to run it a seperate javascript thread. Both alculate the fibonachi sequence up to 43 - using techniques
  // that take a long time. During each function run, a dot is meant to blink every second on the console.

  // In the no-thread example, the dot does not blink becuse the fibonachi function locks up the thread - blocking any
  // other execution (a scalability problem when it comes to lengthly calculations)
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

  // In this example we are executing the fibonachi calculations in a seperate thread, allowing two (or more) operations
  // to run concurrently. Now we will continue to see the blinking whilst calculations are being performed.
  //
  // There are several gotchas to watch out for with threads:
  // 1. A thread can only take one variable in, which must be serializable to JSON.
  //    So it can take objects, arrays, strings, etc - but it cannot take functions or Error objects etc.
  //
  // 2. You then return the result, and it is inserted into a new variable, which is the original variable name prepended
  //    with a dollar sign. So in this example: fib ---> $:fib { ... return fib ... } ---> $fib
  //
  // 3. Everything is copied. So fib !== $fib - you get a new result every time (i.e. not pass by reference)
  //
  // 4. If you're thread might throw an error, it's good to catch it by wrapping the entire thread code into a try
  //    catch block. If an error happens inside the thread, a ThreadError will bubble up
  //
  // 5. Threads must always end in a semi-colon. You can use clever tricks to get around this problem (see below).
  threadExample: function() {
    console.log('\n\nThreading example:\n');

    blinking(true);

    var fib = 43;

    try {
      // Executes the provided code immediately
      $:fib => {
        function fibo(n) {
          return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }

        return fibo(fib);
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

    console.log('43:', $fib);

    blinking(false);
  },

  // You can run
  threadExample2: function() {
    console.log('\n\nThreading example:\n');

    blinking(true);

    var fib = 42;

    try {
      // Executes the provided code immediately
      $:fib => {
        function fibo(n) {
          return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
        }

        return fibo(fib);
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

    console.log('42:', $fib);

    blinking(false);
  }
});

// RUN THE LIST OF EXAMPLES
//module.exports.seriesExample();
//module.exports.parallelExample();
//module.exports.nonErrorCallbackExample();
//module.exports.noThreadExample();
module.exports.threadExample();
//module.exports.asyncErrorExample();



