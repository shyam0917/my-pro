var CDN                     = 'https://cdn0.knowledgecity.com/vendors/';
var STATICHOST              = '';

if(typeof kcpack==='object' && kcpack['id']==="1ac32669-cbdb-4ac5-8c3a-71a3c70d7a2b" && location.href.split('/')[2]=="cloud.scorm.com" && location.href.split('/')[3]=='sandbox')
{
    if(confirm("continue in debug more?"))
      debugger;
    console.log('testscorm');
    try{console.die()}catch(e){};
}
require(['lib/AppLocation'], function (AppLocation) {
    var appLocation = new AppLocation();
    appLocation.cachePromise();
});

require.config({
    baseUrl: STATICHOST+'/js/1.0',
    //except, if the module ID starts with "app",
   //load it from the js/app directory. paths
   //config is relative to the baseUrl, and
   //never includes a ".js" extension since
   //the paths config could be for a directory.
   paths: {
        'CDN':               CDN,
        'mustache':          STATICHOST+'/js/vendor/mustache.min',
        'history':           STATICHOST+'/js/vendor/history.min',
        'jquery':            STATICHOST+'/js/vendor/jquery-3.1.0.min',
        'jquery.cookie':     STATICHOST+'/js/vendor/jquery.cookie.min',
        'jquery.mousewheel': STATICHOST+'/js/vendor/jquery.mousewheel.min',
        'jquery.ccValidator':STATICHOST+'/js/vendor/jquery.creditCardValidator',
        'jquery.inputmask':  STATICHOST+'/js/vendor/jquery.inputmask.bundle',
        'jquery.mask':       STATICHOST+'/js/vendor/jquery.mask.min',
        //'bootstrap':        CDN + 'bootstrap/3.3.7/js/bootstrap.min',
        'bootstrap':         STATICHOST+'/js/vendor/bootstrap/3.3.7/js/bootstrap.min',
        'jquery.fancybox':   STATICHOST+'/js/vendor/vendor/jquery.fancybox.pack',
        'owl':               STATICHOST+'/js/vendor/owl.carousel.min',
        'smartbanner':       STATICHOST+'/js/vendor/jquery.smartbanner',
        'validate':          STATICHOST+'/js/vendor/jquery.validate.min',
        'select2':           STATICHOST+'/js/vendor/select2/select2.min',
        'tna':               'https://tna.knowledgecity.com/js/tna',
        'videoplayer':       CDN + 'videojs-player/video.min',
        'videoswitcher':     CDN + 'videojs-player/video-switcher.min',
        'resload':           CDN + 'resload/resload',
        'WebPlayer':         CDN + 'kc/webplayer/2.0/webplayer',
        'tinCanApi':         CDN + 'kc/kcpack/tincanapi',
        'scormApi':          CDN + 'kc/kcpack/scormapi',
        'md5':               CDN + 'md5/md5',
        'moment':            CDN + 'moment/2.22.2/moment-with-locales'
   },
   shim: {
       'history': {
           exports: 'History'
       },
       'jquery.cookie': {
           deps: ['jquery']
       },
       'jquery.mousewheel': {
           deps: ['jquery']
       },
       'videoplayer': {
           exports: 'videoplayer'
       },
        'videoswitcher': {
            deps: ['videojsToglobal', 'videoplayer']
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
       'resload': {
           deps: ['jquery']
       },
       'tna': {
           deps: ['jquery', 'resload']
        },
       'jquery.ccValidator': {
           deps: ['jquery']
       },
       'jquery.inputmask': {
           deps: ['jquery']
       },
       'jquery.mask': {
           deps: ['jquery']
       },
       'smartbanner': {
           deps: ['jquery']
       },
       'validate': {
           deps: ['jquery']
       },
       'select2': {
           deps: ['jquery']
       }
   },
   waitSeconds: 0,
   urlArgs: function(id, url) {
        return '';
    }
});

//
// common functions
//
/**
 * @param {Array}           array
 * @param {function}        fun
 * @return {Window}
 */
window.arrayWalk            = function (array, fun) {

    var parameters          = objectToArray(arguments).slice(2);

    if(!isArray(array)) {
        throw new Error('array must be an array');
    }

    if(!isArray(parameters)) {
        throw new Error('parameters must be an array');
    }

    for(var i in array) {
        if(array.hasOwnProperty(i)) {
            var params      = parameters.slice(0);
            params.unshift(array[i]);
            fun.apply(this, params);
        }
    }

    return this;
};

/**
 *
 * @param   {function}          fun
 * @param   {Array}             array
 * @param   {boolean}           isAnd
 */
window.isAnyAnArray             = function (fun, array, isAnd) {

    var result                  = isAnd;

    for(var i in array) {
        if(array.hasOwnProperty(i)) {
            if(isAnd) {
                result          = result && fun(array[i]);
            } else {
                result          = result || fun(array[i]);
            }
        }
    }

    return result;
};

/**
 * Returns true if value is not empty
 * @param value
 * @return {boolean}
 */
window.isDefined                = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isDefined, arguments, true);
    }

    return typeof value !== 'undefined';
};

