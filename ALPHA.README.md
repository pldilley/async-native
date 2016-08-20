async-native [![Build Status](https://travis-ci.org/theporchrat/node-simple-chainable.png?branch=master)](https://travis-ci.org/theporchrat/node-simple-chainable)
=========

#### Contents
<Add links here>

## What is async-native?
It solves the "callback hell" and "thread blocking" problems of NodeJS 
by providing special syntactical sugar, without blocking the main thread.

**Normal Original Way** (i.e. using callback functions):
```
    fs.readFile('file1.txt', function(err1, lines1) {
        console.log(lines1);
        
        fs.readFile('file2.txt', function(err2, lines2) {
            console.log(lines2);
            
            // etc - very quickly becomes a callback pyramid
        });                
    });
```
    
**New Way** (using "placeholders", i.e: {$yourVarName}):
```
    fs.readFile('file1.txt', {$lines1});
    console.log($lines1); 
    
    fs.readFile('file2.txt', {$lines2});
    console.log($lines2);
    
    // etc - stays tidy
```


## How to use?
- **The semi-colons are ESSENTIAL for this to work.
    You should correctly use semi-colons in your Javascript code.**
``` 
    // STEP 1. CREATE "CONVERSION" FUNCTION AT TOP OF FILE - "$async"
    var $async = require('async-native').init(a => eval(a));
    
    // STEP 2. PASS YOUR EXPORTS OBJECT INSIDE OF THE "CONVERSION" FUNCTION - "= $async(...)"
    // (Converts on the first level only // TODO FIX THIS)
    module.exports = $async({
        example: function() {
            try {
            
                // STEP 3. REPLACE CALLBACKS WITH PLACEHOLDERS (e.g: {$yourVarName})
                fs.readFile('file1.txt', {$lines1}); /* Yields at semi-colon until result */
                
                // STEP 4 - AFTER YIELD, RESULT IS INJECTED (e.g: $yourVarName)
                console.log($lines1);  
                
            } catch (e) {
            
                // STEP 4 - CALLBACK ERRORS BECOME REAL JS ERRORS
                if (e instanceof FutureError) {
                    console.log('Async Error was:', e.message);
                }
                
            }
        }
    });
```
- **You can only use a named placeholder ONCE per function.
    To see how to work with loops, look further down in these docs.**

> Typically, in NodeJS, you give an asynchronous method your own callback.
> With async-native, you pass a "placeholder" instead: `{$yourVarName}`.
> Your function would then "yield" at the following semi-colon. Once the
> placeholder gets a result, it's accessed via a variable: `$yourVarName`.

> ("Yields" means an instance of a function execution is paused, but
> without blocking independent executions of the same or other functions.)

_For "thread blocking", please see the 'What about threads?' section._

_To see why you need step 1 or how the placeholders work in step 2,
see the 'How does it work exactly?' section._


## Logical Flows

##### Series
Series = Doing a set of asynchronous actions in a queue, one after the
         other. This is the most common scenario.
``` 
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            fs.readFile('file1.txt', {$lines1}); /* Yields at semi-colon until result */
            console.log($lines1);
            
            fs.readFile('file2.txt', {$lines2}); /* Yields at semi-colon until result */
            console.log($lines2);
            
            // etc
        }
    });
```

##### Parallel
Parallel = Doing a set of asynchronous actions all at the same time, but
           waiting for all of them to complete before continuing.
``` 
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            var fileReadings = {
                parallel1: fs.readFile('file1.txt', {$lines1}),
                parallel2: fs.readFile('file2.txt', {$lines2})
                // etc
            };  /* Yields at this SINGLE semi-colon until all of the results */
            
            console.log($lines1 + '\n\n' + $lines2);
        }
    });
```

##### Simultaneous
Simultaneous = Doing a set of asynchronous actions at the same time,
               independent of each other.
``` 
    var $async = require('async-native').init(a => eval(a));
    
    var myExamples = $async({
        line1: function() {
            fs.readFile('file1.txt', {$lines1}); /* Yields at semi-colon until result */
            console.log($lines1);
        },
        line2: function() {
            fs.readFile('file2.txt', {$lines2}); /* Yields at semi-colon until result */
            console.log($lines2);
        }
    });
    
    module.exports = {
        example: function() {
            myExamples.line1();
            myExamples.line2();
            
            // Line 1 or 2 could be output in any order, whichever finishes first.
        }
    };
```


## The anonymous placeholder
Code written in your main parent functions won't yield for any child 
functions that contain placeholders 
(exactly as in the above section: 'Logical Flows - > Simultaneous'.)

To yield up the execution chain, use the "anonymous placeholder" `{$}`:
``` 
    var $async = require('async-native').init(a => eval(a));
    
    // STEP 1. CREATE YOUR CHILD FUNCTIONS CONTAINING PLACEHOLDERS
    var childFunctions = $async({
        example: function(resultCollectingObject) {
            fs.readFile('file1.txt', {$lines1}); /* Yields at semi-colon until result */
            
            resultCollectingObject.myExampleLines = $lines1;

            // throw new Error('How to callback with an error to the parent instead');
        }
    });
    
    // STEP 2. USE THE ANONYMOUS PLACEHOLDER IN THE PARENT FUNCTION TO YIELD WHEN A CHILD FUNCTION YIELDS
    module.exports = $async({
        mainParent: function() {
            var resultCollectingObject = {};

            childFunctions.example(resultCollectingObject, {$}); /* Yields at semi-colon until result */
            
            console.log(resultCollectingObject.myExampleLines);
        }
    });
```
- **It works only with child functions that contain placeholders or threads.
If the child function does not contain any of these, the parent
function would pause indefinitely!**

- **You have to pass an object or array into the child function in order to
    collect a result, since asychronous placeholders can't inject any results.**

- **If an error is thrown in the child function, it WILL bubble up to the parent.**

> Any (and only) converted functions containing placeholders will automatically
> look for an anonymous placeholder as their last argument. This is so
> that you don't need to make your child functions manually call a
> callback!

_To see why you need step 1 or how the placeholders work in step 2,
see the 'How does it work exactly?' section._


## Loop handling
Remember that you cannot use a named placeholder twice, so for looping you must use
the anonymous placeholder. See the anonymous placeholders seciton above on how to 
collect results, and look below for examples.

##### Series
```
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            var lines = ['line 1', 'line 2', 'line 3'];

            try {

                for (var i=0; i < lines.length; i++) {
                    fs.appendFile('message.txt', lines[i], {$}); /* Yields at semi-colon until result */
                }

            } catch(e) {
                // if error returned to placeholder, can be caught here
            }
        }
    });
```

##### Parallel
```
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            var files = ['file1.txt', 'file2.txt', 'file3.txt'];

            try {

                for (var i=0; i < files.length; i++) {
                    fs.appendFile(files[i], 'Example string', {$}) // NOTE: No semi-colon here!
                }; /* Yields after all looping at semi-colon until result */

            } catch(e) {
                // if error returned to placeholder, can be caught here
            }
        }
    });
```

##### Result Handling
```
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        readTheFile: function(fileName, resultCollectionObj) {
            fs.readFile(fileName, {$fileContents}); /* Yields at semi-colon until result */

            resultCollectionObj[fileName] = $fileContents;
        },

        example: function() {
            var files = ['file1.txt', 'file2.txt', 'file3.txt'];

            try {
                var resultCollectionObj = {};

                for (var i=0; i < files.length; i++) {
                    module.exports.readTheFile(files[i], resultCollectionObj, {$}) // No semi-colon here!
                }; /* Yields after all looping at semi-colon until result */

                console.log(resultCollectionObj['file2.txt']);
            } catch(e) {
                // if error returned to placeholder, can be caught here
            }
        }
    });
```


## Error handling
When using placeholders, callback errors are converted into actual Javascript errors.
``` 
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            try {
                reader.readLine('file1.txt', {$lines1}); /* Yields at semi-colon until result */
                console.log($lines1);
            } catch (e) {
                if (e instanceof FutureError) {
                    // If 'reader.readLine' provides an error to the placeholder instead,
                    // it will turn into an actual javascript error here
                    console.log('Async Error was:', e.message, e.asyncFnName,
                                                    e.asyncVarName, e.asyncOriginError);
                }
            }
        }
        // etc
    });
```

There are a few other types of errors that can occur:
 * FutureError: Occurs as above or if the same callback was called twice
 * ParseError: Occurs for an unsupported usage of async-native
 * ThreadError: Occurs if an error is thrown in a thread (see below)
 * TimeoutError: Occurs if a timeout occurs (advanced usage, see down)


## What about threads?
- **You only need to use these if doing computationally heavy tasks.
    The placeholders above will NOT block the main thread, they merely
    pause a single instance of a function execution!**

**Block's Node JS's Thread** (nothing else can run):
```
    module.exports = $async({
        fibThread: function() {
            var fibNumber = 45;
            
            // Expensive computational operation
            function fibo(n) {
                return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
            }
        
            console.log(fibo(fibNumber));
        }
    }); 
```

**Does Not Block Node JS's Thread** (spawn a separate thread):    
```         
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        fibThread: function() {
            // STEP 1. DATA SOURCE TO PASS INSIDE OF THREAD: "var yourThreadName = ..."
            var fibNumber = 45;
            
            try {
            
                // STEP 2. THREAD IS DEFINED USING SYNACTICAL SUGAR: "$:yourThreadName => {"
                $:fibNumber => {
                
                    function fibo (n) {
                        return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
                    }
            
                    return fibo(fibNumber); // fibNumber == 45 (other outside vars not accessible!)
                    
                }; /* Yields at semi-colon until result, but without blocking main thread */
          
                // STEP 3. THREAD ABOVE IS RUN IMMEDIATELY, RESULT INJECTED AS: "$yourThreadName"
                console.log($fibNumber);
                                
            } catch(e) {
                if (e instanceof ThreadError) {
                    // If an error occurs inside the thread, this will happen!
                    console.log('Thread Error was:', e.message, e.asyncFnName,
                                                     e.asyncVarName, e.originalMessage);
                }
            }
        }
    });    
```
- **Only one variable is COPIED into the thread: The variable with the
    same name as the thread name. It must be serialisable into JSON.**

- **Threads operate in an isolated context. This means you will not be 
    able to access any other variables outside**

- **Arrow functions must be enabled for this to work.
    Modern versions of NodeJS support arrow functions as-is.**

- **The semi-colons are ESSENTIAL for this to work.
    You should correctly use semi-colons in your Javascript code.**
    
- **The result returned must be serialisable into JSON.**

- **Errors thrown inside threads will have their error message
    extracted and show up as ThreadError's in the main thread.**

> The thread has a special syntactical sugar: using 'labels' with 'arrow
> functions'. The structure looks like this:
>     $:yourThreadName => {
>         // throw "Couldn't do it";
>         return <result>;
>     };

_To see how threads work: see the 'How does it work exactly?' section._


## Advanced usage: Promises, listeners, timeouts, <complete list>


_ _**What are the gotchas?**_ _
* No arrow function support?
* Speed of using eval once
* Keeping code simple to avoid problems
* No embedding nested placeholders
* Returning/Yielding within generators, not allowed
* Conflicts with jquery


_ _**How does it work exactly?**_ _
* Code re-writing, generators
* Using eval for context capturing
* ParallelJs for threading (labels and arrow functions)


## Installation

```shell
  npm install scapegoat --save
```

## Usage

Same variable is not able to be used twice in the same context


```js
  var scapegoat = require('scapegoat')
      escape = scapegoat.escape,
      unescape = scapegoat.unescape;

  var html = '<h1>Hello World</h1>',
      escaped = escape(html),
      unescaped = unescape(escaped);

  console.log('html', html, 'escaped', escaped, 'unescaped', unescaped);
```

## Tests

```shell
   npm test
```

## Contributing

* 

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release

## Licence
    This file is part of async-native.

    async-native is free software: you can redistribute it and/or 
    modify it under the terms of the GNU General Public License
    and the GNU Lesser General Public License as published by 
    the Free Software Foundation, either version 3 of the License,
    or (at your option) any later version.

    async-native is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public 
    License and the GNU Lesser General Public License along with
    async-link. If not, see <http://www.gnu.org/licenses/>.
