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
    jshint: {
      files: [
        'Gruntfile.js',
        'tasks/*.js',
        'test/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
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
          pageUrls: [
            'http://microsoft.com/',  // Doesn't set ETag for custom user-agent; doesn't set Content-Encoding for Chrome
            'http://bing.com/',       // Doesn't set Content-Encoding
            'http://google.com/',     // Doesn't set Content-Encoding for custom User-Agent (set for Chrome header)
            'http://facebook.com/',
            'http://youtube.com',     // Doesn't set Content-Encoding for custom User-Agent (set for Chrome header)
            'http://wikipedia.org/',
            'http://twitter.com/',
            'http://amazon.com/',
            'http://linkedin.com/',
            'http://nodejs.org/',     // Doesn't set Cache-Control, ETag, or Content-Encoding
            'https://www.npmjs.org/', // Doesn't set Content-Encoding
            'https://github.com/'
          ],
          checkCaching: true,
          checkCompression: true,
          userAgent: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36'
        }
      }
    }
  });

  // Load required plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Load checkPages plugin for self-testing
  grunt.loadTasks('./tasks');

  // Default: Test and lint
  grunt.registerTask('default', ['nodeunit', 'jshint']);
};
