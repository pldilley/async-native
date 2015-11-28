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
ParseError = function ParseError(message, fnKey) {
   Error.captureStackTrace(this);
   var msg = 'async-native - Unable to parse! ' +
    (fnKey ? '("' + fnKey + '")' : '') + '\n';
   this.message = msg + '            ' + message;
   this.name = "ParseError";
};

/**
 * Error for callback errors
 */
FutureError = function FutureError(message) {
   Error.captureStackTrace(this);
   var msg = 'async-native - A callback returned an error\n';
   this.message = msg + message;
   this.name = "FutureError";
};
ParseError.prototype = Object.create(Error.prototype);


/**
 * Must be using a version of node that supports generators or enables them
 */
try {
  eval('(function *(){})');
} catch(err) {
  throw new ParseError('Missing Generators ES6 support',
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
var ASYNC_REPLACE = 'function(e, r) { $1 = r; nextAsyncNative(e, $it, "$1"); }';
var ASYNC_YIELD = '\nyield 1';

/**
 * Relates to wrapping the function up into a Generator and validation
 */
var SPLIT_FUNCTION_REGEXP = /function.*?\{/g;
var FUNCTION_REGEXP = /(function.*?\{)/;
var FUNCTION_GENERATOR = '\nfunction* yielder() { ';
var FUNCTION_ITERATOR = '\n$it = yielder.apply(this, arguments);' +
                        '\n$it.complete = [];' +
                        '\n$it.next();\n}\n';



/**
 * Global function to help restart Iterators after a callback completes
 *
 * @param  {String | Error} e           The error passed by the callback or null
 * @param  {<Iterator>} asyncIter       Internal: The generator's iterator
 * @throws:iterator {FutureError}       If the callback is passed an error
 * @throws {Error}                      If the callback causes an unknown error
 */
nextAsyncNative = function(e, $it, varName) {
  if ($it.complete.indexOf(varName) === -1) {
    try {
      if (!e) {
        $it.next();
      } else {
        var eIsErr = e instanceof Error;
        var error = new FutureError(eIsErr ? e.message : e);
        error.prototype = eIsErr ? e.prototype : Object.create(Error.prototype);
        $it.throw(error);
      }
      $it.complete.push(varName);
    } catch(f) {
      // A TypeError happens if the callback is immediately called in the same
      // call stack that the asynchronous function was called. The yield has to
      // be hit first before the generator can continue. Shift to another stack
      if (f instanceof TypeError) {
        setTimeout(global.nextAsyncNative.bind(this, e, $it, varName), 0);
      } else {
        throw f;
      }
    }
  } else {
    throw new ParseError('The same callback was called twice', varName);
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
  init: function(evalFn, outputFns) {
    if (HELPERS.isFunction(evalFn)) {
      return process.bind({ evalFn: evalFn, outputFns: !!outputFns });
    } else {
      throw new ParseError('"eval" function is not a function:\n\n' +
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
  var asyncVarList = ['$it'];
  var fnCollapsed = HELPERS.cleanNewLineAndComments(fnString);
  HELPERS.validateNoAsyncNestedFunctions(fnName, fnCollapsed);
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

  validateNoAsyncNestedFunctions: function(fnName, fnCollapsed) {
    var parts = fnCollapsed.split(SPLIT_FUNCTION_REGEXP);

    for (var i=2; i < parts.length; i++) {
      var part = parts[i];
      var bracketCount = 1;
      var idx;

      for (idx=0; (idx < part.length && bracketCount > 0); idx++) {
        var char = part.charAt(idx);
        bracketCount += (char === '{' ? +1 : ( char === '}' ? -1 : 0));
      }

      if (bracketCount > 0
            || part.substring(0, idx).match(ASYNC_PLACEHOLDER_REGEXP)) {
        throw new ParseError('Nested functions cannot contain asynchronous ' +
          'placeholders', fnName);
      }
    }
  },

  validateNoDuplicatePlaceholders: function(fnName, fnCollapsed) {

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
        throw new ParseError('No semicolon after ' + match[0], fnName);
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
