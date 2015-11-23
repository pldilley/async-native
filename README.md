annosync [![Build Status](https://travis-ci.org/theporchrat/node-simple-chainable.png?branch=master)](https://travis-ci.org/theporchrat/node-simple-chainable)
=========

annosync is an async utility module which allows the developer to write
synchronous style code which will be executed asynchronously.

## Installation

```shell
  npm install scapegoat --save
```

## Usage

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

* This module removes itself from the node cache in order to trigger a reload
  each time (otherwise it won't be able to get the current module.parent). Thus,
  it can NEVER have any requires of its own!

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release

## Licence
    This file is part of aysncfn.

    annosync is free software: you can redistribute it and/or 
    modify it under the terms of the GNU General Public License
    and the GNU Lesser General Public License as published by 
    the Free Software Foundation, either version 3 of the License,
    or (at your option) any later version.

    annosync is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public 
    License and the GNU Lesser General Public License along with
    async-link. If not, see <http://www.gnu.org/licenses/>.
