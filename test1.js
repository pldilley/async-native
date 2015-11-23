var annosync = require('./src/annosync.js');
console.log('test1');

module.exports = {
  myFn: function(a, b, c) {
   console.log(a, b, c);
  },
  myFn2: function(a, b, c) {
    var $myTest;
    console.log(a, b, {$myTest});
  }
};

annosync.register(module);