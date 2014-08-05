/*
 * grunt-check-pages
 * https://github.com/DavidAnson/grunt-check-pages
 *
 * Copyright (c) 2014 David Anson
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  // Imports
  var url = require('url');
  var request = require('superagent');
  var cheerio = require('cheerio');
  var sax = require('sax');

  // Global variables
  var userAgent = 'grunt-check-pages/' + require('../package.json').version;
  var pendingCallbacks = [];

  // Returns true iff the specified link is on the list to ignore
  function isLinkIgnored(link, options) {
    return options.linksToIgnore.some(function(isLinkIgnored) {
      return (isLinkIgnored === link);
    });
  }

  // Adds pending callbacks for all links matching <element attribute='...'/>
  function addLinks($, element, attribute, base, options) {
    var baseHostname = url.parse(base).hostname;
    $(element).each(function() {
      var link = $(this).attr(attribute);
      if (link) {
        var resolvedLink = url.resolve(base, link);
        if((!options.onlySameDomainLinks || (url.parse(resolvedLink).hostname === baseHostname)) &&
           !isLinkIgnored(resolvedLink, options)) {
          pendingCallbacks.unshift(testLink(resolvedLink, options)); // Add to front of queue so it gets processed before the next page
        }
      }
    });
  }

  // Returns a callback to test the specified page
  function testPage(page, options) {
    return function (callback) {
      request
        .get(page)
        .set('User-Agent', userAgent)
        .end(function(err, res) {
          if (err) {
            grunt.fail.warn('Page error: ' + err);
          } else if (!res.ok) {
            grunt.fail.warn('Bad page (' + res.status + '): ' + page);
          } else {
            grunt.log.ok('Page: ' + page);
            if (options.checkLinks) {

              // Check the page's links for validity (i.e., HTTP HEAD returns OK)
              var $ = cheerio.load(res.text);
              addLinks($, 'a', 'href', page, options);
              addLinks($, 'area', 'href', page, options);
              addLinks($, 'audio', 'src', page, options);
              addLinks($, 'embed', 'src', page, options);
              addLinks($, 'iframe', 'src', page, options);
              addLinks($, 'img', 'src', page, options);
              addLinks($, 'input', 'src', page, options);
              addLinks($, 'link', 'href', page, options);
              addLinks($, 'object', 'data', page, options);
              addLinks($, 'script', 'src', page, options);
              addLinks($, 'source', 'src', page, options);
              addLinks($, 'track', 'src', page, options);
              addLinks($, 'video', 'src', page, options);
            }
            if (options.checkXhtml) {

              // Check the page's structure for XHTML compliance
              var errors = 0;
              var parser = sax.parser(true);
              parser.onerror = function(error) {
                grunt.log.warn(error.message.replace(/\n/g, ', '));
                errors++;
              };
              parser.write(res.text);
              if (errors) {
                grunt.fail.warn(errors + ' XHTML parse error' + (1 < errors ? 's' : '') + ', see above');
              }
            }
          }
          callback();
        });
    };
  }

  // Returns a callback to test the specified link
  function testLink(link, options) {
    return function (callback) {
      var req = request
        .head(link)
        .set('User-Agent', userAgent)
        .end(function(err, res) {
          if (err) {
            grunt.fail.warn('Link error: ' + err);
          } else if (!res.ok) {
            grunt.fail.warn('Bad link (' + res.status + '): ' + link);
          } else {
            grunt.log.ok('Link: ' + link);
          }
          callback();
        });
      if (options.disallowRedirect) {
        req.redirects(0);
      }
    };
  }

  // Register the task with Grunt
  grunt.registerMultiTask('checkPages', 'Checks various aspects of a web page for validity.', function() {

    // Check for unsupported use
    if (this.files.length) {
      grunt.fail.warn('checkPages task does not use files; remove the files parameter');
    }

    // Check for required options
    var options = this.options();
    if (!options.pageUrls) {
      grunt.fail.warn('pageUrls option is not present; it should be an array of URLs');
    } else if (!Array.isArray(options.pageUrls)) {
      grunt.fail.warn('pageUrls option is invalid; it should be an array of URLs');
    }

    // Check for and normalize optional options
    options.checkLinks = !!options.checkLinks;
    options.onlySameDomainLinks = !!options.onlySameDomainLinks;
    options.disallowRedirect = !!options.disallowRedirect;
    options.linksToIgnore = options.linksToIgnore || [];
    if (!Array.isArray(options.linksToIgnore)) {
      grunt.fail.warn('linksToIgnore option is invalid; it should be an array');
    }
    options.checkXhtml = !!options.checkXhtml;
    if (!options.checkLinks && !options.checkXhtml) {
      grunt.fail.warn('nothing to do; enable one or more of [checkLinks, checkXhtml]');
    }

    // Queue callbacks for each page
    options.pageUrls.forEach(function(page) {
      pendingCallbacks.push(testPage(page, options));
    });

    // Queue 'done' callback
    pendingCallbacks.push(this.async());

    // Process the queue
    var next = function() {
      var callback = pendingCallbacks.shift();
      callback(next);
    };
    next();
  });
};
