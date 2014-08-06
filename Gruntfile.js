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
      all: [
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
      tests: ['test/*_test.js']
    }
  });

  // Load this plugin's task
  grunt.loadTasks('tasks');

  // Load required plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Default: Test and lint
  grunt.registerTask('default', ['nodeunit', 'jshint']);
};
