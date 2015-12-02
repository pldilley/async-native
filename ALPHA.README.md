TODO

async-native [![Build Status](https://travis-ci.org/theporchrat/node-simple-chainable.png?branch=master)](https://travis-ci.org/theporchrat/node-simple-chainable)
=========

async-native allows the user to write asynchronous code synchronously, as if it
were in its own thread, by leveraging yield and code re-writing.

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
