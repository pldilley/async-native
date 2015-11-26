var annosync = require('./src/async-native.js');

global.testSleep = function(delay, callback) {
  setTimeout(function() {
    callback(null, "This is my test");
  }, delay);
};

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

annosync.register(module);