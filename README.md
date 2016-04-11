async-native
=========

_This module is ALPHA and still being developed! It will be up on npm shortly._

async-native allows the user to write asynchronous code synchronously, as if it
were in its own thread, by leveraging yield and code re-writing.

## Usage

Please see example.js

## Tests

TODO

## Todo

* Test eval function or throw an error              [DONE]
* Allow ignore of error                             [DONE]
* Thread error catching                             [DONE]
* Non-generator fallback support                    [IMPOSSIBLE (block code would ruin things - very likely)]
* Move thread renderer to it's own renderer         [DONE]
* Allow double call callbacks to be ignored         [DONE]
* No error callback solution                        [DONE]
* Event based solution                              [SINCE EVENT ACCEPTS CALLBACK, ALLOW USER TO USE A {$callback}]
* Add function name signature to methods            [DONE]
* Generate function names for generated methods     [DONE]
* How to return something before placeholdering!    [TO DO]
* What if data does not exist for thread?           [TO DO]
* What if exception thrown in placeholdered child   [TO DO]
* 

## Contributing

* Adhere to the node style guidelines exactly
* Lint and test your code.

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
