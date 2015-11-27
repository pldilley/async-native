var aysncNative = require('./src/async-native.js').configure(($a) => eval($a));

var testSleep = function(delay, callback) {
  setTimeout(function() {
    callback(null, "This is my test");
  }, delay);
};

var mySpecialScope = "tooWoo";

module.exports = {
  myFn: function(a, b, c) {
    console.log(a, b, c);
  },
  myFn2: function (a, b, c) {
    testSleep(3000, {$myTest}),
    testSleep(3000, {$myTest2}),
    testSleep(3000, {$myTest3});

    console.log(1, $myTest);
    console.log(2, $myTest2);
    console.log(3, $myTest3);

  }
};

aysncNative.process(module.exports);