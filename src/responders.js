var Constants = require("./constants");
var Parallel = require('paralleljs');

/**
 * Global function to help restart Iterators after a callback completes
 *
 * @param  {String | Error} e           The error passed by the callback or null
 * @param  {<Iterator>} asyncIter       Internal: The generator's iterator
 * @throws:iterator {ThreadError}       If a thread created an error within
 * @throws:iterator {TimeoutError}      If a timeout occued
 * @throws:iterator {FutureError}       If the callback is passed an error
 * @throws {FutureError}                If the callback was called twice
 * @throws {Error}                      If an unknown error occurs
 */ 
global[Constants.GLOBAL_FUNCTION_LABELS.ASYNC_CALLBACK] = 
  function ASYNC_CALLBACK(e, __it, callbackFn, varName) {
    var placeholder = (varName !== '$' ? varName : callbackFn);

    if (__it.complete.indexOf(placeholder) === -1) {
      try {
        if (!e) {
          __it.next();
        } else if (e instanceof global.ThreadError) {
          __it.throw(e);
        } else if (e instanceof global.TimeoutError) {
          __it.throw(new global.TimeoutError(e.asyncFnName || __it.fnName, e.asyncVarName || varName));
        } else {
          var eIsErr = e instanceof Error;
          var errfnName = __it.fnName + ((eIsErr  && e.asyncFnName) ? ('::' + e.asyncFnName) : '');
          var varErrName = varName + ((eIsErr && e.asyncVarName) ? ('::' + e.asyncVarName) : '');
          var error = new global.FutureError(errfnName, varErrName, eIsErr ? e.message : e + "", e);

          // TODO Could these collude to result in much less than helpful errors?
          error.stack = e.stack;
          if (eIsErr && e.prototype) {
            error.prototype = e.prototype;
          }

          __it.throw(error);
        }
        __it.complete.push(placeholder);
      } catch(asyncNativeError) {
        // A TypeError happens if the callback is immediately called in the same
        // call stack that the asynchronous function was called. The yield has to
        // be hit first before the generator can continue. Shift to another stack
        if (asyncNativeError instanceof TypeError) {
          setTimeout(
            global[Constants.GLOBAL_FUNCTION_LABELS.ASYNC_CALLBACK].bind(
              this, e, __it, callbackFn, varName
            ), 0);
        } else {
          throw asyncNativeError;
        }
      }
    } else if (varName !== '$') {
      throw new global.FutureError(__it.fnName, varName, 
        '\n\nThe same placeholder was called twice:\n' +
        '1. For loops, use the anonymous placeholder pattern: "{$}".\n' +
        '2. Otherwise, the method triggering the placeholder should only callback once.\n' + 
        '3. If you cannot control the method, use "<async-native>.ignoreMultipleCallback".\n');
    }
  };

/**
 * Global function to help mark a callback as anonamous
 *
 * @param  {Function} callback           The callback function to be marked
 */
global[Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_MARKER] = 
  function ANONYMOUS_MARKER(callback, anonymousObj, i) {
    if (!anonymousObj[i]) {
      anonymousObj[i] = 0;
    }

    anonymousObj[i]++;
    var handler = function loop_handler(err, res) {
      // Ensure the callback occurs after all markers have been setup!
      setTimeout(function() {
        anonymousObj[i]--;
        if (err) {
          anonymousObj[i] = 0;
          callback(err, null);
        } else if (anonymousObj[i] < 1) {
          callback(null, null);
        }
      }, 0);
    };

    handler.isAnonymousAsyncNative = true;

    return handler;
  };

/**
 * Global function to help automatically trigger a callback if the last argument is a callback
 *
 * @param  {Function} callback           The callback function to be marked
 */
global[Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_CALLBACK] = 
  function ANONYMOUS_CALLBACK(args, error, fnName) {
    var callback = args.length > 0 ? args[args.length - 1] : null;
    if (typeof callback === "function" && callback.isAnonymousAsyncNative) { 
      if (error instanceof Error && !error.asyncFnName && fnName) {
        error.asyncFnName = '(' + fnName + ')';
      }                      
      callback(error || null, null);
    } else if (error) {
      throw error;
    }
  };

/**
 * Global function to help start threads
 *
 * @param  {String} fnName              The string name of the function
 * @param  {String} varName             The string name of the variable to be updated
 * @param  {JSON} data                  Json like data (objects, arrays, etc), passed into the thread
 * @param  {Function} fn                The function to start in a thread
 * @param  {Function} callback          Callback once complete with the result
 * @throws {ThreadError | Error}        If the callback is passed an error (or one bubbles up)
 */
global[Constants.GLOBAL_FUNCTION_LABELS.THREAD] =
  function THREAD(fnName, varName, data, fn, callback) {
    new Parallel(data).spawn(fn).then(function (result) {
      if (result.__asyncError) {
        var err = new global.ThreadError(fnName, varName, result.__asyncError, result.stack);
        callback(err, null);
      } else {
        callback(null, result);
      }
    }, function (unknownThreadError) {
      console.log("An unknown thread error occured. Please report this as a bug!", fnName, varName);
      throw unknownThreadError;  // Should never happen but just in case to terminate everything
    });
  };


module.exports = {};
