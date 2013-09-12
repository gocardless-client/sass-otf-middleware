'use strict';

var url = require('url');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var sass = require('node-sass');
var onTheFlyMiddleware = require('otf-render-middleware');
var fileMatches = require('file-matches');

function error(msg) {
  throw new Error(msg);
}

function sassOptions(options) {
  return _.pick(options,
    'includePaths',
    'outputStyle',
    'sourceComments',
    'file');
}

function sassRender(options) {
  var deferred = Q.defer();
  sass.render(_.extend({
    success: function sassRenderSuccess(css) {
      deferred.resolve(css);
    },
    error: function sassRenderError(err) {
      deferred.reject(err);
    }
  }, sassOptions(options)));
  return deferred.promise;
}

function middleware(options) {
  options = _.extend({
    includePaths: [],
    outputStyle: 'expanded',
    sourceComments: 'map',
    root: './',
    fileNameTransform: function fileNameTransform(filepath) {
      return filepath.replace(fileMatches.css.match, fileMatches.scss.ext);
    },
    compile: function compile(options) {
      return sassRender(options);
    }
  }, options);

  return function sassMiddleware(req, res, next) {
    var pathname = url.parse(req.url).pathname;
    if (!fileMatches.css.match.test(pathname)) { return next(); }

    var renderOptions = onTheFlyMiddleware.getOptions(pathname, options);
    if (!_.isArray(renderOptions.includePaths)) {
      error('option: `includePaths` must be an array');
    }
    renderOptions.includePaths.push(path.dirname(renderOptions.file));

    res.setHeader('Content-Type', 'text/css');

    onTheFlyMiddleware.render({
      res: res,
      next: next
    }, renderOptions);
  };
}

module.exports = middleware;
