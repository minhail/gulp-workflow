// const fs = require('fs');
const path = require('path');
const util = require('./lib/util');

const gulp = require('gulp');
const { src, dest, series, parallel, watch } = gulp;

const browserSync = require('browser-sync');
const httpProxy = require('http-proxy-middleware');
const cached = require('gulp-cached');

const del = require('del');
const gulpIf = require('gulp-if');
const sourcemaps = require('gulp-sourcemaps');

// style
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const less = require('gulp-less');
const sass = require('gulp-sass');
const cssnano = require('cssnano');

// js
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const eslintFriendlyFormatter = require('eslint-friendly-formatter');
const uglify = require('gulp-uglify');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');

// image
const imagemin = require('gulp-imagemin');

// html
const ejs = require('gulp-ejs');
const usemin = require('gulp-usemin');

// rev
const revAll = require('gulp-rev-all');
const revDel = require('gulp-rev-delete-original');

// 读取配置
const cosmiconfig = require('cosmiconfig');
const config = cosmiconfig('workflowrc').loadSync('.workflowrc').config;

// 默认路径
const defaultPaths = {
  src: {
    dir: './',
    less: './css/**/*.less',
    sass: './css/**/*.{sass,scss}',
    img: './img/**/*.{JPG,jpg,jpeg,png,gif,svg}',
    js: './js/**/*.js',
    lib: './lib/**/*',
    html: ['./**/*.html', '!./**/_*/**/*.html', '!./dev/**/*.html'],
    htmlAll: './**/*.html',
    exclude: ['./dev/**']
  },
  dev: {
    dir: './dev',
    css: './dev/css',
    img: './dev/img',
    js: './dev/js',
    lib: './dev/lib',
    html: './dev'
  },
  tmp: {
    dir: './tmp',
    css: './tmp/css',
    img: './tmp/img',
    js: './tmp/js',
    lib: './tmp/lib',
    html: './tmp'
  },
  dist: {
    dir: './dist'
  }
};

let paths = {};
let env = '';
let isDev = true;

// 设置环境变量
function setEnv(val) {
  env = val;
  process.env.NODE_ENV = val;
  isDev = env === 'development';
}

// 删除
function delHandler(patterns) {
  return del(patterns, {
    force: true
  });
}
function delDev() {
  return delHandler(paths.dev.dir);
}
function delTmp() {
  return delHandler(paths.tmp.dir);
}
function delDist() {
  return delHandler(paths.dist.dir);
}

// cached
// eslint-disable-next-line
function delCache(cacheName, cb) {
  delete cached.caches[cacheName];
  typeof cb === 'function' && cb();
}

// 复制
function copyHandler(type) {
  return src(paths.src[type])
    .pipe(cached(type))
    .pipe(gulpIf(isDev, dest(paths.dev[type]), dest(paths.tmp[type])))
    .pipe(gulpIf(isDev, browserSync.stream()));
}

// style
function compileLess() {
  return src(paths.src.less)
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(less())
    .on('error', (error) => {
      console.log(error);
    })
    .pipe(gulpIf(!isDev, postcss([
      autoprefixer(),
      cssnano({
        autoprefixer: false,
        zindex: false
      })
    ])))
    .pipe(gulpIf(isDev, sourcemaps.write('./')))
    .pipe(gulpIf(isDev, dest(paths.dev.css), dest(paths.tmp.css)))
    .pipe(gulpIf(isDev, browserSync.stream({ match: '**/*.css' })));
}

function compileSass() {
  return src(paths.src.sass)
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(gulpIf(!isDev, postcss([
      autoprefixer(),
      cssnano({
        autoprefixer: false,
        zindex: false
      })
    ])))
    .pipe(gulpIf(isDev, sourcemaps.write('./')))
    .pipe(gulpIf(isDev, dest(paths.dev.css), dest(paths.tmp.css)))
    .pipe(gulpIf(isDev, browserSync.stream({ match: '**/*.css' })));
}

// js
function compileJs() {
  let webpackConfigPath = path.join(process.cwd(), 'webpack.config.js');
  let webpackConfig;
  if (util.fileExist(webpackConfigPath)) {
    webpackConfig = require(webpackConfigPath);
  }
  return src(paths.src.js)
    .pipe(eslint())
    .pipe(eslint.format(eslintFriendlyFormatter))
    .pipe(gulpIf(!isDev, eslint.failAfterError()))
    .pipe(gulpIf(webpackConfig, webpackStream(webpackConfig, webpack), babel()))
    .pipe(gulpIf(!isDev, uglify()))
    .pipe(gulpIf(isDev, dest(paths.dev.js), dest(paths.tmp.js)))
    .pipe(gulpIf(isDev, browserSync.stream()));
}

function copyLib() {
  return copyHandler('lib');
}

// img
function imageminImg() {
  return src(paths.src.img)
    .pipe(imagemin())
    .pipe(dest(paths.tmp.img));
}

function copyImg() {
  return copyHandler('img');
}

// html
function compileHtml() {
  return src(paths.src.html)
    .pipe(ejs())
    .pipe(gulpIf(!isDev, usemin()))
    .pipe(gulpIf(isDev, dest(paths.dev.html), dest(paths.tmp.html)))
    .pipe(gulpIf(isDev, browserSync.stream()));
}

// rev
function reversion(cb) {
  if (config.reversion) {
    return src(paths.tmp.dir + '/**')
      .pipe(revAll.revision({
        dontRenameFile: ['.html', '.php'],
        dontUpdateReference: ['.html']
      }))
      .pipe(revDel())
      // .pipe(revAll.manifestFile())
      .pipe(dest(paths.tmp.dir))
  } else {
    cb();
  }
}

// tmp -> dist
function copyToDist() {
  return src(paths.tmp.dir + '/**')
    .pipe(dest(paths.dist.dir))
    .on('end', function() {
      delTmp();
    });
}

function startWatch(cb) {
  watch(paths.src.htmlAll, {
    ignored: paths.src.exclude
  }, compileHtml);
  watch(paths.src.less, {
    ignored: paths.src.exclude
  }, compileLess);
  watch(paths.src.sass, {
    ignored: paths.src.exclude
  }, compileSass);
  watch(paths.src.img, {
    ignored: paths.src.exclude
  }, copyImg);
  watch(paths.src.js, {
    ignored: paths.src.exclude
  }, compileJs);
  watch(paths.src.lib, {
    ignored: paths.src.exclude
  }, copyLib);
  cb()
}

function startServer(cb) {
  let apiProxy = httpProxy(config.devServer.httpProxy.context, config.devServer.httpProxy.option);
  let server = Object.assign({}, {
    baseDir: paths.dev.dir
  }, config.devServer.server);
  browserSync.init({
    server: server,
    port: config.devServer.port || '8080',
    middleware: [apiProxy]
  });
  cb();
}

module.exports = function() {
  Object.assign(paths, defaultPaths, config.paths);

  gulp.task('build:dev', series(
    function(cb) {
      setEnv('development');
      cb();
    },
    delDev,
    parallel(
      compileLess,
      compileSass,
      copyImg,
      compileJs,
      copyLib
    ),
    compileHtml,
    startWatch,
    startServer
  ));

  gulp.task('build:dist', series(
    function(cb) {
      setEnv('production');
      cb();
    },
    parallel(
      delDev,
      delTmp,
      delDist
    ),
    parallel(
      compileLess,
      compileSass,
      imageminImg,
      compileJs,
      copyLib
    ),
    compileHtml,
    reversion,
    copyToDist
  ));
};