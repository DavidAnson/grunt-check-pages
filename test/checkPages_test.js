'use strict';

function GruntMock(files, options, callback)  {
  var self = this;
  self.files = files || [];
  self.options = options || {};
  self.callback = callback || function() { throw new Error('No callback provided'); };
  self.warns = [];
  self.oks = [];

  self.registerMultiTask = function(name, info, fn) {
    fn.apply({
      files: self.files,
      options: function() {
        return self.options;
      },
      async: function() {
        return self.callback;
      }
    });
  };

  self.log = {
    ok: function(message) {
      self.oks.push(message);
    },
    warn: function(message) {
      self.warns.push(message);
    }
  };

  self.fail = {
    warn: function(message) {
      self.warns.push(message);
      throw new Error(message);
    }
  };
}

var path = require('path');
var domain = require('domain');
var nock = require('nock');
var checkPages = require('../tasks/checkPages.js');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

// Replacement for test.throws that handles exceptions from a callback method
function throws(test, block, message, assertions) {
  var d = domain.create();
  d.on('error', function(err) {
    d.dispose();
    test.equal(err.message, message);
    if (assertions) {
      assertions();
    }
    test.done();
  });
  d.run(function() {
    process.nextTick(block);
  });
}

function outputs(test, gruntMock, oks, warns) {
  test.equal(gruntMock.oks.length, oks.length);
  while(oks.length) {
    test.equal(gruntMock.oks.shift(), oks.shift());
  }
  test.equal(gruntMock.warns.length, warns.length);
  while(warns.length) {
    test.equal(gruntMock.warns.shift(), warns.shift());
  }
}

function throwsWrapper(test, gruntMock, oks, warns) {
  throws(
    test,
    function() {
      checkPages(gruntMock);
    },
    warns[warns.length - 1],
    function() {
      outputs(test, gruntMock, oks, warns);
    });
}

function nockAndMockXhtmlFile(page, callback) {
  nock('http://example.com')
    .get('/' + page)
    .replyWithFile(
      200,
      path.join(__dirname, page),
      { 'Content-Type': 'text/html' });
  return new GruntMock([], {
    pageUrls: ['http://example.com/' + page],
    checkXhtml: true
  }, callback);
}

exports.checkPages = {

  /* Parameters */

  filesPresent: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock(['file'], {});
    throwsWrapper(test, gruntMock, [], ['checkPages task does not use files; remove the files parameter']);
  },

  pageUrlsMissing: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock([], {});
    throwsWrapper(test, gruntMock, [], ['pageUrls option is not present; it should be an array of URLs']);
  },

  pageUrlsWrongType: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock([], { pageUrls: 'string' });
    throwsWrapper(test, gruntMock, [], ['pageUrls option is invalid; it should be an array of URLs']);
  },

  pageUrlsEmpty: function(test) {
    test.expect(2);
    var gruntMock = new GruntMock([], {
      pageUrls: []
    }, function() {
      outputs(test, gruntMock, [], []);
      test.done();
    });
    checkPages(gruntMock);
  },

  /* General */

  pageNotFound: function(test) {
    test.expect(4);
    nock('http://example.com')
      .get('/notFound.html')
      .reply(404);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/notFound.html']
    });
    throwsWrapper(test, gruntMock, [], ['Bad page (404): http://example.com/notFound.html']);
  },

  /* checkXhtml */

  checkXhtmlValid: function(test) {
    test.expect(3);
    var gruntMock = nockAndMockXhtmlFile('validPage.html', function() {
      outputs(test, gruntMock,
        ['Page: http://example.com/validPage.html'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  checkXhtmlUnclosedElement: function(test) {
    test.expect(6);
    var gruntMock = nockAndMockXhtmlFile('unclosedElement.html');
    throwsWrapper(test, gruntMock,
      ['Page: http://example.com/unclosedElement.html'],
      ['Unexpected close tag, Line: 5, Column: 7, Char: >', '1 XHTML parse error(s), see above']);
  },

  checkXhtmlUnclosedImg: function(test) {
    test.expect(6);
    var gruntMock = nockAndMockXhtmlFile('unclosedImg.html');
    throwsWrapper(test, gruntMock,
      ['Page: http://example.com/unclosedImg.html'],
      ['Unexpected close tag, Line: 4, Column: 7, Char: >', '1 XHTML parse error(s), see above']);
  },

  checkXhtmlInvalidEntity : function(test) {
    test.expect(6);
    var gruntMock = nockAndMockXhtmlFile('invalidEntity.html');
    throwsWrapper(test, gruntMock,
      ['Page: http://example.com/invalidEntity.html'],
      ['Invalid character entity, Line: 3, Column: 21, Char: ;', '1 XHTML parse error(s), see above']);
  },

  checkXhtmlMultipleErrors : function(test) {
    test.expect(7);
    var gruntMock = nockAndMockXhtmlFile('multipleErrors.html');
    throwsWrapper(test, gruntMock,
      ['Page: http://example.com/multipleErrors.html'],
      ['Invalid character entity, Line: 4, Column: 23, Char: ;', 'Unexpected close tag, Line: 5, Column: 6, Char: >', '2 XHTML parse error(s), see above']);
  },
};
