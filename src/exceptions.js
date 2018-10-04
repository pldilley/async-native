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
global.FutureError = function FutureError(fnName, varName, message, original) {
  Error.captureStackTrace(this);
  var msg = 'async-native - A callback returned an error: [ ' +
      ((fnName + ' ----> {' + varName + '}') || '?') + ' ] = ';

  this.message = msg + message;
  this.name = 'FutureError';
  this.asyncFnName = fnName;
  this.asyncVarName = varName;
  this.asyncOriginError = original;
};

/**
 * Error for callback errors
 */
global.TimeoutError = function TimeoutError(fnName, varName) {
  Error.captureStackTrace(this);
  var msg = 'async-native - A callback timed out: [ ';
  this.message = msg + ((fnName + ' ----> {' + varName + '}') || '?') + ' ]';
  this.name = "TimeoutError";
  this.asyncFnName = fnName;
  this.asyncVarName = varName;
};

/**
 * Error for callback errors
 */
global.ThreadError = function ThreadError(fnName, varName, message, stack) {
  var msg = 'async-native - Thread error in: [ ' + fnName + ' (function) --> $:' +
            varName + ' (thread) ]\n';
  this.message = msg + message;
  this.originalMessage = '';
  this.name = "ThreadError";
  this.stack = '    Internal Thread ' + stack.replace(message, '')
                  .replace(new RegExp('\\$' + varName, 'g'), '$:' + varName);
  this.asyncFnName = fnName;
  this.asyncVarName = varName;
};

global.ParseError.prototype = Object.create(Error.prototype);
global.FutureError.prototype = Object.create(Error.prototype);
global.TimeoutError.prototype = Object.create(Error.prototype);
global.ThreadError.prototype = Object.create(Error.prototype);

module.exports = {};
