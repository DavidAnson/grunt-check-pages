'use strict';

// A trivial mock of the Grunt API (http://gruntjs.com/api/grunt) as used by a task
module.exports = function GruntMock(files, options, callback)  {
  // Variables
  var _self = this;
  _self._files = files || [];
  _self._options = options || {};
  _self._callback = callback || function() { throw new Error('No callback provided'); };
  _self.warns = [];
  _self.oks = [];

  // grunt.registerMultiTask
  _self.registerMultiTask = function(name, info, fn) {
    fn.apply({
      files: _self._files,
      options: function() {
        return _self._options;
      },
      async: function() {
        return _self._callback;
      }
    });
  };

  // grunt.log.ok, grunt.log.warn
  _self.log = {
    ok: function(message) {
      _self.oks.push(message);
    },
    warn: function(message) {
      _self.warns.push(message);
    }
  };

  // grunt.fail.warn
  _self.fail = {
    warn: function(message) {
      _self.warns.push(message);
      throw new Error(message);
    }
  };
};