/**
 * Returns true if value is not empty
 * @param value
 * @return {boolean}
 */
window.isNotEmpty               = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isNotEmpty, arguments, true);
    }

    return typeof value !== 'undefined'
        && value !== false
        && value !== null
        && value !== ''
        && value !== 0
        && value !== 0.0
        && value === value ; //check to NaN
};

window.isEmpty                  = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isEmpty, arguments, false);
    }

    return !isNotEmpty(value);
};

window.isObject                  = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isObject, arguments, true);
    }

    return typeof value === 'object' && value !== null;
};

window.isTraversable            = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isObject, arguments, true);
    }

    return Array.isArray(value) || (typeof value === 'object' && value !== null);
};

window.isArray                  = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isArray, arguments, true);
    }

    return Array.isArray(value);
};

/**
 *
 * @param   {Array|Object}      value
 * @return  {number}
 */
window.countTraversable         = function (value) {

    if(isArray(value)) {
        return value.length;
    } else if(isObject(value)) {
        return Object.keys(value).length;
    } else {
        return 0;
    }
};

/**
 *
 * @param   {Array|Object}      value
 * @return  {boolean}
 */
window.isEmptyTraversable       = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isEmptyTraversable, arguments, false);
    }

    return countTraversable(value) === 0;
};

/**
 *
 * @param   {string}            value
 * @return  {boolean}
 */
window.isString                 = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isString, arguments, true);
    }

    return typeof value === 'string';
};

/**
 *
 * @param   {string}            string
 * @return  {string}
 */
window.ucFirst                  = function (string) {

    if(!isString(string)) {
        return '';
    }

    if(string.length === 1) {
        return string.charAt(0).toUpperCase();
    }

    return string.charAt(0).toUpperCase() + string.substr(1);
};

window.isScalar                 = function (value) {

    if(arguments.length > 1) {
        return isAnyAnArray(isScalar, arguments, true);
    }

    switch(typeof value) {
        case 'string':
        case 'number':
        case 'boolean':
            return true;
        case 'object':
            return value === null;
        default:
            return false;
    }
};

/**
 * Convert object to array
 * @param   {{}|Object}                value
 * @return  {Array}
 */
window.objectToArray            = function (value) {

    if(!isObject(value)) {
        throw new Error('value has been object');
    }

    var array                   = [];

    for(var i in value) {
        if(value.hasOwnProperty(i)) {
            array.push(value[i]);
        }
    }

    return array;
};

/**
 * get deep object property be dot separated path
 * @param (Object} obj - any object
 * @param {string} path - dop separated path
 * @return {*}
 */
window.deepInObject             = function (obj, path) {

    if(!isObject(obj)){
        return null;
    }

    var paths = path.split('.');
    var current = obj;

    for (var i = 0; i < paths.length; ++i) {
        if (typeof current[paths[i]] === 'undefined' ) {
            return null;
        } else {
            current = current[paths[i]];
            if(current === null){
                return null;
            }
        }
    }
    return current;
};

define("videojsToglobal",["videoplayer"], function(videoplayer) {
    window.videojs = videoplayer;
});

require(['lib/Page'], function (Page) {
    var page = new Page();
    page.dispatcher();
});

var slideIndex = 0;
// showSlides();

// Thumbnail image controls
function currentSlide(n) {
  showSlides(slideIndex = n);
}

function showSlides() {
    var i;
    var slides = document.getElementsByClassName("mySlides");
    var dots = document.getElementsByClassName("dot");
    for (i = 0; i < slides.length; i++) {
       slides[i].style.display = "none";
    }
    slideIndex++;
    if (slideIndex > slides.length) {slideIndex = 1}
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[slideIndex-1].style.display = "block";
    dots[slideIndex-1].className += " active";
    setTimeout(showSlides, 5000); // Change image every 5 seconds
}

/**
 * Validate email
 * @param {string} email
 * @returns {boolean}
 */
window.validateEmail            = function (email) {

    if(typeof email !== 'string') {
        return false;
    }

    var regExp                  = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regExp.test(email.toLowerCase());
};