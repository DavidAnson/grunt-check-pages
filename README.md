# grunt-check-pages

> Checks various aspects of a web page for correctness.


## Getting Started

This plugin requires Grunt `~0.4.4`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-check-pages --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-check-pages');
```


## The "checkPages" task


### Overview

An important aspect of creating a web site is to validate the structure and content of the site's pages. The `checkPages` task provides an easy way to integrate this testing into your normal Grunt workflow.

By providing a list of pages to scan, the task can:

* Validate each page is accessible
* Validate all links point to accessible content (similar to the [W3C Link Checker](http://validator.w3.org/checklink))
* Validate page structure for XHTML compliance (akin to the [W3C Markup Validation Service](http://validator.w3.org/))


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
        onlySameDomainLinks: true,
        disallowRedirect: false,
        linksToIgnore: [
          'http://localhost:8080/broken.html'
        ],
        checkXhtml: true
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
        checkXhtml: true
      }
    }
  }
});
```


### Options

#### pageUrls

Type: `Array` of `String`  
Default value: `null`  
*Required*

`pageUrls` specifies a list of URLs for web pages the task will check.

URLs must be absolute and can point to local or remote content. The `pageUrls` array can be empty, but must be present.

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

#### onlySameDomainLinks

Type: `Boolean`  
Default value: `false`  
Used by: `checkLinks`

Set this option to `true` to block the checking of links on different domains than the referring page.

This can be useful during development when external sites aren't changing and don't need to be checked.

#### disallowRedirect

Type: `Boolean`  
Default value: `false`  
Used by: `checkLinks`

Set this option to `true` to block HTTP redirects by failing the task if any are encountered.

This can be useful to ensure outgoing links are to the content's canonical location.

#### linksToIgnore

Type: `Array` of `String`  
Default value: `null`  
Used by: `checkLinks`

`linksToIgnore` specifies a list of URLs that should be ignored by the link checker.

This is useful for links that are not accessible during development or known to be unreliable.

#### checkXhtml

Type: `Boolean`  
Default value: `false`

Enabling `checkXhtml` attempts to parse each URL's content as [XHTML](http://en.wikipedia.org/wiki/XHTML) and fails if there are any structural errors.

This can be useful to ensure a page's structure is well-formed and unambiguous for browsers.


## Release History

* 0.1.0 - Initial release, support for `checkLinks` and `checkXhtml`.
* 0.1.1 - Tweak README for better formatting.
* *PENDING* - Support page-only mode (i.e., no link or XHTML checks).
