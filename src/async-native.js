/**
 * async-native
 * https://github.com/brentertz/scapegoat // TODO UPDATE GI LINK HERE
 *
 * Copyright (c) 2015 Paul Dilley
 * Licensed under the GPL and LGPL license.
 */

/**
 * Escape special characters in the given string of html.
 *
 * @param  {String} html
 * @return {String}
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

// Global function to help restart iters after a callback completes
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
  closure: function(evalFn) {
    if (HELPERS.isFunction(evalFn)) {
      return module.exports.register.bind({ closureEvalFn: evalFn});
    } else {
      throw new HELPERS.ParseError('Closure function is not a function:\n' +
        (evalFn && evalFn.toString) ? evalFn.toString() : '<?>');
    }
  },

  register: function(obj, closureCapture) {
    closureCapture = closureCapture || this.closureCapture;

    for (var itemName in obj) {
      var fnString = obj[itemName].toString();

      // We only need to re-write the function if it contains instances
      if (fnString.match(asyncRegExp)) {
        var newCode = rewriteFunction(itemName, fnString);
        obj[itemName] = closureCapture('(' + newCode + ')');

        console.log('\n\n' + obj[itemName.toString() + '\n\n');
      }
    }
  }
};

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

  cleanNewLineAndComments: function(fnString) {
    return fnString.replace(lineComment, '')
      .replace(/\n/g, newLinePlaceholder)
      .replace(multiLineComment, '');
  },

  uncleanNewLines: function(fnString) {
    return fnString.replace(newLineRegExp, '\n');
  },

  rewritePlaceholders: function(fnName, fnStr, asyncVarList) {
     var match;

     while (match = fnStr.match(asyncRegExp)) {
       var matchIndex = fnStr.indexOf(match[0]);
       var afterPlaceholderParts = fnStr.substring(matchIndex).split(';');

       // There must be a colon after the placeholder, otherwise the programmer
       // has messed up
       if (afterPlaceholderParts.length < 2) {
         throw new HELPERS.ParseError('No semi-colon after ' + match[0], fnName);
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

  transformFnToGenerator: function (fnCollapsed, asyncVarList) {
    var wrappedFn = fnCollapsed.replace(functionRegExp, '$1' +
      '\nvar ' + asyncVarList.join(', ') + ';' +
      '\nfunction* yielder() { ');

    wrappedFn += '\nasyncIter = yielder.apply(this, arguments);' +
                 '\nasyncIter.next();';

    return wrappedFn + '\n}\n';
  },

  ParseError: function ParseError(message, fnKey) {
     Error.captureStackTrace(this);
     var msg = '\n\n\n --> async-native: Unable to parse!\n "' + fnKey + '"\n';
     this.message = msg + message;
     this.name = "ParseError";
  },
  FutureError: function FutureError(message) {
     Error.captureStackTrace(this);
     var msg = 'async-native: A callback returned an error\n';
     this.message = msg + message;
     this.name = "FutureError";
  }
};

HELPERS.ParseError.prototype = Object.create(Error.prototype);
HELPERS.FutureError.prototype = Object.create(Error.prototype);

// Takes a passed match and mass replaces it with the appropriate variable name



// Wraps the current function code into a generator and adds the necessary code
// to execute it
