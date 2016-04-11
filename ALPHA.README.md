TODO

async-native [![Build Status](https://travis-ci.org/theporchrat/node-simple-chainable.png?branch=master)](https://travis-ci.org/theporchrat/node-simple-chainable)
=========


## What does async-native do?
It solves the "callback hell" and "thread blocking" problems of NodeJS 
by providing special syntactical sugar, without blocking the main thread.

NORMAL ORIGINAL WAY (i.e. using callback functions):
```
    reader.readLine('file1.txt', function(err1, lines1) {
        console.log(lines1);
        
        reader.readLine('file2.txt', function(err2, lines2) {
            console.log(lines2);
            
            // etc            
        });                
    });
```
    
NEW WAY (using "placeholders", i.e: {$yourVarName}):
```
    reader.readLine('file1.txt', {$lines1}); /* Yields (non-blocking pause) at semi-colon until result */
    console.log($lines1); 
    
    reader.readLine('file2.txt', {$lines2}); /* Yields (non-blocking pause) at semi-colon until result */
    console.log($lines2);
    
    //etc
```


## How do I use it exactly?
``` 
    // STEP 1. CREATE A "CONVERSION" FUNCTION AT TOP OF FILE (Pass a wrapper function for eval for context injection)
    var $async = require('async-native').init(a => eval(a));
    
    // STEP 2. PASS YOUR EXPORT OBJECT INTO THE "CONVERSION" FUNCTION (Converts on the first level only // TODO FIX THIS)
    module.exports = $async({
        example: function() {
            try {
            
                // STEP 3. MAKE SURE YOU'VE ADDED YOUR PLACEHOLDER (e.g: {$yourVarName}) WHERE YOUR CALLBACK FUNCTION WOULD USUALLY GO
                reader.readLine('file1.txt', {$lines1}); /* Yields (non-blocking pause) at semi-colon until result */
                
                // STEP 4 - RESULT. RESULT WILL BE AVAILABLE HERE ATER YIELD (in a variable the same name as the placeholder)
                console.log($lines1);  
                
            } catch (e) {
            
                // STEP 4 - ERROR. THIS IS WHAT WILL HAPPEN IF THE ASYNC METHOD CALLS BACK WITH AN ERROR RATHER THAN A RESULT
                if (e instanceof FutureError) {
                    // If 'reader.readLine' provides an error to the placeholder instead,
                    // it will turn into an actual javascript error here
                    console.log('Async Error was:', e.message);
                } else {
                    // etc
                }
                
            }
        }
        // etc
    });
```
Typically, in NodeJS, you give an asynchronous method your own callback.
With async-native, you pass a "placeholder" instead: `{$yourVarName}`.
Your function would then "yield" at the following semi-colon. Once the
placeholder gets a result, it's accessed via a variable: `$yourVarName`.

("Yields" means an instance of a function execution is paused, but
without blocking independent executions of the same or other functions.)

_ _For "thread blocking", please see the 'What about threads?' section._ _

###### IMPORTANT GOTCHA'S
- **The semi-colons are ESSENTIAL for this to work.
    You should correctly use semi-colons in your Javascript code.**
    
- **If you are using placeholders or threads, DO NOT use `return`
    within the same function. Things will break!**
    
- **If the callback is meant to happen multiple times, just use a
    callback. Using placeholders in this case would make the code harder
    to read.**

###### Expanded Explanation
> In the above example, step 1 is a formality that should happen at the 
> top of each file in your project. Step 2 is where the magic happens - 
> The module.exports object is 'filtered' through the method generated
> in step 1, the `$async` function, which transforms any placeholders
> (and threads) into real callbacks.
> 
> (Technically, the `$async` function just returns the same object 
> passed into it, but it's done this way to ensure that all the methods 
> with placeholders inside them are defiantly converted before they are 
> actually exported and available to the outside world.)

_ _To see why you need step 1 or how the placeholders work in step 2,
see the 'How does it work exactly?' section._ _


## Logical Flows

###### Series
Series = Doing a set of asynchronous actions in a queue, one after the
         other. This is the most common scenario.
``` 
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            reader.readLine('file1.txt', {$lines1}); /* Yields at semi-colon until result */
            console.log($lines1);
            
            reader.readLine('file2.txt', {$lines2}); /* Yields at semi-colon until result */
            console.log($lines2);
            
            // etc
        }
    });
```

###### Parallel
Parallel = Doing a set of asynchronous actions all at the same time, but
           waiting for all of them to complete before continuing.
``` 
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            var fileReadings = {
                parallel1: reader.readLine('file1.txt', {$lines1}),
                parallel2: reader.readLine('file2.txt', {$lines2})
                // etc
            };  /* Yields at this SINGLE semi-colon until all of the results */
            
            console.log($lines1 + '\n\n' + $lines2);
        }
    });
```

###### Simultaneous
Simultaneous = Doing a set of asynchronous actions at the same time,
               independent of each other.
``` 
    var $async = require('async-native').init(a => eval(a));
    
    var myExamples = $async({
        line1: function() {
            reader.readLine('file1.txt', {$lines1}); /* Yields at semi-colon until result */
            console.log($lines1);
        },
        line2: function() {
            reader.readLine('file2.txt', {$lines2}); /* Yields at semi-colon until result */
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


## An easier way to yield for your child functions in parent functions
Code written in your main parent functions won't yield for any child 
functions that contain placeholders (exactly as in the above section: 
'Logical Flows - > Simultaneous'.)

To yield up the execution chain, use the "anonymous placeholder" `{$}`:
``` 
    var $async = require('async-native').init(a => eval(a));
    
    // A. CREATE YOUR CHILD FUNCTIONS CONTAINING PLACEHOLDERS
    var childFunctions = $async({
        example: function(resultCollectingObject) {
            reader.readLine('file1.txt', {$lines1}); /* Yields at semi-colon until result */
            
            resultCollectingObject.myExampleLines = $lines1;
        }
    });
    
    // B. USE THE ANONYMOUS PLACEHOLDER IN THE PARENT FUNCTION TO YIELD WHEN A CHILD FUNCTION YIELDS
    module.exports = $async({
        mainParent: function() {
            var resultCollectingObject = {};
            
            childFunctions.example(resultCollectingObject, {$}); /* Yields at semi-colon until result */
            
            console.log(resultCollectingObject.myExampleLines);
        }
    });
```
###### IMPORTANT GOTCHA
- **It works only with child functions containing placeholders or 
threads. If the child function does not contain any of these, the parent
function would pause indefinitely.**

###### Expanded Explanation
> Any converted functions containing placeholders will automatically
> look for an anonymous placeholder as their last argument. This is so
> that you don't need to make your child functions manually call a
> callback. //TODO CAN ERRORS STILL BE THROWN?

_ _To see why you need step 1 or how the placeholders work in step 2,
see the 'How does it work exactly?' section._ _


## Error handling
Asynchronous methods with your functions could callback with an error 
instead of a result. In this case, this would cause an actual Javascript
error in your function of type "FutureError".
``` 
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        example: function() {
            try {
                reader.readLine('file1.txt', {$lines1}); /* Yields (non-blocking pause) at semi-colon until result */
                console.log($lines1);
            } catch (e) {
                if (e instanceof FutureError) {
                    // If 'reader.readLine' provides an error to the placeholder instead,
                    // it will turn into an actual javascript error here
                    console.log('Async Error was:', e.message);
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


_ _**What about threads?**_ _
BLOCKS NODEJS's THREAD:
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

DOES NOT (by getting NodeJS to spawn a separate thread):    
```         
    var $async = require('async-native').init(a => eval(a));
    
    module.exports = $async({
        fibThread: function() {
            // A. DATA TO PASS INSIDE OF THREAD HAS SAME NAME AS THREAD NAME: "yourThreadName"
            var fibNumber = 45;
            
            try {
            
                // B. THREAD IS DEFINED USING THIS SYNACTICAL SUGAR: "$:yourThreadName => {"
                //    Other variables outside of the thread cannot be accessed (see 'Important Gotchas' below)
                $:fibNumber => {
                
                    // Expensive computational operation
                    function fibo (n) {
                        return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
                    }
            
                    return fibo(fibNumber); // fibNumber == 45
                    
                }; /* Yields at semi-colon until result, but without blocking main thread */
          
                // C. THREAD ABOVE IS RUN IMMEDIATELY AND YOUR FUNCTION WILL YIELD UNTIL IT GETS A RESULT: "$yourThreadName"
                console.log($fibNumber);
                                
            } catch(e) {
                if (e instanceof ThreadError) {
                    // If an error occurs inside the thread, this will happen!
                    console.log('Thread Error was:', e.message);
                }
            }
        }
    });    
```

###### IMPORTANT GOTCHA'S
- **Arrow functions must be enabled for this to work.
    Modern versions of NodeJS support arrow functions as-is.**

- **The semi-colons are ESSENTIAL for this to work.
    You should correctly use semi-colons in your Javascript code.**
    
- **Threads operate in an isolated context. This means you will not be 
    able to access variables outside (see exception in the next point)**
    
- **One variable IS copied into the thread: The variable with the same
    name as the thread name. It must be serialisable into JSON.**
    
- **The result returned must be serialisable into JSON.**

- **Errors thrown inside threads will be casted into ThreadError's.**

###### Expanded Explanation
> The thread has a special syntactical sugar: using 'labels' with 'arrow
> functions'. The structure looks like this:
>     $:yourThreadName => {
>         // throw "Couldn't do it";
>         return <result>;
>     };
>
> To pass input, define a variable as the same name above your thread.
> To get output, expect a new variable as the same name prepended with a
> $ symbol. You can wrap the entire thread structure with a try-catch
> block to get ThreadError's.

_ _To see how threads work: see the 'How does it work exactly?' section._ _



_ _**Advanced usage: Promises, listeners, timeouts, <complete list>**_ _


_ _**What are the gotchas?**_ _
* No arrow function support?
* Speed of using eval once
* Keeping code simple to avoid problems
* No embedding nested placeholders
* Returning within generators, bad things happen


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
