'use strict';

// Requires
var path = require('path');
var domain = require('domain');
var nock = require('nock');
var GruntMock = require('./GruntMock');
var checkPages = require('../tasks/checkPages.js');

// Block all unexpected network calls
nock.disableNetConnect();

// Replacement for test.throws that handles exceptions from a callback method by using a domain
function throws(test, block, message, assertions) {
  var d = domain.create();
  d.on('error', function(err) {
    d.dispose();
    test.equal(err.message, message);
    if (assertions) {
      assertions();
    }
    test.done();
  });
  d.run(function() {
    process.nextTick(block); // Include synchronous exceptions in the domain
  });
}

// Verifies a task's output via the Grunt mock
function testOutput(test, gruntMock, oks, warns) {
  test.equal(gruntMock.oks.length, oks.length);
  while(oks.length) {
    test.equal(gruntMock.oks.shift().replace(/\(\d+ms\)/, '(00ms)'), oks.shift());
  }
  test.equal(gruntMock.warns.length, warns.length);
  while(warns.length) {
    test.equal(gruntMock.warns.shift().replace(/\(\d+ms\)/, '(00ms)'), warns.shift());
  }
}

// Calls the checkPages task within a throws block
function checkPagesThrows(test, gruntMock, oks, warns) {
  throws(
    test,
    function() { checkPages(gruntMock); },
    warns[warns.length - 1],
    function() { testOutput(test, gruntMock, oks, warns); });
}

/* Helpers for mocking HTTP requests */

function nockFiles(files, base) {
  var scope = nock(base || 'http://example.com');
  files.forEach(function(file) {
    scope
      .get('/' + file)
      .replyWithFile(200, path.join(__dirname, file));
  });
}
function nockLinks(links, base) {
  var scope = nock(base || 'http://example.com');
  links.forEach(function(link) {
    scope
      .head('/' + link)
      .reply(200);
  });
}
function nockRedirect(link, status) {
  var slashLink = '/' + link;
  nock('http://example.com')
    .head(slashLink)
    .reply(status || 301, '', { 'Location': slashLink + '_redirected' })
    .get(slashLink)
    .reply(status || 301, '', { 'Location': slashLink + '_redirected' });
}

