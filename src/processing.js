var Constants = require("./constants");
var Now = require("performance-now");

module.exports = {
  /**
   * Processes all functions in a passed object, getting them into the Lexical
   * Scope of the original method by using a evalFn function
   *
   * @this   {Scope} this      The scope should contain a evalFn function
   *                           and possibly a set of options
   * @param  {Object} evalFn   The object containing async functions
   */
  process: function process(obj) {
    var isDebugOfTimes = this.options && this.options.outputTimesOfFns;
    if (isDebugOfTimes) {
      isDebugOfTimes = Now();
    }


    for (var itemName in obj) {
      if (module.exports.isFunction(obj[itemName])) {
        var fnString = obj[itemName].toString();

        // We only need to re-write the function if it contains instances
        if (fnString.match(Constants.ASYNC_PLACEHOLDER_REGEXP) ||
            fnString.match(Constants.THREAD_REGEXP)) {

          var startTime = isDebugOfTimes ? Now() : 0;

          var newCode = rewriteFunction(itemName, fnString);
          obj[itemName] = this.evalFn('(' + newCode + ')');

          if (this.options && this.options.outputConvertedFns) {
            _debugFunction(obj[itemName]);
          }
          if (isDebugOfTimes) {
            console.log(itemName, (Now() - startTime).toFixed(3), 'ms');
          }
        }
      }
    }

    if (isDebugOfTimes) {
      console.log('TOTAL', (Now() - isDebugOfTimes).toFixed(3), 'ms');
    }

    return obj;
  },
  
  isFunction: function isFunction(fn) {
    return typeof fn === 'function';
  }
};

/**
 * Main starting point Rewrites a specific function string into a Generator
 *
 * @param  {String} fnName    The name (or key) of the function
 * @return {String} fnString  The string source of the function
 * @returns {String}          The string result of processing the function
 */
var rewriteFunction = function rewriteFunction(fnName, fnString) {
  // All the source could be on one line potentially, so let's always do it
  var asyncVarList = ['__it'];
  var fnCollapsed = cleanNewLineAndComments(fnString);

  fnCollapsed = rewriteThreads(fnName, fnCollapsed, asyncVarList);
  validateNoAsyncNestedFunctions(fnName, fnCollapsed);

  fnCollapsed = rewritePlaceholders(fnName, fnCollapsed, asyncVarList);
  fnCollapsed = transformFnToGenerator(fnName, fnCollapsed, asyncVarList);

  return uncleanNewLines(fnCollapsed);
};


/**
 * Checks that there are no nested functions with async placeholders inside
 *
 * @param  {String} fnName                  The name (or key) of the function
 * @param  {String} fnCollapsed             The string source of the function
 */
function validateNoAsyncNestedFunctions(fnName, fnCollapsed) {
    var fnContents = fnCollapsed.substring(1);
    var nestedFns = fnContents.match(Constants.FUNCTION_FIND_REGEXP);

    if (nestedFns) {
      var idx = fnContents.indexOf(nestedFns[0]);

      for (var i=1; i <= nestedFns.length; i++) {
        var code = _findBlock(fnContents.substring(idx), true);

        if (code.match(Constants.ASYNC_PLACEHOLDER_REGEXP)) {
          throw new global.ParseError('Nested functions cannot contain ' +
            'asynchronous placeholders or threads', fnName);
        }

        fnContents = fnContents.substring(idx + 1);
        idx = fnContents.indexOf(nestedFns[i]);
      }
    }
}

/**
 * Clean new lines and comments out of a passed string
 *
 * @param  {String} fnString                The source string
 * @return {String}                         The sanatised string
 */
function cleanNewLineAndComments(fnString) {
  return fnString.replace(Constants.LINE_COMMENTS_WITH_COLON, '')
    .replace(/\n/g, Constants.NEW_LINE_PLACEHOLDER)
    .replace(Constants.ALL_MULTILINE_COMMENTS, '');
}


/**
 * UnClean new lines out of a passed string
 *
 * @param  {String} fnString                The source string
 * @return {String}                         The unsanatised string
 */
function uncleanNewLines(fnString) {
  return fnString.replace(Constants.NEWLINE_REGEXP, '\n');
}

/**
 * Converts thread objects to runnable threads
 *
 * @param  {String} fnName                  The name (or key) of the function
 * @return {String} fnStr                   The string source of the function
 * @return {Array<String>} asyncVarList     Array to append variable names to
 * @returns {String}                        The processing string result
 */
