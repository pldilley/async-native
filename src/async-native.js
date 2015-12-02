/*jslint node: true, evil: true, regexp: true, indent: 2, maxlen: 80*/
var Parallel = require('paralleljs');

/**
 * async-native
 * https://github.com/brentertz/scapegoat // TODO UPDATE GI LINK HERE
 *
 * Copyright (c) 2015 Paul Dilley
 * Licensed under the GPL and LGPL license.
 */


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
global.ParseError.prototype = Object.create(Error.prototype);


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
var ASYNC_ID_REGEXP = /\{\$N\}/;
var ASYNC_YIELD = '\nyield 1';
var ASYNC_REPLACE =
    'function(e, r) { $1 = r; nextAsyncNative(e, __it, {$N}, "$1"); }';

/**
 * Relates to wrapping the function up into a Generator and validation
 */
var FUNCTION_FIND_REGEXP = /function.*?\{/g;
var FUNCTION_REGEXP = /(function.*?\{)/;
var FUNCTION_GENERATOR = '\nfunction* yielder() { ';
var FUNCTION_ITERATOR = '\n__it = yielder.apply(this, arguments);' +
                        '\n__it.complete = [];' +
                        '\n__it.next();\n}\n';


var THREAD_REGEXP = /\$\:(.+?)[ \t]+=>[ \t]+\{/;
//var THREAD_RENDERER = function(varName, ) {
//
//};

/**
 * Global function to help restart Iterators after a callback completes
 *
 * @param  {String | Error} e           The error passed by the callback or null
 * @param  {<Iterator>} asyncIter       Internal: The generator's iterator
 * @throws:iterator {FutureError}       If the callback is passed an error
 * @throws {Error}                      If the callback causes an unknown error
 */
global.nextAsyncNative = function(e, __it, id, varName) {
  if (__it.complete.indexOf(id) === -1) {
    try {
      if (!e) {
        __it.next();
      } else {
        var eIsErr = e instanceof Error;
        var error = new global.FutureError(eIsErr ? e.message : e);
        error.prototype = eIsErr ? e.prototype : Object.create(Error.prototype);
        __it.throw(error);
      }
      __it.complete.push(id);
    } catch(f) {
      // A TypeError happens if the callback is immediately called in the same
      // call stack that the asynchronous function was called. The yield has to
      // be hit first before the generator can continue. Shift to another stack
      if (f instanceof TypeError) {
        setTimeout(global.nextAsyncNative.bind(this, e, __it, id, varName), 0);
      } else {
        throw f;
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
 * @throws:iterator {FutureError}       If the callback is passed an error
 */
global.threadAsyncNative = function(fn, data, callback) {
    new Parallel(data).spawn(fn).then(function(result) {
      //TODO WHERE DO I GET ERRORS?
      callback(null, result);
    });
};



module.exports = {
  /**
   * Returns a register object bound to a evalFn function that can capture
   * the Lexical Context of the original module
   *
   * @param  {Function} evalFn    A specific function that returns eval's result
   * @param  {boolean} outputFns  true to output function strings for debugging
   * @return {Object} register    register function bound to the passed function
   * @throws {ParseError}         If the passed function is not a function
   */
  init: function(evalFn, outputFns) {
    if (HELPERS.isFunction(evalFn)) {
      return process.bind({ evalFn: evalFn, outputFns: !!outputFns });
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
 * @param  {Object} evalFn   The object containing async functions
 */
function process(obj) {
  for (var itemName in obj) {
    if (HELPERS.isFunction(obj[itemName])) {
      var fnString = obj[itemName].toString();

      // We only need to re-write the function if it contains instances
      if (fnString.match(ASYNC_PLACEHOLDER_REGEXP)
          || fnString.match(THREAD_REGEXP)) {

        var newCode = rewriteFunction(itemName, fnString);
        obj[itemName] = this.evalFn('(' + newCode + ')');

        if (this.outputFns) {
          HELPERS.debugFunction(obj[itemName]);
        }
      }
    }
  }

  return obj;
}

/**
 * Rewrites a specific function string into a Generator
 *
 * @param  {String} fnName    The name (or key) of the function
 * @return {String} fnString  The string source of the function
 * @returns {String}          The string result of processing the function
 */
function rewriteFunction(fnName, fnString) {
  // All the source could be on one line potentially, so let's always do it
  var asyncVarList = ['__it'];
  var fnCollapsed = HELPERS.cleanNewLineAndComments(fnString);
  fnCollapsed = HELPERS.rewriteThreads(fnName, fnCollapsed, asyncVarList);
  HELPERS.validateNoAsyncNestedFunctions(fnName, fnCollapsed);
  fnCollapsed = HELPERS.rewritePlaceholders(fnName, fnCollapsed, asyncVarList);
  fnCollapsed = HELPERS.transformFnToGenerator(fnCollapsed, asyncVarList);
  return HELPERS.uncleanNewLines(fnCollapsed);
}



var HELPERS = {
  isFunction: function(fn) {
    return typeof fn === 'function';
  },

  debugFunction: function(fn) {
    console.log('\n\n----------------------------\n\n' +
      fn.toString() + '\n\n----------------------------\n\n');
  },

  validateNoAsyncNestedFunctions: function(fnName, fnCollapsed) {
    var fnContents = fnCollapsed.substring(1);
    var nestedFns = fnContents.match(FUNCTION_FIND_REGEXP);

    if (nestedFns) {
      var idx = fnContents.indexOf(nestedFns[0]);
      //console.log(fnContents.substring(idx));
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

  cleanNewLineAndComments: function(fnString) {
    return fnString.replace(LINE_COMMENTS_WITH_COLON, '')
      .replace(/\n/g, NEW_LINE_PLACEHOLDER)
      .replace(ALL_MULTILINE_COMMENTS, '');
  },

  uncleanNewLines: function(fnString) {
    return fnString.replace(NEWLINE_REGEXP, '\n');
  },

  rewriteThreads: function(fnName, fnStr, asyncVarList) {
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
      if (asyncVarList.indexOf('$' + varName) === -1) {
        asyncVarList.push('$' + varName);
      }

      code = 'threadAsyncNative(function(' + varName + ') ' + code + ', ' + varName + ', {$__THREAD});\n$' + varName + '=$__THREAD';
      fnStr = fnStr.substring(0, threadIdx) + code + threadStr.substring(idxs.end);
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
  rewritePlaceholders: function(fnName, fnStr, asyncVarList) {
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
      if (asyncVarList.indexOf(match[1]) === -1) {
        asyncVarList.push(match[1]);
      }

      // Insert yield after the first colon found, after the placeholder
      afterPlaceholderParts.splice(1, 0, ASYNC_YIELD);
      fnStr = fnStr.substring(0, matchIndex) + afterPlaceholderParts.join(';');

      // Replace the placeholder with a callback
      fnStr = fnStr.replace(ASYNC_PLACEHOLDER_REGEXP,
                            ASYNC_REPLACE.replace(ASYNC_ID_REGEXP, i));
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
  transformFnToGenerator: function (fnCollapsed, asyncVarList) {
    var wrappedFn = fnCollapsed.replace(FUNCTION_REGEXP, '$1' +
      '\nvar ' + asyncVarList.join(', ') + ';' + FUNCTION_GENERATOR);

    return wrappedFn + FUNCTION_ITERATOR;
  },

  _findBlock: function(input, outputBlockStr) {
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
  }
};


