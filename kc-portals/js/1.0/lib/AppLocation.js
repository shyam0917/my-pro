define(['config!','jquery'],

    function (config,$) {

        function AppLocation()
        {
            const that              = this;
            let ltCache           = {};

            this.topCategories      = [];

            this.urlParts            = null;
            console.log("resetting lt cache locally");


            this.cachePromise       = function() {



                this.parseURL();

                var promise     = $.Deferred();

                var parts       = this.urlParts;

                var lang        = parts.pageLanguage ||"x";//if for some reason we have ceids without lang

                var ceid        = parts.contentCacheId;

                //no cache detected
                //>10000 - courses ceid, so now we loading cache only for courses, not for categories
                //categories now use navigation json files
                // if( !parts.contentCacheId || parts.contentCacheId < 10000 || this.isCourseID(parts.contentCacheId) ) {

                // //>10000 - courses ceid --- does not work anymore because our DB has more records now


                if(  !parts.contentCacheId || config.portal.catceid.indexOf(parseInt(parts.contentCacheId))>=0 || this.isCourseID(parts.contentCacheId) || parts.search == true ) {

                    promise.resolve();
                    return promise;
                    // return new Promise(function(resolve, reject) {
                    //     resolve(null);
                    // });
                }

                //generic cache file
                //long term cache file
                var cacheFile   = ceid + '.json';
                var cacheNum = ~~(Date.now()/10000);
                // we got desired ceid. now if entry exists in ltCache, return cachefile with lt rvt
                if(typeof ltCache != 'undefined' && typeof ltCache[lang] != 'undefined' && ltCache[lang][ceid]){

                    cacheFile = ceid + '--v' + ltCache[lang][ceid]+ '.json';
                    that.getCacheFile(parts, cacheFile).done(function (response) {
                        promise.resolve(response);
                    });
                }else{//if lt cache miss
                    if(config.portal['id']){
                        $.ajax({
                            // new rvt for lt cache every 100 sec, but only triggered if cache miss or page refresh
                            url: config.CDNPortal + "opencontent/portals/"+config.portal['id']+"/static/json/long-term-cache--v"+~~(Date.now()/100000)+".js", 
                            dataType: "json",
                            success: function(data){
                                //update ltCache (keeping current cache, in case we added things to it)
                                $.extend(true, (ltCache||{}), data);

                                var rvt = '';
                                
                                if(typeof ltCache != 'undefined' && typeof ltCache[lang] != 'undefined' && ltCache[lang][ceid])
                                    rvt = '--v' + ltCache[lang][ceid];
                                else
                                    rvt = '--v' + cacheNum; //get new fresh cachefile from cdn

                                cacheFile = ceid + rvt + '.json';

                                that.getCacheFile(parts, cacheFile).done(function (response) {
                                    
                                    if(typeof ltCache[lang] == 'undefined')//make space in cache if not available
                                        ltCache[lang] = {}; //x in case for some reason we have ceid but no page lang

                                    ltCache[lang][ceid] = cacheNum; //store random cachenum until page refresh, so can pull from local browser cache
                                    
                                    promise.resolve(response);
                                });
                            }
                        });
                    }
                }
                return promise;
            };


            this.getCacheFile       = function(parts, cacheFile, isSecond) {
                var promise     = $.Deferred();
                var cacheURL    = config['CDNPortal'] + 'contentcache/' + parts.pageLanguage + '/' + cacheFile;

                // for test env
                if(isNotEmpty(config.isTest) && isEmpty(isSecond)) {

                    cacheURL    = config['CDNTest'] + 'contentcache/' + parts.pageLanguage + '/' + cacheFile;

                    $.get(cacheURL).done(function (response) {
                        promise.resolve(response);
                    }).fail(function () {
                        // try get file from remote CDN
                        that.getCacheFile(parts, cacheFile, true).done(function (res) {
                            promise.resolve(res);
                        }).fail(function () {
                            promise.resolve(null);
                        });
                    });

                    return promise;
                }

                $.get( cacheURL ).done(function (response) {

                    promise.resolve(response);

                }).fail(function () {

                    promise.resolve(null);

                });

                return promise;
            }

            this.parseURL           = function() {

                    var urlParts    = {};
                    var locationURL = window.location.pathname;
                    locationURL     = locationURL.replace(/^\/|\/$/g, '');
                    if(!locationURL.length){
                        locationURL = window.location.hash;
                        locationURL = locationURL.replace(/^\/|\/$/g, '');
                    }
                    var parts       = locationURL.split('/');
                    if(!parts.length) {

                        reject();
                        throw new Error("Error parse URL");
                    }

                    urlParts.all                = parts;
                    urlParts.page               = that.getPage(parts);
                    urlParts.pageLanguage       = that.getLanguage(parts);
                    urlParts.contentCacheId     = that.getContentCache(parts);
                    urlParts.categories         = that.getCategories(parts);
                    urlParts.pageController     = that.getPageController(parts);



                    // if( + parts[2] > 10000)  {
                    if(config.portal.catceid.indexOf(parseInt(parts[2]))<0)  {

                        urlParts.courseTitle    = that.getCourse(parts);
                        urlParts.lessonTitle    = that.getLesson(parts);
                    }

                    if (parts[0].search('#') !== -1) {
                        urlParts                = that.oldURLHandler(parts);
                    }

                    if (parts[1] === 'autoLogin') {
                        urlParts.id              = parts[3];
                        urlParts.hash            = parts[2];
                    }
                    if (parts[1] === 'search') {
                        urlParts.search          = true;
                    }

                    that.urlParts               = urlParts;

            };


            this.getPage            = function(parts) {

                var pagePos         = parts.indexOf('page');

                return  pagePos > 0  ? parts[pagePos + 1] : 1;
            };


            this.getLanguage        = function(parts) {

                var lang            = config.default_lang || 'en';

                if(parts[0]) {

                    var result      = parts[0].search( /^\D{2}$/i);

                    lang            = result >=0 && parts[0] != '#!' && that.arrayIncludes(config.languages, parts[0]) ?
                                      parts[0] : lang;
                }
                if(config.startLang && that.arrayIncludes(config.languages, config.startLang) ) {
                    lang            = config.startLang
                }
                return  lang;
            };


            this.getContentCache    = function(parts) {

                return parts[2] && this.isNumber(parts[2])  ||
                       parts[2] && this.isGUID(parts[2]) ||
                       parts[2] && this.isCourseID(parts[2]) ?
                       parts[2] : null;
            };


            this.getPageController  = function(parts) {

                var pageController  = 'index';

                switch(parts[1]){
                    case 'printCourseListForm':
                            pageController  = 'printCourseListForm';
                         break;
                    default:

                        // if( parts[2]  && this.isNumber(parts[2]) &&  parts[2] < 10000)  {
                        if( parts[2]  && this.isNumber(parts[2]) &&  config.portal.catceid.indexOf(parseInt(parts[2]))>=0)  {
                            pageController  = 'library';
                        }
                        // if( parts[2]  && parts[2] > 10000)  {
                        if( parts[2]  && config.portal.catceid.indexOf(parseInt(parts[2]))<0)  {
                            pageController  = 'courses';
                        }
                        if( parts.length == 2 ) {
                            pageController =   that.removeHash(parts[1]).text;
                        }
                        if( parts[1] == "search" ) {
                            pageController =  'search';
                        }
                        if( parts[2] && this.isGUID(parts[2]) ) {
                            pageController  = 'library';
                        }
                        if( parts[2] && this.isCourseID(parts[2]) ) {
                            pageController  = 'courses';
                        }
                        if( parts[2] && !this.isGUID(parts[2]) && !this.isNumber(parts[2]) && !this.isCourseID(parts[2]) ) {
                            pageController =   parts[1];
                        }
                        if( parts[1] && parts[1] == 'landing' && parts[2] && this.isCourseID(parts[2]) ) {
                            pageController  = 'landing';
                        }
                        if( parts[1] && parts[1] == 'courseFeedback'  ) {
                            pageController  = 'courseFeedback';
                        }
                        if( parts[1] && parts[1] == 'landingFacebook' ) {
                            pageController  = 'landingFacebook';
                        }

                        break;
                }

                return  pageController;
            };

            //compatible URLs
            // /#!/BUS1058/Effective-Communication
            // /#l-en/signUp/type/business
            // /#autoLogin/***/***
            // /autoLogin/***/***
            // /en/library/ab16fc44-1c93-4be0-86a7-1dcc3a709a79/Computer/microsoft-office-2013/course/CMP1105/Word

            this.oldURLHandler     = function(parts) {

                var urlParts        = {};
                urlParts.all        = parts;
                urlParts.categories = [];
                urlParts.pageController  = 'index';
                urlParts.pageLanguage    = this.getLanguage(parts);

                var i               = 0;

                //autologin
                if( parts[0]  && parts[0] == '#autoLogin')  {

                    urlParts.pageController  = 'autoLogin';
                    urlParts.id              = parts[2];
                    urlParts.hash            = parts[1];
                }

                //autologin from EMAIL
                if( parts[1]  && parts[1] == 'autoLogin')  {

                    urlParts.pageController  = 'autoLogin';
                    urlParts.id              = parts[3];
                    urlParts.hash            = parts[2];
                }


                //old courses links
                if( parts[1]  && parts[1] == 'courses' || parts[1] && this.isCourseID(parts[1]) )  {

                    urlParts.pageController  = 'courses';

                    i = 0;
                    while(parts && !this.isCourseID(parts[i])) {
                        i++;
                    }
                    urlParts.contentCacheId  = parts[i];
                }

                //old library links
                if( parts[1]  && parts[1] == 'library')  {

                    urlParts.pageController  = 'library';

                    i = 0;
                    while(this.topCategories && this.topCategories[i].json_filename != parts[2]) {
                        i++;
                    }
                    urlParts.contentCacheId  = this.topCategories[i].id;
                    urlParts.categories.push(this.topCategories[i].json_filename);
                    urlParts.page            = 1;
                }

                //landing
                if( parts[1] && parts[1] == 'landing' ) {
                    urlParts.pageController  = 'landing';
                }
                //feedback
                if( parts[1] && parts[1] == 'courseFeedback' ) {
                    urlParts.pageController  = 'courseFeedback';
                }
                //contactus
                if( parts[1] && parts[1] == 'contactUs' ) {
                    urlParts.pageController  = 'contactUs';
                }
                //signUP
                if( parts[1] && parts[1] == 'signUp' ) {
                    urlParts.pageController  = 'signUp';
                    urlParts.categories.push(parts[3]);
                }

                that.urlParts       = urlParts;

                //rewrite to new url
                var oldPages        = ['courses', 'library', 'contactUs'];

                if(that.arrayIncludes(oldPages, urlParts.pageController))

                    window.history.pushState({}, '', this.buildURL());

                return urlParts;
            };

            this.arrayIncludes      = function(haystack, needle)
            {
                for(var i = 0; i < haystack.length; i++)
                    if(haystack[i] == needle)
                        return true;

                return false;
            };


            this.getCategories      = function(parts) {

                var categories      = [];
                // var endPos          = parts[2] > 10000  ? parts.indexOf('course') : parts.indexOf('page');
                if(typeof parts == 'undefined') parts = []
                if(typeof config.portal.catceid == 'undefined') config.portal.catceid = []

                var endPos          = config.portal.catceid.indexOf(parseInt(parts[2]))<0  ? parts.indexOf('course') : parts.indexOf('page');

                endPos              = endPos < 0 ? parts.length : endPos;

                for (var i = 3; i < endPos; i++) {

                    categories.push((that.removeHash(parts[i]).text).toLowerCase());
                }

                return categories;
            };


            this.getLesson          = function(parts) {

                var lessonPos       = parts.indexOf('course');

                return  lessonPos > 0 && parts[lessonPos + 2] ? parts[lessonPos + 2] : null;
            };


            this.getCourse          = function(parts) {

                var coursePos       = parts.indexOf('course');

                return  coursePos > 0 ? parts[coursePos + 1] : null;
            };

            this.buildURL           = function(urlPartsOverride, options) {

                var urlParts         = Object.create(this.urlParts);
                    urlPartsOverride = urlPartsOverride  || {};
                    options          = options || {};

                $.extend(urlParts, urlPartsOverride);

                return this.fullBuildURL(urlParts, options);
            };

            this.fullBuildURL       = function(urlParts, options) {

                var url             = '',
                    ceid            = urlParts.contentCacheId,
                    pageController  = urlParts.pageController;

                if(pageController == 'index'){
                    return this.handleUrlLanguage(url, urlParts,  options);
                }

                if( this.arrayIncludes(['courseFeedback'], pageController) ) {
                    var locationPath = location.pathname.split('/');
                    var courseIdIndex = locationPath.indexOf("courseFeedback") + 1;
                    var courseId = locationPath[courseIdIndex];
                    return this.handleUrlLanguage(pageController+'/'+courseId, urlParts, options);
                }

                if( !this.arrayIncludes(['index', 'library', 'courses'], pageController) ) {
                    return this.handleUrlLanguage(pageController, urlParts, options);
                }

                url                 = 'library/' + ceid + '/';

                url                 = this.handleUrlCategories(url, urlParts);
                url                 = this.handleUrlCourseLessons(url, urlParts);
                url                 = this.handleUrlPage(url, urlParts, options);

                return this.handleUrlLanguage(url, urlParts, options);
            };



            this.handleUrlLanguage   = function(url, urlParts, options) {

                if(options.includeLang === false) {
                    return url;
                }

                return '/' + urlParts.pageLanguage + '/' + url;
            };

            this.handleUrlCategories = function(url, urlParts) {

                var i               = 0;

                if(typeof urlParts.categories != 'undefined')
                    if(urlParts.categories[0] == 'course' && urlParts.categories.length == 2) urlParts.categories = {}

                while( urlParts.categories[i] ) {
                    url            += urlParts.categories[i] + '/';
                    i++;
                }

                return url;
            };

            this.handleUrlCourseLessons = function(url, urlParts) {

                var ceid            = urlParts.contentCacheId;

                // if(ceid > 10000 && urlParts.courseTitle) {
                if(config.portal.catceid.indexOf(parseInt(ceid))<0 && urlParts.courseTitle) {
                    url            += 'course/' + urlParts.courseTitle + '/';

                    if( urlParts.lessonTitle) {
                        url        +=  urlParts.lessonTitle + '/';
                    }
                }

                return url;
            };

            this.handleUrlPage      = function(url, urlParts, options) {

                if(options.includePage && urlParts.page && urlParts.page != 1) {
                    url            += 'page/' + urlParts.page;
                }

                return url;
            };


            this.isGUID             = function(guid) {

                var result          = guid.search( /^\S{8}-\S{4}-\S{4}-\S{4}-\S{12}$/i);

                return result >=0;
            };


            this.isNumber           = function(value) {
                value = +value; //per previous  code: return Number.isInteger(+value)
                return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;

            };


            this.isCourseID         = function(courseID) {

                var result          = courseID.search( /^\D{3}\d{4}\D?/i);

                return result >=0;
            };


            this.getBreadCrumbs     = function(data) {
                var breadCrumbs         = [];
                var parts               = this.urlParts;
                var currentTopCategory  = [];

                currentTopCategory      = this.topCategories.filter(function(category) {

                    return category['json_filename'] == parts.categories[0];
                });

                breadCrumbs.push({
                    type:    'home',
                    caption: 'Home',
                    url:     this.buildURL({
                                   pageController: 'index'
                             })
                });

                if(parts.categories.length && currentTopCategory.length) {

                    breadCrumbs.push({
                        type:    'category',
                        caption: parts.categories[0],
                        url:     this.buildURL({
                                    pageController: 'library',
                                    contentCacheId: currentTopCategory[0]['id'],
                                    categories:     [currentTopCategory[0]['json_filename']]
                                 })
                    });
                }

                if(parts.categories[1] && parts.categories[1].length && parts.pageController != 'courses') {

                     breadCrumbs.push({
                         type:    'category',
                         caption: parts.categories[1],
                         url:      ''
                     });
                }

                if(parts.courseTitle && currentTopCategory.length) {

                    breadCrumbs.push({
                        type:    'course',
                        caption: data.title,
                        url:     this.buildURL({
                                    pageController: 'library',
                                    contentCacheId: data.ceid,
                                    courseTitle:    data.slug,
                                    categories:     [currentTopCategory[0]['json_filename']]
                                })
                        });
                }


                if( (parts.courseTitle && !currentTopCategory.length) ||
                    (!parts.courseTitle && !currentTopCategory.length && parts.pageController == 'courses' && data && data.course_id && data.slug)
                ) {

                     breadCrumbs.push({
                         type:    'course',
                         caption: data.title,
                         url:     this.buildURL({
                                    pageController: 'library',
                                    contentCacheId: data.ceid,
                                    courseTitle:    data.slug,
                                    categories:     []
                                  })
                     });
                }

                if(parts.lessonTitle) {

                    breadCrumbs.push({
                        type:       'lesson',
                        caption:    data.lessonTitle,
                        url:        ''
                    });
                }

                breadCrumbs.forEach(function(item, i, breadCrumbs) {

                    item['last']      = breadCrumbs.length == i + 1;
                    item['delimeter'] = breadCrumbs.length != i + 1 ? ' > ' : null;

                });
                return breadCrumbs;
            };

            this.removeHash         = function(str) {

                var result = {
                  text:  str
                };

                if(str.search("#", 2) != -1) {
                    var parts       =  str.split("#");
                    result.text     = parts[0];
                    result.hash     = parts[1];
                }

                return result;
            };


        }

        return AppLocation;
});