function rewriteThreads(fnName, fnStr, asyncVarList) {
  var match;

  while ((match = fnStr.match(Constants.THREAD_REGEXP))) {
    var varName = match[1];
    var threadIdx = fnStr.indexOf(match[0]);
    var threadStr = fnStr.substring(threadIdx);
    var idxs = _findBlock(threadStr);
    var code = threadStr.substring(idxs.start, idxs.end);

    // There must be a colon after the thread, otherwise the programmer
    // has messed up
    if (threadStr.charAt(idxs.end + 1) === ';') {
      throw new global.ParseError('No semicolon after ' + match[0], fnName);
    }

    // Add the matched variable (without brackets) to a definition list
    var placeholder = '$' + varName;
    if (asyncVarList.indexOf(placeholder) === -1) {
      asyncVarList.push(placeholder);
    } else {
      throw new global.ParseError('Cannot reuse any placeholder/threadname result ' + 
        'variable within the same function: ' + placeholder, fnName);
    }

    // TODO Move to renderer
    code = Constants.THREAD_RENDERER(fnName, varName, code);

    fnStr = fnStr.substring(0, threadIdx) + code +
            threadStr.substring(idxs.end);
  }

  return fnStr;
}

/**
 * Rewrites all of the placeholder into callbacks and adds the yield keywords
 * at the next proceeding ';' after each placeholder
 *
 * @param  {String} fnName                  The name (or key) of the function
 * @return {String} fnStr                   The string source of the function
 * @return {Array<String>} asyncVarList     Array to append variable names to
 * @returns {String}                        The processing string result
 */
function rewritePlaceholders(fnName, fnStr, asyncVarList) {
  var match;
  var i = 0;

  while ((match = fnStr.match(Constants.ASYNC_PLACEHOLDER_REGEXP))) {
    i++;
    var matchIndex = fnStr.indexOf(match[0]);
    var afterPlaceholderParts = fnStr.substring(matchIndex).split(';');
    var varName = match[1];

    // There must be a colon after the placeholder, otherwise the programmer
    // has messed up
    if (afterPlaceholderParts.length < 2) {
      throw new global.ParseError('No semicolon after ' + match[0], fnName);
    }

    // Insert yield after the first colon found, after the placeholder
    afterPlaceholderParts.splice(1, 0, Constants.ASYNC_YIELD);
    fnStr = fnStr.substring(0, matchIndex) + afterPlaceholderParts.join(';');

    if (varName !== "$") {
      // Add the matched variable (without brackets) to a definition list
      if (asyncVarList.indexOf(varName) === -1) {
        asyncVarList.push(varName);
      } else {
        throw new global.ParseError('Cannot reuse any placeholder/threadname result ' + 
          'variable within the same function: ' + varName, fnName);
      }

      // Replace the placeholder with a callback
      fnStr = fnStr.replace(
        Constants.ASYNC_PLACEHOLDER_REGEXP,
        Constants.ASYNC_REPLACE_RENDERER(fnName, i)
      );
    } else {
      // Replace the placeholder with a callback
      var fnLabel = Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_MARKER;
      fnStr = fnStr.replace(
        Constants.ASYNC_PLACEHOLDER_REGEXP,
        fnLabel + '(' +
          Constants.ASYNC_REPLACE_RENDERER(fnName, i) +
          ', __it.anonymous, ' + 
          i +
        ')'
      );
    }
  }

  return fnStr;
}

/**
 * Rewrites the function into a generaotr
 *
 * @return {String} fnCollapsed             The string source of the function
 * @return {Array<String>} asyncVarList     Array for variable definitions
 * @returns {String}                        The processing string result
 */
function transformFnToGenerator(fnName, fnCollapsed, asyncVarList) {
  var wrappedFn = fnCollapsed.replace(Constants.FUNCTION_REGEXP, '$1' +
    '\nvar ' + asyncVarList.join(', ') + ';' + Constants.FUNCTION_GENERATOR(fnName) + '\n try {');

  if (wrappedFn.charAt(wrappedFn.length - 1) === "}") {
    wrappedFn = wrappedFn.substring(0, wrappedFn.length - 1) + '\n  ' +
      Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_CALLBACK + '(arguments);' + '\n } catch(_e) {\n  ' +
      Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_CALLBACK + '(arguments, _e);' + '\n }\n}';
  } else {
    throw new global.ParseError('Internal error ("}" not found)', fnName);
  }

  return wrappedFn + Constants.FUNCTION_ITERATOR(fnName);
}



/**
 * Finds the first block of code possible, e.g. {.....}
 *
 * @return {String} input                   The input string source fragment
 * @return {Boolean} outputBlockStr         Set to true to output a string rather than coordinates
 * @returns {Object | String}               The processing string result
 */
function _findBlock(input, outputBlockStr) {
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

function _debugFunction(fn) {
  console.log('\n\n----------------------------\n\n' +
      fn.toString() + '\n\n----------------------------\n\n');
}