exports.checkPages = {

  /* Task parameters */

  filesPresent: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock(['file'], {});
    checkPagesThrows(test, gruntMock, [], ['checkPages task does not use files; remove the files parameter']);
  },

  pageUrlsMissing: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock([], {});
    checkPagesThrows(test, gruntMock, [], ['pageUrls option is not present; it should be an array of URLs']);
  },

  pageUrlsWrongType: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock([], { pageUrls: 'string' });
    checkPagesThrows(test, gruntMock, [], ['pageUrls option is invalid; it should be an array of URLs']);
  },

  linksToIgnoreWrongType: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock([], { pageUrls: [], linksToIgnore: 'string' });
    checkPagesThrows(test, gruntMock, [], ['linksToIgnore option is invalid; it should be an array']);
  },

  maxResponseTimeWrongType: function(test) {
    test.expect(4);
    var gruntMock = new GruntMock([], { pageUrls: [], maxResponseTime: 'string' });
    checkPagesThrows(test, gruntMock, [], ['maxResponseTime option is invalid; it should be a positive number']);
  },

  /* Basic functionality */

  pageUrlsEmpty: function(test) {
    test.expect(2);
    var gruntMock = new GruntMock([], {
      pageUrls: []
    }, function() {
      testOutput(test, gruntMock, [], []);
      test.done();
    });
    checkPages(gruntMock);
  },

  pageUrlsValid: function(test) {
    test.expect(4);
    nockFiles(['validPage.html', 'externalLink.html']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/validPage.html',
                 'http://example.com/externalLink.html']
    }, function() {
      testOutput(test, gruntMock,
      ['Page: http://example.com/validPage.html (00ms)',
       'Page: http://example.com/externalLink.html (00ms)'],
       []);
      test.done();
    });
    checkPages(gruntMock);
  },

  pageUrlsNotFound: function(test) {
    test.expect(5);
    nock('http://example.com').get('/notFound').reply(404);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/notFound']
    });
    checkPagesThrows(test, gruntMock,
      [],
      ['Bad page (404): http://example.com/notFound (00ms)',
       '1 issue, see above']);
  },

  pageUrlsMultiple: function(test) {
    test.expect(9);
    nockFiles(['validPage.html', 'externalLink.html', 'validPage.html']);
    nock('http://example.com').get('/notFound').reply(404);
    nock('http://example.com').get('/serverError').reply(500);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/validPage.html',
                 'http://example.com/notFound',
                 'http://example.com/externalLink.html',
                 'http://example.com/serverError',
                 'http://example.com/validPage.html']
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/validPage.html (00ms)',
       'Page: http://example.com/externalLink.html (00ms)',
       'Page: http://example.com/validPage.html (00ms)'],
      ['Bad page (404): http://example.com/notFound (00ms)',
       'Bad page (500): http://example.com/serverError (00ms)',
       '2 issues, see above']);
  },

  /* checkLinks functionality */

  checkLinksValid: function(test) {
    test.expect(19);
    nockFiles(['validPage.html']);
    nockLinks([
      'link0', 'link1', 'link3', 'link4', 'link5',
      'link6', 'link7', 'link8', 'link9', 'link10',
      'link11', 'link12', 'link13',
      'movedTemporarily_redirected',
      'movedPermanently_redirected']);
    nockRedirect('movedPermanently', 301);
    nockRedirect('movedTemporarily', 302);
    nockLinks(['link2'], 'http://example.org');
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/validPage.html'],
      checkLinks: true
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/validPage.html (00ms)',
         'Link: http://example.com/link13 (00ms)',
         'Link: http://example.com/link12 (00ms)',
         'Link: http://example.com/link11 (00ms)',
         'Link: http://example.com/link10 (00ms)',
         'Link: http://example.com/link9 (00ms)',
         'Link: http://example.com/link0 (00ms)',
         'Link: http://example.com/link8 (00ms)',
         'Link: http://example.com/link7 (00ms)',
         'Link: http://example.com/link6 (00ms)',
         'Link: http://example.com/link5 (00ms)',
         'Link: http://example.com/link4 (00ms)',
         'Link: http://example.com/link3 (00ms)',
         'Link: http://example.com/movedTemporarily (00ms)',
         'Link: http://example.com/movedPermanently (00ms)',
         'Link: http://example.org/link2 (00ms)',
         'Link: http://example.com/link1 (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  checkLinksInvalid: function(test) {
    test.expect(10);
    nockFiles(['brokenLinks.html']);
    nockLinks(['link0', 'link1', 'link2']);
    nock('http://example.com')
      .head('/broken0').reply(404)
      .get('/broken0').reply(404)
      .head('/broken1').reply(500)
      .get('/broken1').reply(500);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/brokenLinks.html'],
      checkLinks: true
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/brokenLinks.html (00ms)',
       'Link: http://example.com/link2 (00ms)',
       'Link: http://example.com/link1 (00ms)',
       'Link: http://example.com/link0 (00ms)'],
      ['Bad link (500): http://example.com/broken1 (00ms)',
       'Bad link (404): http://example.com/broken0 (00ms)',
       '2 issues, see above']);
  },

  checkLinksRetryWhenHeadFails: function(test) {
    test.expect(4);
    nockFiles(['retryWhenHeadFails.html']);
    nock('http://example.com')
      .head('/link').reply(500)
      .get('/link').reply(200);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/retryWhenHeadFails.html'],
      checkLinks: true
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/retryWhenHeadFails.html (00ms)',
         'Link: http://example.com/link (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  checkLinksOnlySameDomainLinks: function(test) {
    test.expect(4);
    nockFiles(['externalLink.html']);
    nockLinks(['link']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/externalLink.html'],
      checkLinks: true,
      onlySameDomainLinks: true
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/externalLink.html (00ms)',
         'Link: http://example.com/link (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  checkLinksDisallowRedirect: function(test) {
    test.expect(6);
    nockFiles(['redirectLink.html']);
    nockRedirect('redirect');
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/redirectLink.html'],
      checkLinks: true,
      disallowRedirect: true
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/redirectLink.html (00ms)'],
      ['Bad link (301): http://example.com/redirect (00ms)',
       '1 issue, see above']);
  },

  checkLinksLinksToIgnore: function(test) {
    test.expect(6);
    nockFiles(['ignoreLinks.html']);
    nockLinks(['link0', 'link1', 'link2']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/ignoreLinks.html'],
      checkLinks: true,
      linksToIgnore: ['http://example.com/ignore0', 'http://example.com/ignore1']
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/ignoreLinks.html (00ms)',
         'Link: http://example.com/link2 (00ms)',
         'Link: http://example.com/link1 (00ms)',
         'Link: http://example.com/link0 (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  checkLinksMultiplePages: function(test) {
    test.expect(10);
    nockFiles(['externalLink.html', 'redirectLink.html', 'ignoreLinks.html']);
    nockLinks(['link', 'link0', 'link1', 'link2', 'redirect_redirected']);
    nockRedirect('redirect');
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/externalLink.html',
                 'http://example.com/redirectLink.html',
                 'http://example.com/ignoreLinks.html'],
      checkLinks: true,
      onlySameDomainLinks: true,
      linksToIgnore: ['http://example.com/ignore0', 'http://example.com/ignore1']
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/externalLink.html (00ms)',
         'Link: http://example.com/link (00ms)',
         'Page: http://example.com/redirectLink.html (00ms)',
         'Link: http://example.com/redirect (00ms)',
         'Page: http://example.com/ignoreLinks.html (00ms)',
         'Link: http://example.com/link2 (00ms)',
         'Link: http://example.com/link1 (00ms)',
         'Link: http://example.com/link0 (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  /* checkXhtml functionality */

  checkXhtmlValid: function(test) {
    test.expect(3);
    nockFiles(['validPage.html']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/validPage.html'],
      checkXhtml: true
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/validPage.html (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  checkXhtmlUnclosedElement: function(test) {
    test.expect(6);
    nockFiles(['unclosedElement.html']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/unclosedElement.html'],
      checkXhtml: true
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/unclosedElement.html (00ms)'],
      ['Unexpected close tag, Line: 5, Column: 7, Char: >',
       '1 issue, see above']);
  },

  checkXhtmlUnclosedImg: function(test) {
    test.expect(6);
    nockFiles(['unclosedImg.html']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/unclosedImg.html'],
      checkXhtml: true
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/unclosedImg.html (00ms)'],
      ['Unexpected close tag, Line: 4, Column: 7, Char: >',
       '1 issue, see above']);
  },

  checkXhtmlInvalidEntity : function(test) {
    test.expect(6);
    nockFiles(['invalidEntity.html']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/invalidEntity.html'],
      checkXhtml: true
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/invalidEntity.html (00ms)'],
      ['Invalid character entity, Line: 3, Column: 21, Char: ;',
       '1 issue, see above']);
  },

  checkXhtmlMultipleErrors : function(test) {
    test.expect(7);
    nockFiles(['multipleErrors.html']);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/multipleErrors.html'],
      checkXhtml: true
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/multipleErrors.html (00ms)'],
      ['Invalid character entity, Line: 4, Column: 23, Char: ;',
       'Unexpected close tag, Line: 5, Column: 6, Char: >',
       '2 issues, see above']);
  },

  /* Nock configuration  */

  requestHeaders: function(test) {
    test.expect(4);
    nock('http://example.com')
      .matchHeader('User-Agent', 'grunt-check-pages/0.1.3')
      .matchHeader('Cache-Control', 'no-cache')
      .matchHeader('Pragma', 'no-cache')
      .get('/page')
      .reply(200, '<html><body><a href="link">link</a></body></html>');
    nock('http://example.com')
      .matchHeader('User-Agent', 'grunt-check-pages/0.1.3')
      .matchHeader('Cache-Control', 'no-cache')
      .matchHeader('Pragma', 'no-cache')
      .head('/link')
      .reply(200);
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/page'],
      checkLinks: true,
      checkXhtml: true
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/page (00ms)',
         'Link: http://example.com/link (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  /* maxResponseTime functionality */

  maxResponseTimeValid: function(test) {
    test.expect(3);
    nock('http://example.com')
      .get('/page')
      .reply(200, '<html></html>');
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/page'],
      maxResponseTime: 100
    }, function() {
      testOutput(test, gruntMock,
        ['Page: http://example.com/page (00ms)'],
        []);
      test.done();
    });
    checkPages(gruntMock);
  },

  maxResponseTimeSlow: function(test) {
    test.expect(6);
    nock('http://example.com')
      .get('/page')
      .delay(200)
      .reply(200, '<html></html>');
    var gruntMock = new GruntMock([], {
      pageUrls: ['http://example.com/page'],
      maxResponseTime: 100
    });
    checkPagesThrows(test, gruntMock,
      ['Page: http://example.com/page (00ms)'],
      ['Page response took more than 100ms to complete',
       '1 issue, see above']);
  },
};
