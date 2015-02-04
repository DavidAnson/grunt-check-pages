/*
 * grunt-check-pages
 * https://github.com/DavidAnson/grunt-check-pages
 *
 * Copyright (c) 2014-2015 David Anson
 * Licensed under the MIT license.
 */

'use strict';

var checkPages = require('check-pages');

module.exports = function(grunt) {
  // Register the task with Grunt
  grunt.registerMultiTask('checkPages', 'Grunt task that checks various aspects of a web page for correctness.', function() {
    // Check for unsupported use
    if (this.files.length) {
      throw new Error('checkPages task does not use files; remove the files parameter');
    }

    // Configure the host object
    var host = {
      log: grunt.log.ok,
      error: grunt.log.error
    };

    // Customize the options object
    var options = this.options();
    if (options.userAgent === undefined) {
      options.userAgent = 'grunt-check-pages/' + require('../package.json').version;
    }

    // Start checking
    var done = this.async();
    checkPages(host, options, function(err) {
      if (err) {
        grunt.fail.warn(err.message);
      }
      done();
    });
  });
};
