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
function throws(test, block, message) {
  var d = domain.create();
  d.on('error', function(err) {
    d.dispose();
    test.equal(err.message, message);
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
  while(oks.warns) {
    test.equal(gruntMock.warns.shift(), warns.shift());
  }
}

exports.checkPages = {
  filesPresent: function(test) {
    test.expect(1);
    var gruntMock = new GruntMock(['file'], {});
    throws(test, function() {
      checkPages(gruntMock);
    }, 'checkPages task does not use files; remove the files parameter');
  },

  pageUrlsMissing: function(test) {
    test.expect(1);
    var gruntMock = new GruntMock([], {});
    throws(test, function() {
      checkPages(gruntMock);
    }, 'pageUrls option is not present; it should be an array of URLs');
  },

  pageUrlsWrongType: function(test) {
    test.expect(1);
    var gruntMock = new GruntMock([], {
        pageUrls: 'string'
      });
    throws(test, function() {
      checkPages(gruntMock);
    }, 'pageUrls option is invalid; it should be an array of URLs');
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

  pageNotFound: function(test) {
    test.expect(1);
    nock('http://example.com')
      .get('/notFound.html')
      .reply(404);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/notFound.html']
    });
    throws(test, function() {
      checkPages(gruntMock);
    }, 'Bad page (404): http://example.com/notFound.html');
  },

  checkXhtmlValid: function(test) {
    test.expect(3);
    nock('http://example.com')
      .get('/validPage.html')
      .replyWithFile(200, path.join(__dirname, 'validPage.html'), { 'Content-Type': 'text/html' });
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/validPage.html'],
      checkXhtml: true
    }, function() {
      outputs(test, gruntMock, ['Page: http://example.com/validPage.html'], []);
      test.done();
    });
    checkPages(gruntMock);
  }
};
