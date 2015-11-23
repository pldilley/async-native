/**
 * annosync
 * https://github.com/brentertz/scapegoat // TODO UPDATE GI LINK HERE
 *
 * Copyright (c) 2015 Paul Dilley
 * Licensed under the GPL and LGPL license.
 */

var helpers = {
  isFunction: fn => typeof obj === 'function',

 /**
  * Generates a new "scope" that will be passed around the call chain. It's used
  * to keep track of the order of calling. This only gets called for the first
  * call of $ (i.e. the first call in the chain)
  *
  * @return {Object}  A list of tracker arrays for functions and results
  */
  newScope: function() {
    var asyncfnScope = {
      chain: [],    // E.g.[[fn1], [fn2], [fn3, fn4]]
      result: [],   // E.g.[fn3Result, fn4Result]
      parentCallback: null  // E.g. function(result, callback)
    };

    // Create two clones of $, 1 each for parallel, and series
    asyncfnScope.$ = $.bind({ asyncfnScope: asyncfnScope, $parallel: true });
    asyncfnScope.$.$ = $.bind({ asyncfnScope: asyncfnScope, $parallel: false });

    return asyncfnScope;
  }
};

var $ = function(fn) {
var $ = function(fn) {
  var scope = this.asyncfnScope || helpers.newScope();
  scope.chain.push(fn);

  if (this.$parallel) {

  } else {

  }



  return scope.$;
};

// TODO ALLOW 1 PARAMETER RETURNS

// Easy how to on synchronous
// (result, callback) => callback(null, fn(result))
// (result, callback) => fn(result, function(r) { callback(null, r) });

// Can be used to rearrange the order of parameters
(r1, r2, callback) => fn(r2, callback);

function series() {

}
function parallel() {

}
function synchronous() {

}


/**
 * Escape special characters in the given string of html.
 *
 * @param  {String} html
 * @return {String}
 */
module.exports = {
  escape: function(html) {
    if (!html) {
      return '';
    }

    var values = Object.keys(chars).map(function(key) { return chars[key]; });
    var re = new RegExp('(' + values.join('|') + ')', 'g');

    return String(html).replace(re, function(match) {
      for (var key in chars) {
        if (chars.hasOwnProperty(key) && chars[key] === match) {
          return key;
        }
      }
    });
  },

  /**
   * Unescape special characters in the given string of html.
   *
   * @param  {String} html
   * @return {String}
   */
  unescape: function(html) {
    if (!html) {
      return '';
    }

    var re = new RegExp('(' + Object.keys(chars).join('|') + ')', 'g');

    return String(html).replace(re, function(match) {
      return chars[match];
    });
  }
};
