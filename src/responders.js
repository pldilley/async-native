var Constants = require("./constants");
var Parallel = require('paralleljs');

/**
 * Global function to help restart Iterators after a callback completes
 *
 * @param  {String | Error} e           The error passed by the callback or null
 * @param  {<Iterator>} asyncIter       Internal: The generator's iterator
 * @throws:iterator {FutureError}       If the callback is passed an error
 * @throws {Error}                      If the callback causes an unknown error
 */ 
global[Constants.GLOBAL_FUNCTION_LABELS.ASYNC_CALLBACK] = 
  function ASYNC_CALLBACK(e, __it, id, varName) {
    if (__it.complete.indexOf(id) === -1) {
      try {
        if (!e) {
          __it.next();
        } else if (e instanceof global.ThreadError) {
          __it.throw(e);
        } else if (e instanceof global.TimeoutError) {
          __it.throw(new global.TimeoutError(__it.fnName +
                             ' (function) --> {' + varName + '} (callback)') );
        } else {
          var eIsErr = e instanceof Error;
          var error = new global.FutureError(eIsErr ? e.message : e,
            __it.fnName + ' (function) --> {' + varName + '} (callback)');

          error.stack = e.stack;
          if (eIsErr && e.prototype) {
            error.prototype = e.prototype;
          }
          __it.throw(error);
        }
        __it.complete.push(id);
      } catch(asyncNativeError) {
        // A TypeError happens if the callback is immediately called in the same
        // call stack that the asynchronous function was called. The yield has to
        // be hit first before the generator can continue. Shift to another stack
        if (asyncNativeError instanceof TypeError) {
          setTimeout(
            global[Constants.GLOBAL_FUNCTION_LABELS.ASYNC_CALLBACK].bind(
              this, e, __it, id, varName
            ), 0);
        } else {
          throw asyncNativeError;
        }
      }
    } else if (varName !== '$') {
      throw new global.FutureError('The same callback was called twice', varName);
    }
  };

// TODO DOCUMENT
global[Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_MARKER] = 
  function ANONYMOUS_MARKERK(callback) {
    callback.isAnonymousAsyncNative = true;
    return callback;
  };

global[Constants.GLOBAL_FUNCTION_LABELS.ANONYMOUS_CALLBACK] = 
  function ANONYMOUS_CALLBACK(args) {
    var callback = args.length > 0 ? args[arguments.length - 1] : null;
    if (typeof callback === "function" && callback.isAnonymousAsyncNative) {                           
       callback(null, null);
    }
  };


/**
 * Global function to help start threads
 *
 * @param  {Function} fn                The function to start in a thread  //TODO FIX
 * @param  {JSON} data                  Json like data (objects, arrays, etc)
 * @param  {Function} callback          Callback once complete with the result
 * @throws {ThreadError | Error}        If the callback is passed an error (or one bubbles up)
 */
global[Constants.GLOBAL_FUNCTION_LABELS.THREAD] =
  function THREAD(fnName, varName, data, fn, callback) {
    new Parallel(data).spawn(fn).then(function(result) {
      if (result.__asyncError) {
        var err = new global.ThreadError(fnName, varName,
                                         result.__asyncError, result.stack);
        callback(err, null);
      } else {
        callback(null, result);
      }
    }, function(unknownThreadError) {
      throw unknownThreadError;  // Should never happen but just in case to terminate everything
    });
  };


module.exports = {};
