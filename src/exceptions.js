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
global.FutureError = function FutureError(message, fnAndVarName) {
  Error.captureStackTrace(this);
  var msg = 'async-native - A callback returned an error: [ ' +
      (fnAndVarName || '?') + ' ]\n';

  this.message = msg + message;
  this.name = "FutureError";
};

/**
 * Error for callback errors
 */
global.TimeoutError = function TimeoutError(fnAndVarName) {
  Error.captureStackTrace(this);
  var msg = 'async-native - A callback timed out [ ';
  this.message = msg + (fnAndVarName || '?') + ' ]';
  this.name = "TimeoutError";
};

/**
 * Error for callback errors
 */
global.ThreadError = function ThreadError(fnName, varName, message, stack) {
  var msg = 'async-native - Error in [ ' + fnName + ' (function) --> $:' +
            varName + ' (thread) ]\n';
  this.message = msg + message;
  this.originalMessage = '';
  this.name = "ThreadError";
  this.stack = '    Internal Thread ' + stack.replace(message, '')
      .replace(new RegExp('\\$' + varName, 'g'), '$:' + varName);
};

global.ParseError.prototype = Object.create(Error.prototype);
global.FutureError.prototype = Object.create(Error.prototype);
global.TimeoutError.prototype = Object.create(Error.prototype);
global.ThreadError.prototype = Object.create(Error.prototype);

module.exports = {};
