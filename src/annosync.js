/**
 * annosync
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

var asyncRegExp = /(\{\$[\w$]+?\})/g;

module.exports = {
  register: function(parentModule) {
    //console.log(parentModule.require);

// TODO if not a module, process functions there and then
    // For an object
    for (var exportName in parentModule.exports) {
      var exportFn = parentModule.exports[exportName];
      module.exports.convertFunction(exportFn); // TODO Update to pass list
    }
  },
  convertFunction: function(fn) {
    var fnString = fn.toString();
    console.log(fnString);
    if (hasAnnoSyncOperators(fnString)) {

    }
  }
};

function hasAnnoSyncOperators(fnString) {
  if (fnString.match(asyncRegExp)) {
     console.log(fnString.match(asyncRegExp));
  }
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

try {
  eval("(function *(){})");
} catch(err) {
  console.log(err);
  console.log("No generators");
}