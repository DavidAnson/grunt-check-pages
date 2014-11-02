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
  var crypto = require('crypto');
  var url = require('url');
  var request = require('superagent');
  var cheerio = require('cheerio');
  var sax = require('sax');
  var crchash = require('./crchash');

  // Global variables
  var userAgent = 'grunt-check-pages/' + require('../package.json').version;
  var pendingCallbacks = [];
  var issueCount = 0;

  // Logs an error and increments the error count
  function logError(message) {
    grunt.log.error(message);
    issueCount++;
  }

  // Set common request headers
  function setCommonHeaders(req) {
    // Set (or clear) user agent
    if (userAgent) {
      req.set('User-Agent', userAgent);
    } else {
      req.unset('User-Agent');
    }
    // Prevent caching so response time will be accurate
    req
      .set('Cache-Control', 'no-cache')
      .set('Pragma', 'no-cache');
  }

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
        if ((!options.onlySameDomainLinks || (url.parse(resolvedLink).hostname === baseHostname)) &&
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
      var start = Date.now();
      var req = request
        .get(page)
        .use(setCommonHeaders)
        .buffer(true)
        .end(function(err, res) {
          var elapsed = Date.now() - start;
          if (err) {
            logError('Page error (' + err.message + '): ' + page + ' (' + elapsed + 'ms)');
            req.abort();
          } else if (!res.ok) {
            logError('Bad page (' + res.status + '): ' + page + ' (' + elapsed + 'ms)');
          } else {
            grunt.log.ok('Page: ' + page + ' (' + elapsed + 'ms)');
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
                logError(error.message.replace(/\n/g, ', '));
              };
              parser.write(res.text);
            }
            if (options.maxResponseTime) {

              // Check the page's response time
              if (options.maxResponseTime < elapsed) {
                logError('Page response took more than ' + options.maxResponseTime + 'ms to complete');
              }
            }
            if (options.checkCaching) {

              // Check the page's cache headers
              var cacheControl = res.headers['cache-control'];
              if (cacheControl) {
                if (!/max-age|max-stale|min-fresh|must-revalidate|no-cache|no-store|no-transform|only-if-cached|private|proxy-revalidate|public|s-maxage/.test(cacheControl)) {
                  logError('Invalid Cache-Control header in response: ' + cacheControl);
                }
              } else {
                logError('Missing Cache-Control header in response');
              }
              var etag = res.headers.etag;
              if (etag) {
                if (!/^(W\/)?\"[^\"]*\"$/.test(etag)) {
                  logError('Invalid ETag header in response: ' + etag);
                }
              } else if (!cacheControl || !/no-cache|max-age=0/.test(cacheControl)) { // Don't require ETag for responses that won't be cached
                logError('Missing ETag header in response');
              }
            }
            if (options.checkCompression) {

              // Check that the page was compressed (superagent always sets Accept-Encoding to gzip/deflate)
              var contentEncoding = res.headers['content-encoding'];
              if (contentEncoding) {
                if (!/^(deflate|gzip)$/.test(contentEncoding)) {
                  logError('Invalid Content-Encoding header in response: ' + contentEncoding);
                }
              } else {
                logError('Missing Content-Encoding header in response');
              }
            }
          }
          callback();
        });
    };
  }

  // Returns a callback to test the specified link
  function testLink(link, options, retryWithGet) {
    return function (callback) {
      var start = Date.now();
      var hash = null;
      var linkHash = null;
      if (options.queryHashes) {
        var query = url.parse(link, true).query;
        /* eslint-disable no-cond-assign */
        if (linkHash = query.sha1) {
          hash = crypto.createHash('sha1');
        } else if (linkHash = query.md5) {
          hash = crypto.createHash('md5');
        } else if (linkHash = query.crc32) {
          hash = crchash.createHash('crc32');
        }
        /* eslint-enable no-cond-assign */
      }
      var req = request
        [(retryWithGet || options.queryHashes) ? 'get' : 'head'](link)
        .use(setCommonHeaders)
        .buffer(false)
        .end(function(err, res) {
          var elapsed = Date.now() - start;
          if (!err && !res.ok && !retryWithGet) {
            // Retry HEAD request as GET to be sure
            testLink(link, options, true)(callback);
          } else {
            if (err) {
              logError('Link error (' + err.message + '): ' + link + ' (' + elapsed + 'ms)');
              req.abort();
            } else if (!res.ok) {
              logError('Bad link (' + res.status + '): ' + link + ' (' + elapsed + 'ms)');
            } else {
              grunt.log.ok('Link: ' + link + ' (' + elapsed + 'ms)');
            }
            if (!err && res.ok && hash) {
              hash.setEncoding('hex');
              res.pipe(hash);
              res.on('end', function() {
                var contentHash = hash.read();
                if (linkHash.toUpperCase() === contentHash.toUpperCase()) {
                  grunt.log.ok('Hash: ' + link);
                } else {
                  logError('Hash error (' + contentHash.toLowerCase() + '): ' + link);
                }
                callback();
              });
            } else {
              callback();
            }
          }
        });
      if (options.noRedirects) {
        req.redirects(0);
      }
      if (options.noLocalLinks) {
        var localhost = /^(localhost)|(127\.\d\d?\d?\.\d\d?\d?\.\d\d?\d?)|(\[[0\:]*\:[0\:]*\:0?0?0?1\])$/i;
        if (localhost.test(req.host)) {
          logError('Local link: ' + link);
        }
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
    options.noRedirects = !!options.noRedirects;
    options.noLocalLinks = !!options.noLocalLinks;
    options.queryHashes = !!options.queryHashes;
    options.linksToIgnore = options.linksToIgnore || [];
    if (!Array.isArray(options.linksToIgnore)) {
      grunt.fail.warn('linksToIgnore option is invalid; it should be an array');
    }
    options.checkXhtml = !!options.checkXhtml;
    options.checkCaching = !!options.checkCaching;
    options.checkCompression = !!options.checkCompression;
    if (options.maxResponseTime && (typeof (options.maxResponseTime) !== 'number' || (options.maxResponseTime <= 0))) {
      grunt.fail.warn('maxResponseTime option is invalid; it should be a positive number');
    }
    if (options.userAgent !== undefined) {
      if (options.userAgent) {
        if (typeof (options.userAgent) === 'string') {
          userAgent = options.userAgent;
        } else {
          grunt.fail.warn('userAgent option is invalid; it should be a string or null');
        }
      } else {
        userAgent = null;
      }
    }

    // Queue callbacks for each page
    options.pageUrls.forEach(function(page) {
      pendingCallbacks.push(testPage(page, options));
    });

    // Queue 'done' callback
    var done = this.async();
    pendingCallbacks.push(function() {
      if (issueCount) {
        grunt.fail.warn(issueCount + ' issue' + (issueCount > 1 ? 's' : '') + ', see above');
      }
      done();
    });

    // Process the queue
    function next() {
      var callback = pendingCallbacks.shift();
      callback(next);
    }
    next();
  });
};
