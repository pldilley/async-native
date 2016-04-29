var Constants = require("./constants");
var Now = require("performance-now");

module.exports = {
  /**
   * Processes all functions in a passed object, getting them into the Lexical
   * Scope of the original method by using a evalFn function
   *
   * @this   {Scope} this      The scope should contain a evalFn function and possibly a sub-object of options
   * @param  {Object} obj      The object containing async functions
   * @return {Object} obj      The same object passed in, with any modifications made if necessary
   */
  process: function process(obj) {
    var isDebugOfTimes = this.options && this.options.outputTimesOfFns;
    if (isDebugOfTimes) isDebugOfTimes = Now();

    // Convert each function if it contains an async-placeholder or thread placeholder
    for (var itemName in obj) {
      if (obj.hasOwnProperty(itemName) && module.exports._isFunction(obj[itemName])) {
        var fnString = obj[itemName].toString();        // We need the function in string form

        if (fnString.match(Constants.ASYNC_PLACEHOLDER_REGEXP) || fnString.match(Constants.THREAD_REGEXP)) {
          var startTime = isDebugOfTimes ? Now() : 0;

          var newCode = rewriteFunction(itemName, fnString);
          obj[itemName] = this.evalFn('(' + newCode + ')');

          if (this.options && this.options.outputConvertedFns) _debugFunction(obj[itemName]);
          if (isDebugOfTimes) console.log(itemName, (Now() - startTime).toFixed(3), 'ms');
        }
      }
    }

    if (isDebugOfTimes) console.log('TOTAL', (Now() - isDebugOfTimes).toFixed(3), 'ms');

    return obj;
  },

  /**
   * Tests to see if an input is a function
   *
   * @param  {?} fn            An input of any kind to test
   * @return {boolean}         True if it is a function, otherwise false
   */
  _isFunction: function isFunction(fn) {
    return typeof fn === 'function';
  }
};

/**
 * MAIN STARTING POINT: Rewrites a specific function string into a Generator
 *
 * @param  {String} fnName    The name (or key) of the function
 * @param  {String} fnString  The string source of the function
 * @returns {String}          The string result of processing the function
 */
var rewriteFunction = function rewriteFunction(fnName, fnString) {
  var asyncVarList = ['__it'];
  var fnCollapsed = cleanNewLineAndComments(fnString);        // Puts all source onto one line only

  fnCollapsed = rewriteThreads(fnName, fnCollapsed, asyncVarList);
  validateNoAsyncNestedFunctions(fnName, fnCollapsed);

  fnCollapsed = rewritePlaceholders(fnName, fnCollapsed, asyncVarList);
  fnCollapsed = transformFnToGenerator(fnName, fnCollapsed, asyncVarList);

  return uncleanNewLines(fnCollapsed);
};


/* ALL THE BELOW METHODS ARE TO SUPPORT THE ABOVE METHOD */

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
 * Converts thread objects to runnable threads
 *
 * @param   {String} fnName                  The name (or key) of the function
 * @param   {String} fnStr                   The string source of the function
 * @param   {Array<String>} asyncVarList     Array to append variable names to
 * @returns {String}                         The processing string result
 * @throws  {ParseError}                     Throws an error if there is no semi-colon after the thread
 */
function rewriteThreads(fnName, fnStr, asyncVarList) {
  var match;

  while ((match = fnStr.match(Constants.THREAD_REGEXP))) {
    var varName = match[1];
    var threadIdx = fnStr.indexOf(match[0]);
    var threadStr = fnStr.substring(threadIdx);
    var idxs = _findBlock(threadStr);
    var code = threadStr.substring(idxs.start, idxs.end);

    // There must be a colon after the thread, otherwise the programmer has messed up
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

    code = Constants.THREAD_RENDERER(fnName, varName, code);

    fnStr = fnStr.substring(0, threadIdx) + code + threadStr.substring(idxs.end);
  }

  return fnStr;
}

/**
 * Checks that there are no nested functions with async placeholders inside
 *
 * @param  {String} fnName                  The name (or key) of the function
 * @param  {String} fnCollapsed             The string source of the function
 * @throws {ParseError}                     Throws an error if the passed cost contained nested functions with placeholders
 */
function validateNoAsyncNestedFunctions(fnName, fnCollapsed) {
    var fnContents = fnCollapsed.substring(1);
    var nestedFns = fnContents.match(Constants.FUNCTION_FIND_REGEXP);

    if (nestedFns) {
        var idx = fnContents.indexOf(nestedFns[0]);

        for (var i = 1; i <= nestedFns.length; i++) {
            var code = _findBlock(fnContents.substring(idx), true);

            if (code.match(Constants.ASYNC_PLACEHOLDER_REGEXP)) {
                throw new global.ParseError('Nested functions cannot contain placeholders or threads', fnName);
            }

            fnContents = fnContents.substring(idx + 1);
            idx = fnContents.indexOf(nestedFns[i]);
        }
    }
}

/**
 * Rewrites all of the placeholder into callbacks and adds the yield keywords
 * at the next proceeding ';' after each placeholder
 *
 * @param  {String} fnName                  The name (or key) of the function
 * @param {String} fnStr                    The string source of the function
 * @param {Array<String>} asyncVarList      Array to append variable names to
 * @returns {String}                        The processing string result
 * @throws {ParseError}                     Throws an error if there is no semi-colon after the placeholder
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
 * @param {String} fnName                   The string name of the function
 * @param {String} fnCollapsed              The string source of the function
 * @param {Array<String>} asyncVarList      Array for variable definitions
 * @returns {String}                        The processing string result
 * @throws {ParseError}                     Throws an error if the passed function string does not end with "}"
 */
function transformFnToGenerator(fnName, fnCollapsed, asyncVarList) {
  var wrappedFn = fnCollapsed.replace(Constants.FUNCTION_REGEXP, '$1' +
    '\nvar ' + asyncVarList.join(', ') + ';' + Constants.FUNCTION_GENERATOR(fnName) + '\n try {');

  if (wrappedFn.charAt(wrappedFn.length - 1) === "}") {
    wrappedFn = wrappedFn.substring(0, wrappedFn.length - 1) + '\n  ' +
      Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_CALLBACK + '(arguments);' + '\n } catch(_e) {\n  ' +
      Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_CALLBACK + '(arguments, _e, "' + fnName + '");' + '\n }\n}';
  } else {
    throw new global.ParseError('Internal error, please report ("}" not found)', fnName);
  }

  return wrappedFn + Constants.FUNCTION_ITERATOR(fnName);
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



/* ALL THE BELOW METHODS ARE HELPER METHODS */

/**
 * Finds the first block of code possible, e.g. {.....}
 *
 * @param {String} input                    The input string source fragment
 * @param {Boolean} outputBlockStr          Set to true to output a string rather than coordinates
 * @returns {Object | String}               The processing string result
 */
function _findBlock(input, outputBlockStr) {
    var block = {start: -1, end: -1};
    var i = input.indexOf('{');
    var x = 0;

    if (i > -1) {
        for (; i < input.length; i++) {
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

/**
 * Logs a function to the output
 *
 * @param {Function} fn                     The function to be output
 */
function _debugFunction(fn) {
    console.log('\n\n----------------------------\n\n' +
        fn.toString() + '\n\n----------------------------\n\n');
}