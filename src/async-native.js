/*jslint node: true, evil: true, regexp: true, indent: 2, maxlen: 80*/
var Parallel = require('paralleljs');

/**
 * async-native
 * https://github.com/brentertz/scapegoat // TODO UPDATE GI LINK HERE
 *
 * Copyright (c) 2015 Paul Dilley
 * Licensed under the GPL and LGPL license.
 */


if (!global) {
  global = window;
}

/**
 * Error for processing errors
 */
global.ParseError = function ParseError(message, fnKey) {
  Error.captureStackTrace(this);
  var msg = 'async-native - Unable to parse! ' +
    (fnKey ? '("' + fnKey + '")' : '') + '\n';
  this.message = msg + '            ' + message;
  this.name = "ParseError";
};

/**
 * Error for callback errors
 */
global.FutureError = function FutureError(message) {
  Error.captureStackTrace(this);
  var msg = 'async-native - A callback returned an error\n';
  this.message = msg + message;
  this.name = "FutureError";
};

/**
 * Error for callback errors
 */
global.ThreadError = function ThreadError(fileName, varName, message, stack) {
  var msg = 'async-native - Error in "' + fileName + ' (function) --> $:' +
            varName + ' (thread)"\n';
  this.message = msg + message;
  this.originalMessage = '';
  this.name = "ThreadError";
  this.stack = '    Internal Thread ' + stack.replace(message, '')
      .replace(new RegExp('\\$' + varName, 'g'), '$:' + varName);
};

global.ParseError.prototype = Object.create(Error.prototype);
global.ThreadError.prototype = Object.create(Error.prototype);


/**
 * Must be using a version of node that supports generators or enables them
 */
try {
  eval('(function *(){})');
} catch (err) {
  throw new global.ParseError('Missing Generators ES6 support',
    '--harmony_generators');
}



/**
 * Relates to newlines and comment cleaning
 * - The actual processing is done with the the function on one line
 * - Comments containing ';' confuse things, so we also remove those
 */
var NEW_LINE_PLACEHOLDER = '<{NEW_LINE}>';
var NEWLINE_REGEXP = /<\{NEW_LINE\}>/g;
var LINE_COMMENTS_WITH_COLON = /\/\/.*?;.*?\n/g;
var ALL_MULTILINE_COMMENTS = /\/\*(\n|.)*?\*\//g;

/**
 * Relates to placeholders and yields
 * - Placeholders get replaced with callback functions
 * - Yields are replaced after the placeholder's next nearest ';'
 */
var ASYNC_PLACEHOLDER_REGEXP = /\{(\$[\w\$]+?)\}/;
var ASYNC_YIELD = '\nyield 1';
var ASYNC_REPLACE_RENDERER =
    function ASYNC_REPLACE_RENDERER(fnName, id, ignoreMultipleCallback) {
  return 'function callback_' + fnName + '_' + id + '(e, r) { ' +
      '$1 = r; ' +
      'callbackAsyncNative(e, __it, ' + id + ', "$1", ' +
      !!ignoreMultipleCallback + ');' +
  '}';
};


/**
 * Relates to wrapping the function up into a Generator and validation
 */
