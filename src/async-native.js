/*jslint node: true, evil: true, regexp: true, indent: 2, maxlen: 80*/
if (!global) {
  global = window;
}

require("./exceptions");  // Will inject all of the exceptions into "global"
require("./responders");  // Will inject all the responding fns into "global"
var Processing = require("./processing"); // Provides processing functions
/**
 * async-native
 * https://github.com/brentertz/scapegoat // TODO UPDATE GI LINK HERE
 *
 * Copyright (c) 2015 Paul Dilley
 * Licensed under the GPL and LGPL license.
 */





/**
 * Must be using a version of node that supports generators or enables them
 */
try {
  eval('(function *(){})');
} catch (err) {
  throw new global.ParseError('Missing Generators ES6 support',
    '--harmony_generators');
}


module.exports = {
  /**
   * Returns a register object bound to a evalFn function that can capture
   * the Lexical Context of the original module
   *
   * @param  {Function} evalFn    A specific function that returns eval's result
   * @param  {boolean} options    An object of supported options:
   *                                * outputConvertedFns - print out converted options
   * @return {Object} register    register function bound to the passed function
   * @throws {ParseError}         If the passed function is not a function
   */
  init: function init(evalFn, options) {
    if (Processing.isFunction(evalFn)) {
      // Run a test to ensure they specified an eval function
      global._asyncEvalFnCopy = this;   // because always: this !== evalFn
      global._asyncEvalFn = evalFn;
      evalFn('global._asyncEvalFnCopy = global._asyncEvalFn');

      if (global._asyncEvalFnCopy !== evalFn) {
        throw new global.ParseError('"eval" function is not valid:\n\n' +
            ((evalFn && evalFn.toString) ? evalFn.toString() : '<?>') + '\n');
      }

      // Return a customised function if we have a successful eval function
      var processFn = Processing.process.bind({ 
        evalFn: evalFn, 
        options: options 
      });
      processFn.noError = noError;
      processFn.timeout = timeout;
      processFn.ignoreMultipleCallback = ignoreMultipleCallback;
      return processFn;
    } else {
      throw new global.ParseError('"eval" function is not a function:\n\n' +
        ((evalFn && evalFn.toString) ? evalFn.toString() : '<?>') + '\n');
    }
  }
};

/**
 * Produces a wrapper callback to handle callbacks with just one result parameter
 *
 * @param   {Function} callback  The original callback as produced by async-native
 * @returns {Function}           The wrapper callback
 */
function noError(callback) {
  /**
   * @param  {String} res     The response from the developer
   */
  return function noError_handler(res) {
    callback(null, res);
  };
}

/**
 * Produces a wrapper callback to handle callbacks with just one result parameter
 *
 * @param   {Function} callback  The original callback as produced by async-native
 * @returns {Function}           The wrapper callback
 */
function ignoreMultipleCallback(callback) {
  /**
   * @param  {String} res     The response from the developer
   */
  var handler = function ignoreMultipleCallback_handler(err, res) {
    if (!handler.asyncHasExecuted) {
      handler.asyncHasExecuted = true;

      if (handler.timer) {
        clearTimeout(handler.timer);
      }

      callback(err, res);
    }
  };

  return handler;
}

/**
 * Produces a wrapper callback to handle callbacks with just one result parameter
 *
 * @param   {Function} callback  The original callback as produced by async-native
 * @returns {Function}           The wrapper callback
 */
function timeout(callback, milliseconds) {
  /**
   * @param  {String} res     The response from the developer
   */
  var handler = ignoreMultipleCallback(callback);

  var timer = setTimeout(function() {
    handler(new global.TimeoutError(), null);
  }, milliseconds);

  handler.timer = timer;

  return handler;
}
