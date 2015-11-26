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

var COLONERR = '\n\n\n --> async-native: No semi-colon after "';

// Must be using a version of node that supports generators or enables them
try {
  eval('(function *(){})');
} catch(err) {
  throw '\n\n\n --> async-native requires Generators ES6 support (For Node, ' +
        'please enable it by adding "--harmony_generators").\n';
}

// Relates to the placeholders
var asyncRegExp = /\{(\$[\w$]+?)\}/;
var asyncReplace = '(function(e, r) { $1 = r; nextAsyncNative(e, asyncIter); })';
var asyncYield = '\nyield 1';

// Relates to wrapping the function in a generator
var functionRegExp = /(function[ ]*?\(.*?\)[ ]*?\{)/;

// Global function to help restart iters after a callback completes
global.nextAsyncNative = function(e, asyncIter) {
  if (!e) {
    asyncIter.next();
  } else {
    asyncIter.throw(e);
  }
};

module.exports = {
  register: function(parentModule) {
// TODO if not a module, process functions there and then
    // For an object
    for (var exportName in parentModule.exports) {
      var fnString = parentModule.exports[exportName].toString();

      // We only need to re-write the function if it contains instances
      if (fnString.match(asyncRegExp)) {
        var newCode = module.exports.rewriteFunction(fnString);
        parentModule.exports[exportName] = eval("(" + newCode + ")");

        console.log(parentModule.exports[exportName].toString() + '\n\n');
      }
    }
  },
  rewriteFunction: function(fnString) {
    // All the source could be on one line potentially, so let's always do it
    var asyncVarList = ['asyncIter'];
    var fnCollapsed = fnString.replace(/\n/g, '<{NEWLINE}>');

    // We're adding yield pauses AFTER the placeholder's method's statement.
    // Stacking these up would therefore allow for parallel asynchronous calls
    fnCollapsed = rewritePlaceholdersAndAddYields(fnCollapsed, asyncVarList);

    // Processes each async placeholder match
    fnCollapsed = transformFnToGenerator(fnCollapsed, asyncVarList);

    return fnCollapsed.replace(/<\{NEWLINE\}>/g, '\n');
  }
};

//function insertYields(fnCollapsed) {
//  var parts = fnCollapsed.split(asyncRegExp);
//  var partCount = 0;
//
//  for (var i=0; i < parts.length; i++) {
//    var part = parts[0];
//  }
//  // Insert yields
//  // 1. Split on matches
//  // 2. For each part, look for a ';', counting how many parts you have to check
//  // 3. Once you see a ';', insert the above count of yields as above
//  // 4. Reset the counter
//}

// Takes a passed match and mass replaces it with the appropriate variable name
function rewritePlaceholdersAndAddYields(fnStr, asyncVarList) {
  var match;

  while (match = fnStr.match(asyncRegExp)) {
    var matchIndex = fnStr.indexOf(match[0]);
    var afterPlaceholderParts = fnStr.substring(matchIndex).split(';');

    if (afterPlaceholderParts.length < 2) {
      throw COLONERR + match[0] + '"\n' + fnStr.replace(/<\{NEWLINE\}>/g, '\n');
    }

    // Add the matched variable to a (future) definition list
    if (asyncVarList.indexOf(match[1]) === -1) {
      asyncVarList.push(match[1]);
    }

    // Insert yield after the first colon found after the placeholder
    afterPlaceholderParts.splice(1, 0, asyncYield);
    fnStr = fnStr.substring(0, matchIndex) + afterPlaceholderParts.join(';');

    // Replace the placeholder with a callback
    fnStr = fnStr.replace(asyncRegExp, asyncReplace);
  }

  return fnStr;
}


// Wraps the current function code into a generator and adds the necessary code
// to execute it
function transformFnToGenerator(fnCollapsed, asyncVarList) {
  var wrappedFn = fnCollapsed.replace(functionRegExp, '$1' +
    '\nvar ' + asyncVarList.join(', ') + ';' +
    '\nfunction* yielder() { ');

  wrappedFn += '\nasyncIter = yielder.apply(this, arguments);' +
               '\nasyncIter.next();';

  return wrappedFn + '\n}\n';
}

//function* myGenerator() {
//  yield 1;
//  yield 2;
//}
//
//var iter = myGenerator();
//console.log(iter.next());
//console.log(iter.next());
//console.log(iter.next());

