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
} catch(err) {
  throw new HELPERS.ParseError('Missing Generators ES6 support',
    '--harmony_generators');
}

/**
 * Relates to newlines and comment cleaning
 * - The actual processing is done with the the function on one line
 * - Comments containing ';' confuse things, so we also remove those
 */
var newLinePlaceholder = '<{NEW_LINE}>';
var newLineRegExp = /<\{NEW_LINE\}>/g;
var lineComment = /\/\/.*?;.*?\n/g;
var multiLineComment = /\/\*.*?;.*?\*\//g;

/**
 * Relates to placeholders and yields
 * - Placeholders get replaced with callback functions
 * - Yields are replaced after the placeholder's next nearest ';'
 */
var asyncRegExp = /\{(\$[\w$]+?)\}/;
var asyncReplace = 'function(e, r) { $1 = r; nextAsyncNative(e, asyncIter); }';
var asyncYield = '\nyield 1';

/**
 * Relates to wrapping the function up into a Generator
 */
var functionRegExp = /(function[ ]*?\(.*?\)[ ]*?\{)/;

/**
 * Global function to help restart Iterators after a callback completes
 *
 * @param  {String | Error} e           The error passed by the callback or null
 * @param  {<Iterator>} asyncIter       Internal: The generator's iterator
 * @throws:iterator {FutureError}       If the callback is passed an error
 */
global.nextAsyncNative = function(e, asyncIter) {
  if (!e) {
    asyncIter.next();
  } else {
    var eIsError = e instanceof Error;
    var error = new HELPERS.FutureError(eIsError ? e.message : e);
    if (eIsError) {
      error.prototype = e.prototype;
    }
    asyncIter.throw(error);
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
        ParseError: HELPERS.ParseError,
        FutureError: HELPERS.FutureError
      };
    } else {
      throw new HELPERS.ParseError('"eval" function is not a function:\n' +
        (evalFn && evalFn.toString) ? evalFn.toString() : '<?>');
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
      if (fnString.match(asyncRegExp)) {
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
    console.log('\n\n\n' + fn.toString() + '\n\n\n');
  },

  cleanNewLineAndComments: function(fnString) {
    return fnString.replace(lineComment, '')
      .replace(/\n/g, newLinePlaceholder)
      .replace(multiLineComment, '');
  },

  uncleanNewLines: function(fnString) {
    return fnString.replace(newLineRegExp, '\n');
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

     while (match = fnStr.match(asyncRegExp)) {
       var matchIndex = fnStr.indexOf(match[0]);
       var afterPlaceholderParts = fnStr.substring(matchIndex).split(';');

       // There must be a colon after the placeholder, otherwise the programmer
       // has messed up
       if (afterPlaceholderParts.length < 2) {
         throw new HELPERS.ParseError('No semicolon after ' + match[0], fnName);
       }

       // Add the matched variable (without brackets) to a definition list
       if (asyncVarList.indexOf(match[1]) === -1) {
         asyncVarList.push(match[1]);
       }

       // Insert yield after the first colon found, after the placeholder
       afterPlaceholderParts.splice(1, 0, asyncYield);
       fnStr = fnStr.substring(0, matchIndex) + afterPlaceholderParts.join(';');

       // Replace the placeholder with a callback
       fnStr = fnStr.replace(asyncRegExp, asyncReplace);
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
    var wrappedFn = fnCollapsed.replace(functionRegExp, '$1' +
      '\nvar ' + asyncVarList.join(', ') + ';' +
      '\nfunction* yielder() { ');

    wrappedFn += '\nasyncIter = yielder.apply(this, arguments);' +
                 '\nasyncIter.next();';

    return wrappedFn + '\n}\n';
  },

  /**
   * Error for processing errors
   */
  ParseError: function ParseError(message, fnKey) {
     Error.captureStackTrace(this);
     var msg = '\n\n\n --> async-native: Unable to parse!\n "' + fnKey + '"\n';
     this.message = msg + message;
     this.name = "ParseError";
  },

  /**
   * Error for callback errors
   */
  FutureError: function FutureError(message) {
     Error.captureStackTrace(this);
     var msg = 'async-native: A callback returned an error\n';
     this.message = msg + message;
     this.name = "FutureError";
  }
};

HELPERS.ParseError.prototype = Object.create(Error.prototype);
HELPERS.FutureError.prototype = Object.create(Error.prototype);
