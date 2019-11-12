var STATICHOST = '';
'use strict';

const baseUrl = 'js/1.0';

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

    return del(['js/bundle/*.js', './index.htm']);

});

gulp.task('optimize', ['preclean'], function () {

    return gulp.src('js/1.0/*.js')
        .pipe(gulp.dest('js/1.0/temp'))
        .pipe(rjs({
            name: 'main',
            include: ["../vendor/require"],
            out: "js/bundle/bundle.js",
            baseUrl: baseUrl,
            optimize: "none",
            paths: {
                'mustache':          '../vendor/mustache.min',
                'history':           '../vendor/history.min',
                'jquery':            '../vendor/jquery-3.1.0.min',
                'owl':               '../vendor/owl.carousel.min',
                'bootstrap':         '../vendor/bootstrap/3.3.7/js/bootstrap.min',
                'jquery.ccValidator':'../vendor/jquery.creditCardValidator',
                'jquery.inputmask':  '../vendor/jquery.inputmask.bundle',
                'jquery.mask':       '../vendor/jquery.mask.min',
                'jquery.cookie':     '../vendor/jquery.cookie.min',
                'jquery.mousewheel': '../vendor/jquery.mousewheel.min',
                'jquery.fancybox':   '../vendor/jquery.fancybox.pack',
                'smartbanner':       '../vendor/jquery.smartbanner',
                'validate':          '../vendor/jquery.validate.min',
                'select2':           '../vendor/select2/select2.min',
                'tna':               '//tna.knowledgecity.com/js/tna',
                'CDN':               '//cdn0.knowledgecity.com/vendors/',
                'videoplayer':       '//cdn0.knowledgecity.com/vendors/videojs-player/video.min',
                'videoswitcher':     '//cdn0.knowledgecity.com/vendors/videojs-player/video-switcher.min',
                'WebPlayer':         '//cdn0.knowledgecity.com/vendors/kc/webplayer/webplayer',
                'tinCanApi':         '//cdn0.knowledgecity.com/vendors/kc/kcpack/tincanapi',
                'scormApi':          '//cdn0.knowledgecity.com/vendors/kc/kcpack/scormapi',
                'md5':               '//cdn0.knowledgecity.com/vendors/md5/md5',
                'moment':            '//cdn0.knowledgecity.com/vendors/moment/2.22.2/moment-with-locales'


            },
            shim: {
                'main':{
                    deps:[
                        'index',
                        'aboutPortal',
                        'autoLogin',
                        'benefits',
                        'careers',
                        'certification',
                        'contactUs',
                        'courses',
                        'courseFeedback',
                        'coursesForSelect',
                        'contentCreation',
                        'faq',
                        'features',
                        'howItWorks',
                        'landing',
                        'learningLibrary',
                        'library',
                        'lms',
                        'messenger',
                        'myAccount',
                        'myLearning',
                        'ourClients',
                        'page404',
                        'partners',
                        'pressRelease',
                        'printCourseListForm',
                        'privacy',
                        'requestAccess',
                        'requiredLogin',
                        'search',
                        'showCertificate',
                        'signUp',
                        'signUpLms',
                        'signUpContentCreation',
                        'terms',
                        'testimonials',
                        'outsideTrainings',
                        'appV'
                    ]
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
                },
                'jquery.inputmask': {
                    deps: ['jquery']
                },
                'jquery.mask': {
                    deps: ['jquery']
                }
            },
            preserveLicenseComments: false
        }))

});


var folders = ['./templates/']
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

var folders = ['./templates/']
gulp.task('minify-css', function() {
  for(i=0;i<folders.length;i++){
      gulp.src(folders[i]+'**/*.css')
        .pipe(cleanCSS({debug: true, rebase: false}))
        .pipe(gulp.dest(folders[i]));
    }
});

var folders = ['./templates/']
gulp.task('minify-html', function() {
    for(i=0;i<folders.length;i++){
      gulp.src(folders[i]+'**/*.mst')
        .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
        .pipe(gulp.dest(folders[i]));
    }
});

gulp.task('babel', ['optimize'], function () {

    return gulp.src('js/bundle/*.js')
        .pipe(babel({
            "presets": ["es2015"],
            "plugins": ["transform-object-assign"],
            "compact": true,
            "comments": false
        }))
        .pipe(hash())
        .pipe(gulp.dest('js/bundle'))

});



gulp.task('postclean', ['babel','minify-js', 'minify-css', 'minify-html'], function () {

    return del(['js/bundle/bundle.js', 'js/1.0/temp'])

});

gulp.task('inject', ['postclean'], function () {
    var target = gulp.src('./src/index.htm'),
    transform = function (filepath, file, i, length) {
            return '<script src="' + STATICHOST + filepath + '"></script>';
        };
    return target.pipe(inject(gulp.src('js/bundle/*.js', {read: false}),{transform: transform}))
        .pipe(gulp.dest('.'));
});

gulp.task('build', ['inject']);

gulp.task('dev', function() {

    var target = gulp.src('./src/index.htm'),
        transform = function (filepath, file, i, length) {
            return '<script data-main="/js/1.0/main" src="' + STATICHOST + filepath + '"></script>';
        };

    return target.pipe(inject(gulp.src('js/vendor/require.js'),{transform: transform}))
        .pipe(gulp.dest('.'));
});
