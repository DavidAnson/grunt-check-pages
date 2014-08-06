# grunt-check-pages

> Checks various aspects of a web page for validity.

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins.
Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-check-pages --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-check-pages');
```

## The "checkPages" task

### Overview
In your project's Gruntfile, add a section named `checkPages` to the data object passed into `grunt.initConfig()`.
The following example includes all supported options:

```js
grunt.initConfig({
  checkPages: {
    options: {
      pageUrls: [
        "http://example.com/",
        "http://example.com/blog",
        "http://example.com/about.html"
      ],
      checkLinks: true,
      onlySameDomainLinks: true,
      disallowRedirect: false,
      linksToIgnore: [
        "http://example.com/broken.html"
      ],
      checkXhtml: true
    },
  },
});
```

### Options

#### options.pageUrls
Type: `Array` of `String`
Default value: `null`
*Required*

`pageUrls` specifies the list of URLs identifying pages for the task to check.
URLs must be absolute and can point to local or remote content.
`pageUrls` can be empty, but must be present.

#### options.checkLinks
Type: `Boolean`
Default value: `false`

Enabling `checkLinks` causes each link in the page to be checked for validity (i.e., an HTTP HEAD request returns 200/OK).
The following element/attribute pairs are supported:
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

#### options.onlySameDomainLinks
Type: `Boolean`
Default value: `false`

...

#### options.disallowRedirect
Type: `Boolean`
Default value: `false`

...

#### options.linksToIgnore
Type: `Array` of `String`
Default value: `null`

...

#### options.checkXhtml
Type: `Boolean`
Default value: `false`

...

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality.
Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
