# grunt-check-pages

> Grunt task that checks various aspects of a web page for correctness.

[![npm version][npm-image]][npm-url]
[![GitHub tag][github-tag-image]][github-tag-url]
[![Build status][travis-image]][travis-url]
[![Coverage][coveralls-image]][coveralls-url]
[![License][license-image]][license-url]


## Getting Started

This plugin requires Grunt `~0.4.4`.

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-check-pages --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-check-pages');
```

(*For similar functionality without a Grunt dependency, please see the [`check-pages`](https://www.npmjs.com/package/check-pages) package.*)


## The "checkPages" task


### Overview

An important aspect of creating a web site is validating the structure, content, and configuration of the site's pages. The `checkPages` task provides an easy way to integrate this testing into your normal Grunt workflow.

By providing a list of pages to scan, the task can:

* Validate each page is accessible
* Validate all links point to accessible content (similar to the [W3C Link Checker](http://validator.w3.org/checklink))
* Validate links with query string [file hashes](http://en.wikipedia.org/wiki/List_of_hash_functions) have the expected content
* Validate page structure for XHTML compliance (akin to the [W3C Markup Validation Service](http://validator.w3.org/))
* Validate a page's response time is below some threshold
* Validate a page takes advantage of [caching for better performance](https://developers.google.com/speed/docs/insights/LeverageBrowserCaching)
* Validate a page takes advantage of [compression for better performance](https://developers.google.com/speed/docs/insights/EnableCompression)


### Usage

In your project's Gruntfile, add a section named `checkPages` to the data object passed into `grunt.initConfig()`.
The following example includes all supported options:

```js
grunt.initConfig({
  checkPages: {
    development: {
      options: {
        pageUrls: [
          'http://localhost:8080/',
          'http://localhost:8080/blog',
          'http://localhost:8080/about.html'
        ],
        checkLinks: true,
        onlySameDomain: true,
        queryHashes: true,
        noRedirects: true,
        noLocalLinks: true,
        noEmptyFragments: true,
        linksToIgnore: [
          'http://localhost:8080/broken.html'
        ],
        checkXhtml: true,
        checkCaching: true,
        checkCompression: true,
        maxResponseTime: 200,
        userAgent: 'custom-user-agent/1.2.3',
        summary: true
      }
    },
    production: {
      options: {
        pageUrls: [
          'http://example.com/',
          'http://example.com/blog',
          'http://example.com/about.html'
        ],
        checkLinks: true,
        maxResponseTime: 500
      }
    }
  }
});
```


### Options

#### pageUrls

Type: `Array` of `String`  
Default value: `undefined`  
*Required*

`pageUrls` specifies a list of URLs for web pages the task will check. The list can be empty, but must be present.

URLs can point to local or remote content via the `http`, `https`, and `file` protocols. `http` and `https` URLs must be absolute; `file` URLs can be relative. Some features (for example, HTTP header checks) are not available with the `file` protocol.

To store the list outside `Gruntfile.js`, read the array from a JSON file instead: `pageUrls: grunt.file.readJSON('pageUrls.json')`.

#### checkLinks

Type: `Boolean`  
Default value: `false`

Enabling `checkLinks` causes each link in a page to be checked for validity (i.e., an [HTTP HEAD or GET request](http://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol#Request_methods) returns success).

For efficiency, a `HEAD` request is made first and a successful result validates the link. Because some web servers misbehave, a failed `HEAD` request is followed by a `GET` request to definitively validate the link.

The following element/attribute pairs are used to identify links:

* `a`/`href`
* `area`/`href`
* `audio`/`src`
* `embed`/`src`
* `iframe`/`src`
* `img`/`src`
* `input`/`src`
* `link`/`href`
* `object`/`data`
* `script`/`src`
* `source`/`src`
* `track`/`src`
* `video`/`src`

#### onlySameDomain

Type: `Boolean`  
Default value: `false`  
Used by: `checkLinks`

Set this option to `true` to block the checking of links on different domains than the referring page.

This can be useful during development when external sites aren't changing and don't need to be checked.

#### queryHashes

Type: `Boolean`  
Default value: `false`  
Used by: `checkLinks`

Set this option to `true` to verify links with [file hashes](http://en.wikipedia.org/wiki/List_of_hash_functions) in the query string point to content that hashes to the expected value.

Query hashes can be used to [invalidate cached responses](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#invalidating-and-updating-cached-responses) when [leveraging browser caching](https://developers.google.com/speed/docs/insights/LeverageBrowserCaching) via long cache lifetimes.

Supported hash functions are:

* image.png?[crc32](http://en.wikipedia.org/wiki/Cyclic_redundancy_check)=e4f013b5
* styles.css?[md5](http://en.wikipedia.org/wiki/MD5)=4f47458e34bc855a46349c1335f58cc3
* archive.zip?[sha1](http://en.wikipedia.org/wiki/SHA-1)=9511fa1a787d021bdf3aa9538029a44209fb5c4c

#### noRedirects

Type: `Boolean`  
Default value: `false`  
Used by: `checkLinks`

Set this option to `true` to fail the task if any [HTTP redirects](http://en.wikipedia.org/wiki/URL_redirection) are encountered.

This can be useful to ensure outgoing links are to the content's canonical location.

#### noLocalLinks

Type: `Boolean`  
Default value: `false`  
Used by: `checkLinks`

Set this option to `true` to fail the task if any links to [`localhost`](http://en.wikipedia.org/wiki/Localhost) are encountered.

This is useful to detect temporary links that may work during development but would fail when deployed.

The list of host names recognized as `localhost` are:

* localhost
* 127.0.0.1 (and the rest of the `127.0.0.0/8` address block)
* ::1 (and its expanded forms)

#### noEmptyFragments

Type: `Boolean`  
Default value: `false`  
Used by: `checkLinks`

Set this option to `true` to fail the task if any links contain an empty [fragment identifier (hash)](http://en.wikipedia.org/wiki/Fragment_identifier) such as `<a href="#">`.

This is useful to identify placeholder links that haven't been updated.

#### linksToIgnore

Type: `Array` of `String`  
Default value: `undefined`  
Used by: `checkLinks`

`linksToIgnore` specifies a list of URLs that should be ignored by the link checker.

This is useful for links that are not accessible during development or known to be unreliable.

#### checkXhtml

Type: `Boolean`  
Default value: `false`

Enabling `checkXhtml` attempts to parse each URL's content as [XHTML](http://en.wikipedia.org/wiki/XHTML) and fails if there are any structural errors.

This can be useful to ensure a page's structure is well-formed and unambiguous for browsers.

#### checkCaching

Type: `Boolean`  
Default value: `false`

Enabling `checkCaching` verifies the HTTP [`Cache-Control`](https://tools.ietf.org/html/rfc2616#section-14.9) and [`ETag`](https://tools.ietf.org/html/rfc2616#section-14.19) response headers are present and valid.

This is useful to ensure a page makes use of browser caching for better performance.

#### checkCompression

Type: `Boolean`  
Default value: `false`

Enabling `checkCompression` verifies the HTTP [`Content-Encoding`](https://tools.ietf.org/html/rfc2616#section-14.11) response header is present and valid.

This is useful to ensure a page makes use of compression for better performance.

#### maxResponseTime

Type: `Number`  
Default value: `undefined`

`maxResponseTime` specifies the maximum amount of time (in milliseconds) a page request can take to finish downloading.

Requests that take more time will trigger a failure (but are still checked for other issues).

#### userAgent

Type: `String`  
Default value: `grunt-check-pages/x.y.z`

`userAgent` specifies the value of the HTTP [`User-Agent`](https://tools.ietf.org/html/rfc2616#section-14.43) header sent with all page/link requests.

This is useful for pages that alter their behavior based on the user agent. Setting the value `null` omits the `User-Agent` header entirely.

#### summary

Type: `Boolean`  
Default value: `false`

Enabling the `summary` option logs a summary of each issue found after all checks have completed.

This makes it easy to pick out failures when running tests against many pages.


## Release History

* 0.1.0 - Initial release, support for `checkLinks` and `checkXhtml`.
* 0.1.1 - Tweak README for better formatting.
* 0.1.2 - Support page-only mode (no link or XHTML checks), show response time for requests.
* 0.1.3 - Support `maxResponseTime` option, buffer all page responses, add "no-cache" header to requests.
* 0.1.4 - Support `checkCaching` and `checkCompression` options, improve error handling, use [`gruntMock`](https://www.npmjs.com/package/gruntmock).
* 0.1.5 - Support `userAgent` option, weak entity tags, update `nock` dependency.
* 0.2.0 - Support `noLocalLinks` option, rename `disallowRedirect` option to `noRedirects`, switch to [`ESLint`](http://eslint.org/), update `superagent` and `nock` dependencies.
* 0.3.0 - Support `queryHashes` option for CRC-32/MD5/SHA-1, update `superagent` dependency.
* 0.4.0 - Rename `onlySameDomainLinks` option to `onlySameDomain`, fix handling of redirected page links, use page order for links, update all dependencies.
* 0.5.0 - Show location of redirected links with `noRedirects` option, switch to `crc-hash` dependency.
* 0.6.0 - Support `summary` option, update `crc-hash`, `grunt-eslint`, `nock` dependencies.
* 0.6.1 - Add badges for automated build and coverage info to README (along with npm, GitHub, and license).
* 0.6.2 - Switch from `superagent` to `request`, update `grunt-eslint` and `nock` dependencies.
* 0.7.0 - Move task implementation into reusable `check-pages` package.
* 0.7.1 - Fix misreporting of "Bad link" for redirected links when noRedirects enabled.
* 0.8.0 - Suppress redundant link checks, support `noEmptyFragments` option, update dependencies.


[npm-image]: https://img.shields.io/npm/v/grunt-check-pages.svg
[npm-url]: https://www.npmjs.com/package/grunt-check-pages
[github-tag-image]: https://img.shields.io/github/tag/DavidAnson/grunt-check-pages.svg
[github-tag-url]: https://github.com/DavidAnson/grunt-check-pages
[travis-image]: https://img.shields.io/travis/DavidAnson/grunt-check-pages.svg
[travis-url]: https://travis-ci.org/DavidAnson/grunt-check-pages
[coveralls-image]: https://img.shields.io/coveralls/DavidAnson/grunt-check-pages.svg
[coveralls-url]: https://coveralls.io/r/DavidAnson/grunt-check-pages
[license-image]: https://img.shields.io/npm/l/grunt-check-pages.svg
[license-url]: http://opensource.org/licenses/MIT
