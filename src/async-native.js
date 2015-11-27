/**
 * async-native
 * https://github.com/brentertz/scapegoat // TODO UPDATE GI LINK HERE
 *
 * Copyright (c) 2015 Paul Dilley
 * Licensed under the GPL and LGPL license.
 */

var ERRORS = {
  /**
   * Error for processing errors
   */
  ParseError: function ParseError(message, fnKey) {
     Error.captureStackTrace(this);
     var msg = 'async-native - Unable to parse! ' +
      (fnKey ? '("' + fnKey + '")' : '') + '\n';
     this.message = msg + '            ' + message;
     this.name = "ParseError";
  },

  /**
   * Error for callback errors
   */
  FutureError: function FutureError(message) {
     Error.captureStackTrace(this);
     var msg = 'async-native - A callback returned an error\n';
     this.message = msg + message;
     this.name = "FutureError";
  }
};
ERRORS.ParseError.prototype = Object.create(Error.prototype);


/**
 * Must be using a version of node that supports generators or enables them
 */
try {
  eval('(function *(){})');
} catch(err) {
  throw new ERRORS.ParseError('Missing Generators ES6 support',
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
var ASYNC_REPLACE = 'function(e, r) { $1 = r; nextAsyncNative(e, asyncIter); }';
var ASYNC_YIELD = '\nyield 1';

/**
 * Relates to wrapping the function up into a Generator
 */
var FUNCTION_REGEXP = /(function.*?\{)/;
var FUNCTION_GENERATOR = '\nfunction* yielder() { ';
var FUNCTION_ITERATOR = '\nasyncIter = yielder.apply(this, arguments);' +
                        '\nasyncIter.next();\n}\n';


/**
 * Global function to help restart Iterators after a callback completes
 *
 * @param  {String | Error} e           The error passed by the callback or null
 * @param  {<Iterator>} asyncIter       Internal: The generator's iterator
 * @throws:iterator {FutureError}       If the callback is passed an error
 */
global.nextAsyncNative = function(e, asyncIter) {
  if (!asyncIter.errored) {
    if (!e) {
      asyncIter.next();
    } else {
      var eIsError = e instanceof Error;
      var error = new ERRORS.FutureError(eIsError ? e.message : e);
      error.prototype = eIsError ? e.prototype : Object.create(Error.prototype);

      try {
        // This assumes that the callback is in a different call chain from
        // iter.next() - i.e. that it truly is an asynchronous callback
        asyncIter.errored = true;
        asyncIter.throw(error);
      } catch(e) {
        // This assumes that trying to throw the error lead to the Generator
        // complaining about trying to do iter.throw whilst iter.next is still
        // going. This is because we're trying to call iter.throw in the same
        // call chain as we just called iter.next - which isn't allowed.
        // In this case, we can simply throw the error back up the chain.
        throw (e instanceof TypeError) ? error : e;
      }
    }
  }
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
  configure: function(evalFn, outputFns) {
    if (HELPERS.isFunction(evalFn)) {
      return {
        process: process.bind({ evalFn: evalFn, outputFns: !!outputFns }),
        ParseError: ERRORS.ParseError,
        FutureError: ERRORS.FutureError
      };
    } else {
      throw new ERRORS.ParseError('"eval" function is not a function:\n\n' +
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
      if (fnString.match(ASYNC_PLACEHOLDER_REGEXP)) {
        var newCode = rewriteFunction(itemName, fnString);
        obj[itemName] = this.evalFn('(' + newCode + ')');

        if (this.outputFns) {
          HELPERS.debugFunction(obj[itemName]);
        }
      }
    }
  }
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
  var asyncVarList = ['asyncIter'];
  var fnCollapsed = HELPERS.cleanNewLineAndComments(fnString);
  fnCollapsed = HELPERS.rewritePlaceholders(fnName, fnCollapsed, asyncVarList);
  fnCollapsed = HELPERS.transformFnToGenerator(fnCollapsed, asyncVarList);
  return HELPERS.uncleanNewLines(fnCollapsed);
};



var HELPERS = {
  isFunction: function(fn) {
    return typeof fn === 'function';
  },

  debugFunction: function(fn) {
    console.log('\n\n----------------------------\n\n' +
      fn.toString() + '\n\n----------------------------\n\n');
  },

  cleanNewLineAndComments: function(fnString) {
    return fnString.replace(LINE_COMMENTS_WITH_COLON, '')
      .replace(/\n/g, NEW_LINE_PLACEHOLDER)
      .replace(ALL_MULTILINE_COMMENTS, '');
  },

  uncleanNewLines: function(fnString) {
    return fnString.replace(NEWLINE_REGEXP, '\n');
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

    while (match = fnStr.match(ASYNC_PLACEHOLDER_REGEXP)) {
      var matchIndex = fnStr.indexOf(match[0]);
      var afterPlaceholderParts = fnStr.substring(matchIndex).split(';');

      // There must be a colon after the placeholder, otherwise the programmer
      // has messed up
      if (afterPlaceholderParts.length < 2) {
        throw new ERRORS.ParseError('No semicolon after ' + match[0], fnName);
      }

      // Add the matched variable (without brackets) to a definition list
      if (asyncVarList.indexOf(match[1]) === -1) {
        asyncVarList.push(match[1]);
      }

      // Insert yield after the first colon found, after the placeholder
      afterPlaceholderParts.splice(1, 0, ASYNC_YIELD);
      fnStr = fnStr.substring(0, matchIndex) + afterPlaceholderParts.join(';');

      // Replace the placeholder with a callback
      fnStr = fnStr.replace(ASYNC_PLACEHOLDER_REGEXP, ASYNC_REPLACE);
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
  }
};
