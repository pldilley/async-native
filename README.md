aysncfn [![Build Status](https://travis-ci.org/theporchrat/node-simple-chainable.png?branch=master)](https://travis-ci.org/theporchrat/node-simple-chainable)
=========

Asyncfn is yet another async utility module, with the aim to provide a 
non-intrusive minimalistic helper for working with asynchronous Javascript.

The motivation for this project:
* Current async libraries add a lot of verbosity to code
* Async code 

Simple chain works very similiar to @substack's [chainsaw](https://github.com/substack/node-chainsaw) module, but with
a simpler implementation (for good or for bad). One of the major differences is that simple-chainable is merely and
implementation of a chain queue and not specifically built for fluent interfaces (although i use it for that).
It doesn't create an new chainable object for nested chains which means you can use `this` consistently for objects
that inherit simple-chain.

A minimal node module providing utility methods to `escape` and `unescape` HTML entities

Please also read: ["Node Style Guide - Method Chaining"](https://github.com/felixge/node-style-guide#method-chaining)

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

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 1.0.0 Refactor to avoid double unescape and to use npm scripts instead
  of makefile.  Also add link to associated blog post.
* 0.1.0 Initial release

## Licence
    This file is part of aysncfn.

    aysncfn is free software: you can redistribute it and/or 
    modify it under the terms of the GNU General Public License
    and the GNU Lesser General Public License as published by 
    the Free Software Foundation, either version 3 of the License,
    or (at your option) any later version.

    aysncfn is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public 
    License and the GNU Lesser General Public License along with
    async-link. If not, see <http://www.gnu.org/licenses/>.
