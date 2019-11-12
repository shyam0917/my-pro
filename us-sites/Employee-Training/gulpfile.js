var STATICHOST = '';
'use strict';

const baseUrl = './Employee-Training/shared/js/';

const
    gulp          = require('gulp'),
    path          = require('path'),
    es            = require('event-stream'),
    fs            = require('fs'),
    requirejs     = require('requirejs'),
    hash          = require('gulp-hash'),
    del           = require('del'),
    babel         = require('gulp-babel'),
    inject        = require('gulp-inject'),
    cleanCSS      = require('gulp-clean-css'),
    htmlmin       = require('gulp-htmlmin'),
    rjs           = function (options) {

        return es.mapSync(function (file, cb) {

            var destPath = path.join(file.cwd, baseUrl, path.basename(file.path));
            var stream = fs.createWriteStream(destPath, {flags: 'w'});
            stream.write(file.contents, '', function() {
                requirejs.optimize(options);
            });
        });
};
gulp.task('preclean', function () {
    return del(['./Employee-Training/shared/js/bundle/*.js', './Employee-Training/template/index.htm']);
});

gulp.task('optimize', ['preclean'], function () {

    // include: ["../vendor/require"],
    return gulp.src('./Employee-Training/shared/js/*.js')
        .pipe(gulp.dest('./Employee-Training/shared/js/temp'))
        .pipe(rjs({
            name: 'main',
            out: "Employee-Training/shared/js/bundle/bundle.js",
            baseUrl: baseUrl,
            optimize: "none",
            paths: {
                'mustache':          '//code.jquery.com/mustache.min',
                'jquery':            '//code.jquery.com/jquery-3.1.0.min',
                'owl':               '//www.knowledgecity.com/js/vendor/owl.carousel.min',
                'CDN':               '//cdn0.knowledgecity.com/vendors/',
                'videoplayer':       '//cdn0.knowledgecity.com/vendors/videojs-player/video.min',
                'videoswitcher':     '//cdn0.knowledgecity.com/vendors/videojs-player/video-switcher.min',
                'WebPlayer':         '//cdn0.knowledgecity.com/vendors/kc/webplayer/webplayer',
                'validate':          baseUrl+'lib/validator/jquery.validate.min',
                'select2':           baseUrl+'lib/select2/js/select2.min',
                'config':            baseUrl+'config/config.min',
                'modalWindow':       baseUrl+'player.min',
                'preview':           baseUrl+'preview.min',
                'templater':         baseUrl+'templater.min',
                'index':             baseUrl+'index.min'
            },
            shim: {
                'main':{
                    deps:[]
                },
                'jquery.cookie': {
                    deps: ['jquery']
                },
                'bootstrap': {
                    deps: ['jquery']
                },
                'jquery.fancybox': {
                    deps: ['jquery']
                },
                'owl': {
                    deps: ['jquery']
                },
                'jquery.ccValidator': {
                    deps: ['jquery']
                }
            },
            preserveLicenseComments: false
        }))

});

/* ./templates -> ./Employee-Training */

var folders = ['./Employee-Training/']
gulp.task('minify-js', function() {
  for(i=0;i<folders.length;i++){
    gulp.src(folders[i]+'**/*.js')
        .pipe(babel({
            "presets": ["es2015"],
            "plugins": ["transform-object-assign"],
            "compact": true,
            "comments": false
        }))
        .pipe(gulp.dest(folders[i]))
    }
});

var folders = ['./Employee-Training/']
gulp.task('minify-css', function() {
  for(i=0;i<folders.length;i++){
      gulp.src(folders[i]+'**/*.css')
        .pipe(cleanCSS({debug: true, rebase: false}))
        .pipe(gulp.dest(folders[i]));
    }
});

var folders = ['./Employee-Training/']
gulp.task('minify-html', function() {
    for(i=0;i<folders.length;i++){
      gulp.src(folders[i]+'**/*.mst')
        .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
        .pipe(gulp.dest(folders[i]));
    }
});

gulp.task('babel', ['optimize'], function () {
    return gulp.src('./Employee-Training/shared/js/bundle/*.js')
        .pipe(babel({
            "presets": ["es2015"],
            "plugins": ["transform-object-assign"],
            "compact": true,
            "comments": false
        }))
        .pipe(hash())
        .pipe(gulp.dest('./Employee-Training/shared/js/bundle'))
});



gulp.task('postclean', ['babel','minify-js', 'minify-css', 'minify-html'], function () {
    return del(['./Employee-Training/shared/js/bundle/bundle.js', './Employee-Training/shared/js/temp'])
});

gulp.task('inject', ['postclean'], function () {
    var target = gulp.src('./Employee-Training/template/index.htm'),
    transform = function (filepath, file, i, length) {
            return '<script src="' + STATICHOST + filepath + '"></script>';
        };
    return target.pipe(inject(gulp.src('./Employee-Training/shared/js/bundle/*.js', {read: false}),{transform: transform}))
        .pipe(gulp.dest('.'));
});

gulp.task('build', ['inject']);
