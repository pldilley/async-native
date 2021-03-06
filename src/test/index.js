/* TODO - Write test cases
var should = require('chai').should();
var $ = require('../index');

describe('#escape', function() {
  it('converts & into &amp;', function() {
    escape('&').should.equal('&amp;');
  });

  it('converts " into &quot;', function() {
    escape('"').should.equal('&quot;');
  });

  it('converts \' into &#39;', function() {
    escape('\'').should.equal('&#39;');
  });

  it('converts < into &lt;', function() {
    escape('<').should.equal('&lt;');
  });

  it('converts > into &gt;', function() {
    escape('>').should.equal('&gt;');
  });

  it('returns empty string if called with falsey value', function() {
    escape().should.equal('');
    escape('').should.equal('');
    escape(null).should.equal('');
  });
});

describe('#unescape', function() {
  it('converts &amp; into &', function() {
    unescape('&amp;').should.equal('&');
  });

  it('converts &quot; into "', function() {
    unescape('&quot;').should.equal('"');
  });

  it('converts &#39; into \'', function() {
    unescape('&#39;').should.equal('\'');
  });

  it('converts &lt; into <', function() {
    unescape('&lt;').should.equal('<');
  });

  it('converts &gt; into >', function() {
    unescape('&gt;').should.equal('>');
  });

  it('does not double unescape values', function() {
    unescape('&amp;quot;').should.equal('&quot;');
  });

  it('returns empty string if called with falsey value', function() {
    unescape().should.equal('');
    unescape('').should.equal('');
    unescape(null).should.equal('');
  });
});
*/
