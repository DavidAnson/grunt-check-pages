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
  var issueCount = 0;

  // Returns true if and only if the specified link is on the list to ignore
  function isLinkIgnored(link, options) {
    return options.linksToIgnore.some(function(isLinkIgnored) {
      return (isLinkIgnored === link);
    });
  }

  // Adds pending callbacks for all links matching <element attribute='*'/>
  function addLinks($, element, attribute, base, options) {
    var baseHostname = url.parse(base).hostname;
    $(element).each(function() {
      var link = $(this).attr(attribute);
      if (link) {
        var resolvedLink = url.resolve(base, link);
        if((!options.onlySameDomainLinks || (url.parse(resolvedLink).hostname === baseHostname)) &&
           !isLinkIgnored(resolvedLink, options)) {
          // Add to front of queue so it gets processed before the next page
          pendingCallbacks.unshift(testLink(resolvedLink, options));
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
            grunt.log.warn('Page error: ' + err);
            issueCount++;
          } else if (!res.ok) {
            grunt.log.warn('Bad page (' + res.status + '): ' + page);
            issueCount++;
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
              var parser = sax.parser(true);
              parser.onerror = function(error) {
                grunt.log.warn(error.message.replace(/\n/g, ', '));
                issueCount++;
              };
              parser.write(res.text);
            }
          }
          callback();
        });
    };
  }

  // Returns a callback to test the specified link
  function testLink(link, options, retryWithGet) {
    return function (callback) {
      var req = request
        [retryWithGet ? 'get' : 'head'](link)
        .set('User-Agent', userAgent)
        .end(function(err, res) {
          if (!err && !res.ok && !retryWithGet) {
            // Retry HEAD request as GET to be sure
            testLink(link, options, true)(callback);
          } else {
            if (err) {
              grunt.log.warn('Link error: ' + err);
              issueCount++;
            } else if (!res.ok) {
              grunt.log.warn('Bad link (' + res.status + '): ' + link);
              issueCount++;
            } else {
              grunt.log.ok('Link: ' + link);
            }
            callback();
          }
        });
      if (options.disallowRedirect) {
        req.redirects(0);
      }
    };
  }

  // Register the task with Grunt
  grunt.registerMultiTask('checkPages', 'Checks various aspects of a web page for correctness.', function() {

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

    // Queue callbacks for each page
    options.pageUrls.forEach(function(page) {
      pendingCallbacks.push(testPage(page, options));
    });

    // Queue 'done' callback
    var done = this.async();
    pendingCallbacks.push(function() {
      if (issueCount) {
        grunt.fail.warn(issueCount + ' issue' + (1 < issueCount ? 's' : '') + ', see above');
      }
      done();
    });

    // Process the queue
    var next = function() {
      var callback = pendingCallbacks.shift();
      callback(next);
    };
    next();
  });
};
