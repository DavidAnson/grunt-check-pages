/*
 * grunt-check-pages
 * https://github.com/DavidAnson/grunt-check-pages
 *
 * Copyright (c) 2014 David Anson
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  // Project configuration
  grunt.initConfig({

    // Linting
    eslint: {
      files: [
        'Gruntfile.js',
        'tasks/*.js',
        'test/*.js'
      ]
    },

    // Unit tests
    nodeunit: {
      files: ['test/*_test.js']
    },

    // Watcher
    watch: {
      files: ['**/*.js'],
      tasks: ['default']
    },

    // check pages
    checkPages: {
      popular: {
        options: {
          pageUrls: grunt.file.readJSON('Gruntfile-pageUrls.json'),
          checkCaching: true,
          checkCompression: true,
          userAgent: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36',
          summary: true
        }
      }
    }
  });

  // Load required plugins
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');

  // Load checkPages plugin for self-testing
  grunt.loadTasks('./tasks');

  // Custom task measures code coverage of unit tests via Istanbul (assumed to be installed globally)
  grunt.registerTask('cover', 'Code coverage via Istanbul', function() {
    var done = this.async();
    // Invoke CLI for simplicity
    grunt.util.spawn({
      cmd: 'istanbul',
      args: [
        'cover',
        'node_modules/grunt-contrib-nodeunit/node_modules/nodeunit/bin/nodeunit',
        grunt.file.expand('test/*.js')]
    }, function(error, result) {
      grunt.log.write(result.stdout);
      if (error) {
        grunt.log.error(result.stderr);
      }
      done();
    });
  });

  // Default: Test and lint
  grunt.registerTask('default', ['nodeunit', 'eslint']);
};
