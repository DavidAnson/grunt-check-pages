'use strict';

// Requires
var path = require('path');
var zlib = require('zlib');
var nock = require('nock');
var gruntMock = require('gruntmock');
var checkPages = require('../tasks/checkPages.js');

// Block all unexpected network calls...
nock.disableNetConnect();
// ... except deliberate connection errors
nock.enableNetConnect('localhost');

// Verify a task's output
function testOutput(test, ok, error) {
  return function(err, mock) {
    test.equal(mock.logOk.length, ok.length, 'Wrong logOk count');
    test.equal(mock.logError.length, error.length, 'Wrong logError count');
    if (err) {
      test.equal(err.message, error.slice(-1), 'Wrong exception text');
    }
    while (mock.logOk.length && ok.length) {
      test.equal(mock.logOk.shift().replace(/\(\d+ms\)/, '(00ms)'), ok.shift(), 'Wrong logOk item');
    }
    while (mock.logError.length && error.length) {
      test.equal(mock.logError.shift().replace(/\(\d+ms\)/, '(00ms)'), error.shift(), 'Wrong logError item');
    }
    test.done();
  };
}

/* Helpers for mocking HTTP requests */

function nockFiles(files, base, headers) {
  var scope = nock(base || 'http://example.com');
  files.forEach(function(file) {
    scope
      .get('/' + file)
      .replyWithFile(200, path.join(__dirname, file), headers);
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

  // Task parameters

  filesPresent: function(test) {
    test.expect(4);
    var mock = gruntMock.create({ files: [ { src: ['file'] } ] });
    mock.invoke(checkPages, testOutput(test,
      [],
      ['checkPages task does not use files; remove the files parameter']));
  },

  pageUrlsMissing: function(test) {
    test.expect(4);
    var mock = gruntMock.create();
    mock.invoke(checkPages, testOutput(test,
      [],
      ['pageUrls option is not present; it should be an array of URLs']));
  },

  pageUrlsWrongType: function(test) {
    test.expect(4);
    var mock = gruntMock.create({ options: { pageUrls: 'string' } });
    mock.invoke(checkPages, testOutput(test,
      [],
      ['pageUrls option is invalid; it should be an array of URLs']));
  },

  linksToIgnoreWrongType: function(test) {
    test.expect(4);
    var mock = gruntMock.create({ options: { pageUrls: [], linksToIgnore: 'string' } });
    mock.invoke(checkPages, testOutput(test,
      [],
      ['linksToIgnore option is invalid; it should be an array']));
  },

  maxResponseTimeWrongType: function(test) {
    test.expect(4);
    var mock = gruntMock.create({ options: { pageUrls: [], maxResponseTime: 'string' } });
    mock.invoke(checkPages, testOutput(test,
      [],
      ['maxResponseTime option is invalid; it should be a positive number']));
  },

  // Basic functionality

  pageUrlsEmpty: function(test) {
    test.expect(2);
    var mock = gruntMock.create({ options: {
      pageUrls: []
    }});
    mock.invoke(checkPages, testOutput(test,
      [],
      []));
  },

  pageUrlsValid: function(test) {
    test.expect(4);
    nockFiles(['validPage.html', 'externalLink.html']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html',
                 'http://example.com/externalLink.html']
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)',
       'Page: http://example.com/externalLink.html (00ms)'],
      []));
  },

  pageUrlsNotFound: function(test) {
    test.expect(5);
    nock('http://example.com').get('/notFound').reply(404);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/notFound']
    }});
    mock.invoke(checkPages, testOutput(test,
      [],
      ['Bad page (404): http://example.com/notFound (00ms)',
       '1 issue, see above']));
  },

  pageUrlsMultiple: function(test) {
    test.expect(9);
    nockFiles(['validPage.html', 'externalLink.html', 'validPage.html']);
    nock('http://example.com').get('/notFound').reply(404);
    nock('http://example.com').get('/serverError').reply(500);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html',
                 'http://example.com/notFound',
                 'http://example.com/externalLink.html',
                 'http://example.com/serverError',
                 'http://example.com/validPage.html']
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)',
       'Page: http://example.com/externalLink.html (00ms)',
       'Page: http://example.com/validPage.html (00ms)'],
      ['Bad page (404): http://example.com/notFound (00ms)',
       'Bad page (500): http://example.com/serverError (00ms)',
       '2 issues, see above']));
  },

  // checkLinks functionality

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
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkLinks: true
    }});
    mock.invoke(checkPages, testOutput(test,
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
      []));
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
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/brokenLinks.html'],
      checkLinks: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/brokenLinks.html (00ms)',
       'Link: http://example.com/link2 (00ms)',
       'Link: http://example.com/link1 (00ms)',
       'Link: http://example.com/link0 (00ms)'],
      ['Bad link (500): http://example.com/broken1 (00ms)',
       'Bad link (404): http://example.com/broken0 (00ms)',
       '2 issues, see above']));
  },

  checkLinksRetryWhenHeadFails: function(test) {
    test.expect(4);
    nockFiles(['retryWhenHeadFails.html']);
    nock('http://example.com')
      .head('/link').reply(500)
      .get('/link').reply(200);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/retryWhenHeadFails.html'],
      checkLinks: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/retryWhenHeadFails.html (00ms)',
       'Link: http://example.com/link (00ms)'],
      []));
  },

  checkLinksOnlySameDomainLinks: function(test) {
    test.expect(4);
    nockFiles(['externalLink.html']);
    nockLinks(['link']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/externalLink.html'],
      checkLinks: true,
      onlySameDomainLinks: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/externalLink.html (00ms)',
       'Link: http://example.com/link (00ms)'],
      []));
  },

  checkLinksDisallowRedirect: function(test) {
    test.expect(6);
    nockFiles(['redirectLink.html']);
    nockRedirect('redirect');
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/redirectLink.html'],
      checkLinks: true,
      disallowRedirect: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/redirectLink.html (00ms)'],
      ['Bad link (301): http://example.com/redirect (00ms)',
       '1 issue, see above']));
  },

  checkLinksLinksToIgnore: function(test) {
    test.expect(6);
    nockFiles(['ignoreLinks.html']);
    nockLinks(['link0', 'link1', 'link2']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/ignoreLinks.html'],
      checkLinks: true,
      linksToIgnore: ['http://example.com/ignore0', 'http://example.com/ignore1']
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/ignoreLinks.html (00ms)',
       'Link: http://example.com/link2 (00ms)',
       'Link: http://example.com/link1 (00ms)',
       'Link: http://example.com/link0 (00ms)'],
      []));
  },

  checkLinksMultiplePages: function(test) {
    test.expect(10);
    nockFiles(['externalLink.html', 'redirectLink.html', 'ignoreLinks.html']);
    nockLinks(['link', 'link0', 'link1', 'link2', 'redirect_redirected']);
    nockRedirect('redirect');
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/externalLink.html',
                 'http://example.com/redirectLink.html',
                 'http://example.com/ignoreLinks.html'],
      checkLinks: true,
      onlySameDomainLinks: true,
      linksToIgnore: ['http://example.com/ignore0', 'http://example.com/ignore1']
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/externalLink.html (00ms)',
       'Link: http://example.com/link (00ms)',
       'Page: http://example.com/redirectLink.html (00ms)',
       'Link: http://example.com/redirect (00ms)',
       'Page: http://example.com/ignoreLinks.html (00ms)',
       'Link: http://example.com/link2 (00ms)',
       'Link: http://example.com/link1 (00ms)',
       'Link: http://example.com/link0 (00ms)'],
      []));
  },

  // checkXhtml functionality

  checkXhtmlValid: function(test) {
    test.expect(3);
    nockFiles(['validPage.html']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkXhtml: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      []));
  },

  checkXhtmlUnclosedElement: function(test) {
    test.expect(6);
    nockFiles(['unclosedElement.html']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/unclosedElement.html'],
      checkXhtml: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/unclosedElement.html (00ms)'],
      ['Unexpected close tag, Line: 5, Column: 7, Char: >',
       '1 issue, see above']));
  },

  checkXhtmlUnclosedImg: function(test) {
    test.expect(6);
    nockFiles(['unclosedImg.html']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/unclosedImg.html'],
      checkXhtml: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/unclosedImg.html (00ms)'],
      ['Unexpected close tag, Line: 4, Column: 7, Char: >',
       '1 issue, see above']));
  },

  checkXhtmlInvalidEntity : function(test) {
    test.expect(6);
    nockFiles(['invalidEntity.html']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/invalidEntity.html'],
      checkXhtml: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/invalidEntity.html (00ms)'],
      ['Invalid character entity, Line: 3, Column: 21, Char: ;',
       '1 issue, see above']));
  },

  checkXhtmlMultipleErrors : function(test) {
    test.expect(7);
    nockFiles(['multipleErrors.html']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/multipleErrors.html'],
      checkXhtml: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/multipleErrors.html (00ms)'],
      ['Invalid character entity, Line: 4, Column: 23, Char: ;',
       'Unexpected close tag, Line: 5, Column: 6, Char: >',
       '2 issues, see above']));
  },

  // checkCaching functionality

  checkCachingValid: function(test) {
    test.expect(3);
    nockFiles(['validPage.html'], null, {
      'Cache-Control': 'public, max-age=1000',
      'ETag': '"123abc"'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      []));
  },

  checkCachingNoCache: function(test) {
    test.expect(3);
    nockFiles(['validPage.html'], null, {
      'Cache-Control': 'no-cache'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      []));
  },

  checkCachingWeakEtag: function(test) {
    test.expect(3);
    nockFiles(['validPage.html'], null, {
      'Cache-Control': 'public, max-age=1000',
      'ETag': 'W/"123abc"'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      []));
  },

  checkCachingEmptyEtag: function(test) {
    test.expect(3);
    nockFiles(['validPage.html'], null, {
      'Cache-Control': 'public, max-age=1000',
      'ETag': '""'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      []));
  },

  checkCachingMissingCacheControl: function(test) {
    test.expect(6);
    nockFiles(['validPage.html'], null, {
      'ETag': '"123abc"'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      ['Missing Cache-Control header in response',
       '1 issue, see above']));
  },

  checkCachingInvalidCacheControl: function(test) {
    test.expect(6);
    nockFiles(['validPage.html'], null, {
      'Cache-Control': 'invalid',
      'ETag': '"123abc"'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      ['Invalid Cache-Control header in response: invalid',
       '1 issue, see above']));
  },

  checkCachingMissingEtag: function(test) {
    test.expect(6);
    nockFiles(['validPage.html'], null, {
      'Cache-Control': 'public, max-age=1000'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      ['Missing ETag header in response',
       '1 issue, see above']));
  },

  checkCachingInvalidEtag: function(test) {
    test.expect(6);
    nockFiles(['validPage.html'], null, {
      'Cache-Control': 'public, max-age=1000',
      'ETag': 'invalid'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCaching: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      ['Invalid ETag header in response: invalid',
       '1 issue, see above']));
  },

  // checkCompression functionality

  checkCompressionValid: function(test) {
    test.expect(4);
    zlib.gzip('<html><body><a href="link">link</a></body></html>', function(err, buf) {
      nock('http://example.com')
        .get('/compressed')
        .reply(200, [buf], {
          'Content-Encoding': 'gzip'
        });
      nockLinks(['link']);
      var mock = gruntMock.create({ options: {
        pageUrls: ['http://example.com/compressed'],
        checkCompression: true,
        checkLinks: true
      }});
      mock.invoke(checkPages, testOutput(test,
        ['Page: http://example.com/compressed (00ms)',
         'Link: http://example.com/link (00ms)'],
        []));
    });
  },

  checkCompressionMissingContentEncoding: function(test) {
    test.expect(6);
    nockFiles(['validPage.html']);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCompression: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      ['Missing Content-Encoding header in response',
       '1 issue, see above']));
  },

  checkCompressionInvalidContentEncoding: function(test) {
    test.expect(6);
    nockFiles(['validPage.html'], null, {
      'Content-Encoding': 'invalid'
    });
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/validPage.html'],
      checkCompression: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/validPage.html (00ms)'],
      ['Invalid Content-Encoding header in response: invalid',
       '1 issue, see above']));
  },

  // maxResponseTime functionality

  maxResponseTimeValid: function(test) {
    test.expect(3);
    nock('http://example.com')
      .get('/page')
      .reply(200, '<html></html>');
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/page'],
      maxResponseTime: 100
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/page (00ms)'],
      []));
  },

  maxResponseTimeSlow: function(test) {
    test.expect(6);
    nock('http://example.com')
      .get('/page')
      .delay(200)
      .reply(200, '<html></html>');
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/page'],
      maxResponseTime: 100
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/page (00ms)'],
      ['Page response took more than 100ms to complete',
       '1 issue, see above']));
  },

  // Nock configuration

  requestHeaders: function(test) {
    test.expect(4);
    nock('http://example.com')
      .matchHeader('User-Agent', 'grunt-check-pages/0.1.4')
      .matchHeader('Cache-Control', 'no-cache')
      .matchHeader('Pragma', 'no-cache')
      .get('/page')
      .reply(200, '<html><body><a href="link">link</a></body></html>');
    nock('http://example.com')
      .matchHeader('User-Agent', 'grunt-check-pages/0.1.4')
      .matchHeader('Cache-Control', 'no-cache')
      .matchHeader('Pragma', 'no-cache')
      .head('/link')
      .reply(200);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/page'],
      checkLinks: true,
      checkXhtml: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/page (00ms)',
       'Link: http://example.com/link (00ms)'],
      []));
  },

  // Connection errors

  pageConnectionError: function(test) {
    test.expect(5);
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://localhost:9999/notListening']}});
    mock.invoke(checkPages, testOutput(test,
      [],
      ['Page error (connect ECONNREFUSED): http://localhost:9999/notListening (00ms)',
       '1 issue, see above']));
  },

  linkConnectionError: function(test) {
    test.expect(6);
    nock('http://example.com')
      .get('/page')
      .reply(200, '<html><body><a href="http://localhost:9999/notListening">notListening</a></body></html>');
    var mock = gruntMock.create({ options: {
      pageUrls: ['http://example.com/page'],
      checkLinks: true
    }});
    mock.invoke(checkPages, testOutput(test,
      ['Page: http://example.com/page (00ms)'],
      ['Link error (connect ECONNREFUSED): http://localhost:9999/notListening (00ms)',
       '1 issue, see above']));
  },
};