var FUNCTION_FIND_REGEXP = /function.*?\{/g;
var FUNCTION_REGEXP = /(function.*?\{)/;
var FUNCTION_GENERATOR = function(fnName) {
  return '\nfunction* yielder_' + fnName + '() { ';
};
var FUNCTION_ITERATOR = function(fnName) {
  return '\n__it = yielder_' + fnName + '.apply(this, arguments);' +
  '\n__it.complete = [];' +
  '\n__it.next();\n}\n';
};


var THREAD_REGEXP = /\$\:(.+?)[ \t]+=>[ \t]+\{/;
var THREAD_RENDERER = function THREAD_RENDERER(fnName, varName, code) {
  return 'threadAsyncNative(' +
      '"' + fnName + '", "' + varName + '", ' +
      'function $' + varName + '(' + varName + ') {\n' +
        'try ' + code +
        '\ncatch(e) {\n' +
          'return { __asyncError: e.message, stack: e.stack };\n' +
        '}\n' +
      '}, ' +
      varName + ', ' +
      '{$__THREAD});\n' +
      '$' + varName + '=$__THREAD';
};

/**
 * Global function to help restart Iterators after a callback completes
 *
 * @param  {String | Error} e           The error passed by the callback or null
 * @param  {<Iterator>} asyncIter       Internal: The generator's iterator
 * @throws:iterator {FutureError}       If the callback is passed an error
 * @throws {Error}                      If the callback causes an unknown error
 */
global.callbackAsyncNative = function callbackAsyncNative(e, __it, id, varName) {
  if (__it.complete.indexOf(id) === -1) {
    try {
      if (!e) {
        __it.next();
      } else if (e instanceof global.ThreadError) {
        __it.throw(e);
      } else {
        var eIsErr = e instanceof Error;
        var error = new global.FutureError(eIsErr ? e.message : e);
        error.stack = e.stack;
        error.prototype = eIsErr ? e.prototype : Object.create(Error.prototype);
        __it.throw(error);
      }
      __it.complete.push(id);
    } catch(asyncNativeError) {
      // A TypeError happens if the callback is immediately called in the same
      // call stack that the asynchronous function was called. The yield has to
      // be hit first before the generator can continue. Shift to another stack
      if (asyncNativeError instanceof TypeError) {
        setTimeout(global.callbackAsyncNative.bind(this, e, __it, id, varName),
                   0);
      } else {
        throw asyncNativeError;
      }
    }
  } else {
    // TODO MAKE CONDITIONAL - ALLOW IGNORE OPTION
    throw new global.FutureError('The same callback was called twice', varName);
  }
};

/**
 * Global function to help start threads
 *
 * @param  {Function} fn                The function to start in a thread
 * @param  {JSON} data                  Json like data (objects, arrays, etc)
 * @param  {Function} callback          Callback once complete with the result
 * @throws {ThreadError | Error}        If the callback is passed an error (or one bubbles up)
 */
global.threadAsyncNative =
  function threadAsyncNative(fileName, varName, fn, data, callback) {
    new Parallel(data).spawn(fn).then(function(result) {
      if (result.__asyncError) {
        var err = new global.ThreadError(fileName, varName,
                                         result.__asyncError, result.stack);
        callback(err, null);
      } else {
        callback(null, result);
      }
    }, function(unknownThreadError) {
      throw unknownThreadError;  // Should never happen but just in case to terminate everything
    });
};



module.exports = {
  /**
   * Returns a register object bound to a evalFn function that can capture
   * the Lexical Context of the original module
   *
   * @param  {Function} evalFn    A specific function that returns eval's result
   * @param  {boolean} options    An object of supported options:
   *                                * outputConvertedFns - print out converted options
   *                                * ignoreMultipleCallback - don't error on multiple callback calls
   *                                * postProcessor - a method that does extra processing to the string code of a function
   * @return {Object} register    register function bound to the passed function
   * @throws {ParseError}         If the passed function is not a function
   */
  init: function init(evalFn, options) {
    if (HELPERS._isFunction(evalFn)) {
      // Run a test to ensure they specified an eval function
      global._asyncEvalFnCopy = this;   // because always: this !== evalFn
      global._asyncEvalFn = evalFn;
      evalFn('global._asyncEvalFnCopy = global._asyncEvalFn');

      if (global._asyncEvalFnCopy !== evalFn) {
        throw new global.ParseError('"eval" function is not valid:\n\n' +
            ((evalFn && evalFn.toString) ? evalFn.toString() : '<?>') + '\n');
      }

      // Return a customised function if we have a successful eval function
      var processFn = process.bind({ evalFn: evalFn, options: options });
      processFn.noError = noError;
      return processFn;
    } else {
      throw new global.ParseError('"eval" function is not a function:\n\n' +
        ((evalFn && evalFn.toString) ? evalFn.toString() : '<?>') + '\n');
    }
  }
};



/**
 * Processes all functions in a passed object, getting them into the Lexical
 * Scope of the original method by using a evalFn function
 *
 * @this   {Scope} this      The scope should contain a evalFn function
 *                           and possibly a set of options
 * @param  {Object} evalFn   The object containing async functions
 */
function process(obj) {
  for (var itemName in obj) {
    if (HELPERS._isFunction(obj[itemName])) {
      var fnString = obj[itemName].toString();

      // We only need to re-write the function if it contains instances
      if (fnString.match(ASYNC_PLACEHOLDER_REGEXP) ||
          fnString.match(THREAD_REGEXP)) {

        var newCode = rewriteFunction(itemName, fnString,
            this.options && this.options.ignoreMultipleCallback);

        if (this.options && HELPERS._isFunction(this.options.postProcessor)) {
          newCode = this.options.postProcessor(itemName, newCode);
        }

        obj[itemName] = this.evalFn('(' + newCode + ')');

        if (this.options && this.options.outputConvertedFns) {
          HELPERS._debugFunction(obj[itemName]);
        }
      }
    }
  }

  return obj;
}

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
 * Rewrites a specific function string into a Generator
 *
 * @param  {String} fnName    The name (or key) of the function
 * @return {String} fnString  The string source of the function
 * @returns {String}          The string result of processing the function
 */
function rewriteFunction(fnName, fnString, ignoreMultipleCallback) {
  // All the source could be on one line potentially, so let's always do it
  var asyncVarList = ['__it'];
  var fnCollapsed = HELPERS.cleanNewLineAndComments(fnString);

  fnCollapsed = HELPERS.rewriteThreads(fnName, fnCollapsed, asyncVarList);
  HELPERS.validateNoAsyncNestedFunctions(fnName, fnCollapsed);
  fnCollapsed = HELPERS.rewritePlaceholders(fnName, fnCollapsed, asyncVarList,
                                            ignoreMultipleCallback);
  fnCollapsed = HELPERS.transformFnToGenerator(fnName, fnCollapsed,
                                               asyncVarList);

  return HELPERS.uncleanNewLines(fnCollapsed);
}



var HELPERS = {
  /**
   * Checks that there are no nested functions with async placeholders inside
   *
   * @param  {String} fnName                  The name (or key) of the function
   * @param  {String} fnCollapsed             The string source of the function
   */
  validateNoAsyncNestedFunctions:
    function validateNoAsyncNestedFunctions(fnName, fnCollapsed) {
      var fnContents = fnCollapsed.substring(1);
      var nestedFns = fnContents.match(FUNCTION_FIND_REGEXP);

      if (nestedFns) {
        var idx = fnContents.indexOf(nestedFns[0]);

        for (var i=1; i <= nestedFns.length; i++) {
          var code = HELPERS._findBlock(fnContents.substring(idx), true);

          if (code.match(ASYNC_PLACEHOLDER_REGEXP)) {
            throw new global.ParseError('Nested functions cannot contain ' +
              'asynchronous placeholders or threads', fnName);
          }

          fnContents = fnContents.substring(idx + 1);
          idx = fnContents.indexOf(nestedFns[i]);
        }
      }
  },

  /**
   * Clean new lines and comments out of a passed string
   *
   * @param  {String} fnString                The source string
   * @return {String}                         The sanatised string
   */
  cleanNewLineAndComments: function cleanNewLineAndComments(fnString) {
    return fnString.replace(LINE_COMMENTS_WITH_COLON, '')
      .replace(/\n/g, NEW_LINE_PLACEHOLDER)
      .replace(ALL_MULTILINE_COMMENTS, '');
  },


  /**
   * UnClean new lines out of a passed string
   *
   * @param  {String} fnString                The source string
   * @return {String}                         The unsanatised string
   */
  uncleanNewLines: function uncleanNewLines(fnString) {
    return fnString.replace(NEWLINE_REGEXP, '\n');
  },

  /**
   * Converts thread objects to runnable threads
   *
   * @param  {String} fnName                  The name (or key) of the function
   * @return {String} fnStr                   The string source of the function
   * @return {Array<String>} asyncVarList     Array to append variable names to
   * @returns {String}                        The processing string result
   */
  rewriteThreads: function rewriteThreads(fnName, fnStr, asyncVarList) {
    var match;

    while ((match = fnStr.match(THREAD_REGEXP))) {
      var varName = match[1];
      var threadIdx = fnStr.indexOf(match[0]);
      var threadStr = fnStr.substring(threadIdx);
      var idxs = HELPERS._findBlock(threadStr);
      var code = threadStr.substring(idxs.start, idxs.end);

      // There must be a colon after the thread, otherwise the programmer
      // has messed up
      if (threadStr.charAt(idxs.end + 1) === ';') {
        throw new global.ParseError('No semicolon after ' + match[0], fnName);
      }

      // Add the matched variable (without brackets) to a definition list
      HELPERS._addToArray(asyncVarList, '$' + varName);

      // TODO Move to renderer
      code = THREAD_RENDERER(fnName, varName, code);

      fnStr = fnStr.substring(0, threadIdx) + code +
              threadStr.substring(idxs.end);
    }

    return fnStr;
  },

  /**
   * Rewrites all of the placeholder into callbacks and adds the yield keywords
   * at the next proceeding ';' after each placeholder
   *
   * @param  {String} fnName                  The name (or key) of the function
   * @return {String} fnStr                   The string source of the function
   * @return {Array<String>} asyncVarList     Array to append variable names to
   * @returns {String}                        The processing string result
   */
  rewritePlaceholders: function rewritePlaceholders(fnName, fnStr, asyncVarList, ignoreMultipleCallback) {
    var match;
    var i = 0;

    while ((match = fnStr.match(ASYNC_PLACEHOLDER_REGEXP))) {
      i++;
      var matchIndex = fnStr.indexOf(match[0]);
      var afterPlaceholderParts = fnStr.substring(matchIndex).split(';');

      // There must be a colon after the placeholder, otherwise the programmer
      // has messed up
      if (afterPlaceholderParts.length < 2) {
        throw new global.ParseError('No semicolon after ' + match[0], fnName);
      }

      // Add the matched variable (without brackets) to a definition list
      HELPERS._addToArray(asyncVarList, match[1]);

      // Insert yield after the first colon found, after the placeholder
      afterPlaceholderParts.splice(1, 0, ASYNC_YIELD);
      fnStr = fnStr.substring(0, matchIndex) + afterPlaceholderParts.join(';');

      // Replace the placeholder with a callback
      fnStr = fnStr.replace(
        ASYNC_PLACEHOLDER_REGEXP,
        ASYNC_REPLACE_RENDERER(fnName, i, ignoreMultipleCallback)
      );
    }

    return fnStr;
  },

  /**
   * Rewrites the function into a generaotr
   *
   * @return {String} fnCollapsed             The string source of the function
   * @return {Array<String>} asyncVarList     Array for variable definitions
   * @returns {String}                        The processing string result
   */
  transformFnToGenerator:
    function transformFnToGenerator(fnName, fnCollapsed, asyncVarList) {
      var wrappedFn = fnCollapsed.replace(FUNCTION_REGEXP, '$1' +
        '\nvar ' + asyncVarList.join(', ') + ';' + FUNCTION_GENERATOR(fnName));

      return wrappedFn + FUNCTION_ITERATOR(fnName);
    },



  _isFunction: function _isFunction(fn) {
    return typeof fn === 'function';
  },

  _debugFunction: function _debugFunction(fn) {
    console.log('\n\n----------------------------\n\n' +
        fn.toString() + '\n\n----------------------------\n\n');
  },

  /**
   * Finds the first block of code possible, e.g. {.....}
   *
   * @return {String} input                   The input string source fragment
   * @return {Boolean} outputBlockStr         Set to true to output a string rather than coordinates
   * @returns {Object | String}               The processing string result
   */
  _findBlock: function _findBlock(input, outputBlockStr) {
    var block = { start: -1, end: -1 };
    var i = input.indexOf('{');
    var x = 0;

    if (i > -1) {
      for ( ; i < input.length; i++) {
        x += input[i] === '{' ? +1 : (input[i] === '}' ? -1 : 0);
        if (x > 0 && block.start === -1) {
          block.start = i;
        } else if (x === 0 && block.start > -1 && block.end === -1) {
          block.end = i + 1;
          break;
        }
      }
    }
    return !outputBlockStr ? block
      : (block.start > -1 ? input.substring(block.start, block.end) : '');
  },

  _addToArray: function _addToArray(array, item) {
    if (array.indexOf(item) === -1) {
      array.push(item);
    }
  }
};
