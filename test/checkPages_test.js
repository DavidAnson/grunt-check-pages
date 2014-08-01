'use strict';

function GruntMock(options, files)  {
  var self = this;
  self.options = options;
  self.files = files || [];
  self.done = false;

  self.registerMultiTask = function(name, info, fn) {
    fn.apply({
      files: self.files,
      options: function() {
        return self.options;
      },
      async: function() {
        return function() {
          self.done = true;
        };
      }
    });
  };

  self.fail = {
    warn: function(message) {
      throw new Error(message);
    }
  };
}

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

exports.checkPages = {
  filesPresent: function(test) {
    test.expect(1);
    test.throws(function() {
      checkPages(new GruntMock({}, ['file']));
    }, /checkPages task does not use files; remove the files parameter/);
    test.done();
  },

  pageUrlsMissing: function(test) {
    test.expect(1);
    test.throws(function() {
      checkPages(new GruntMock({}));
    }, /pageUrls option is not present; it should be an array of URLs/);
    test.done();
  },

  pageUrlsWrongType: function(test) {
    test.expect(1);
    test.throws(function() {
      checkPages(new GruntMock({
        pageUrls: 'string'
      }));
    }, /pageUrls option is invalid; it should be an array of URLs/);
    test.done();
  },

  pageUrlsEmpty: function(test) {
    test.expect(1);
    var gruntMock = new GruntMock({
      pageUrls: []
    });
    checkPages(gruntMock);
    test.ok(gruntMock.done);
    test.done();
  },
};
