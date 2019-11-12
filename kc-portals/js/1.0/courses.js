;define(['config!', 'jquery', 'lib/Page', 'lib/CallGet', 'lib/CallPost', 'ui/FeedbackForm', 'ui/Quiz', 'ui/Tabs', 'owl', 'ui/player', 'WebPlayer', 'tinCanApi', 'scormApi', 'ui/ModalWindow', 'lib/CourseScroll'],
    function (config, $, Page, CallGet, CallPost, FeedbackForm, Quiz, Tabs, owlCarousel, Player, WebPlayer, TinCanApi, ScormApi, ModalWindow, CourseScroll) {

    function Courses() {

        /**
         * Unique guid for lesson progress
         * @type {string|null}
         */
        // var lessonProgressID     = null;
        // var currentLessonID      = null;
        var breadCrumbs             = [];
        var topCategoryCode         = null;
        var courseCode              = null;
        var lessons                 = null;
        var currentLessonId         = null;
        var accountSettings;
        let courseName;
        var repeatSaveProgress      = 0;
        var PlayerWidth             = 800;//dynamic
        var lessonAspectRatio       = 16/9;//dynamic

        var assignedCourse          = null;
        var courseStates            = {
            unknown                    :"unknown",
            notStarted                 :"notStarted",
            inProgress                 :"inProgress",
            allLessonsCompleted        :"allLessonsCompleted",
            passed                     :"passed"
        };
        var courseState             = courseStates.unknown;
        var eBooks                  = null;
        var hostName                = location.protocol+'//'+ location.host;
        var to_watch                = false;
        let progresses = {};
        var player;

        let events                  = null;

        Page.call(this);

        var page  = this;

        /* template for show abuse categories list in modal window */
        let abuseCategoriesTpl      = null;
        let abuseFormTpl            = null;
        $(window).unbind('scroll');

        this.courseScroll = new CourseScroll();

        //if(!scormApi.isReady){scormApi.initialize(true); scormApi.LMSSetValue('cmi.core.student_id', "usertest123f");} //uncomment to simulate scorm

        this.getClassName           = function () {
            return 'Courses';
        };

        this.defineContent          = function () {

            $.when(this.outContentPromise).then(() => {
                this.setHandlers();

                //show id in case need lookup in lms(see User.js:autologin). also log out when done
                if(window['kcpack']) {
                    if(window['kcpack']['usec'])
                        $('body').prepend('<div style="font-size:10px;color:#ccc;height:0px">id: '+window['kcpack']['usec']+'</div>');

                    window.addEventListener('beforeunload', (e) => {
                        console.log("ending session");
                        this.user.removeLocalUserData();
                        $.removeCookie('LocalUserData', {'path': '/'});
                        return;
                    });
                }
                //page is now fully loaded and ready.
            });

            return this.getUserData().then(()=> { //get user data first because currently get CourseData returns different if user is auth (that is not good)
                return this.getUserProgressData();
            }).then((resUser) => {

                if(resUser.is_course_found !== true && resUser.is_assigned !== true){
                    this.redirect404();
                    return $.Deferred().reject();
                }

                return $.when(
                    resUser,
                    this.getCourseData(),
                    this.user.isAuth() ? this.getCoursesForSelected() : $.Deferred().resolve([]),
                    this.defineCategoriesData(),
                    this.getPageMui(),
                    this.updateAccountSettings()
                );

            }).then((resUser, resCourse, coursesForSelect, resPage, pageMui) => {




                resCourse.isRequestAccess   = this.user.isCoursesConfirmation();

                for( let i in coursesForSelect) {
                    if(coursesForSelect[i].course_id === resCourse.course_id){
                        resCourse.is_selectable = true;
                        break;
                    }
                }
                                     this.handleCategoriesData(resPage);
                let data           = this.handleContentData(resCourse, resUser);
                // if( typeof accountSettings != 'undefined' ) {
                //     resCourse.chapters = this.checkLessonsSequence(resCourse.chapters);
                // }
                let canonical      = this.defineCanonical(resCourse);
                breadCrumbs        = this.appLocation.getBreadCrumbs(resCourse);

                //update state and notify listeners (eg SCORM. without it, courses marked complete by default)
                this.sendCourseEvent("courseLaunched", data.course, accountSettings);

                data['iskcpack'] = ( "kcpack" in this.getMainData() );
                $.extend(data, pageMui);

                if(typeof resCourse.manuals === 'object'){
                    resCourse.manuals = that.userCourses.filterManuals(resCourse.manuals, data['course']['is_access']);
                    resCourse.isManuals = resCourse.manuals.length > 0;
                }else{
                    resCourse.isManuals = false;
                    resCourse.noManuals = true;
                }

                // initially, when course loads, make the content language same as page ui language
                // then, if the language is not available, or user selects another languge in the player, this gets overridden
                localStorage.setItem('lessonContentLanguage', this.getLanguage());

                return $.when(this.getLessonText(data),
                              this.getCoursesEBooks(resCourse.course_id, resCourse.lang, config)).then((resLesson, eBooks) => {
                    if(eBooks.length > 0 ) {
                        $.extend(data, {
                            breadCrumbs: breadCrumbs,
                            canonical: canonical,
                            eBooks:eBooks
                        }, resLesson);
                    } else {
                        $.extend(data, {
                            breadCrumbs: breadCrumbs,
                            canonical: canonical,
                        }, resLesson);
                    }

                    var resourceCEID = parseInt(page.urlParts.contentCacheId);

                    data.course.targetLesson = null;

                    $.each(data.course.chapters, function(index, chapter){
                        $.each(chapter.lessons, function (index, lesson) {
                            var intCeid = parseInt(lesson['ceid']);
                            if(intCeid === resourceCEID){
                                data.course.targetLesson = lesson['id'];
                                return false;
                            }
                        });
                        if(data.course.targetLesson !== null){
                            return false;
                        }
                    });

                    if(data.course.targetLesson === null){
                        let chapters = deepInObject(data, 'course.chapters');
                        if(isArray(chapters)
                            && isObject(chapters[0])
                            && isArray(chapters[0].lessons)
                            && isObject(chapters[0].lessons[0])
                            && typeof data.course.chapters[0].lessons[0].id == "string") {
                            data.course.targetLesson = data.course.chapters[0].lessons[0].id;
                            // data.course.targetLesson = chapters[0].lessons[0];
                        }
                    }


                    this.setContentData(data);

                });

            });

        };

        this.getUserData            = () => {
            var userDataPromise = $.Deferred();
            if("kcpack" in this.getMainData() && this.getMainData().kcpack['autoLogin'] && !this.user.isAuth()){
                this.user.autoLogin(this.getKcpackStudentId()).done(isSuccess => {
                    console.log("autologin result:", isSuccess);
                }).fail(() => {
                    console.log('unexpected autologin error');
                }).always(() => {
                    userDataPromise.resolve(); //need to always resolve or page won't render
                });
            }else{
                userDataPromise.resolve();
            }

            return userDataPromise;
        };

        this.getCourseData          = () => {

            let prom = $.Deferred();

            this.appLocation.cachePromise().then( cache => {

                // Off cache for classes
                if(cache && cache['course_format'] !== 'class') {

                    //cache = $.parseJSON(cache);
                    courseName = cache.title;
                    courseCode = cache.course_id;

                    prom.resolve(cache);
                } else {

                    let courseCEID      = typeof kcpack === 'object' ? kcpack.courseId : page.urlParts.contentCacheId;

                    let params = {
                        'lang':             this.getLanguage(),
                        '_extend' :         'default_language'
                    };

                    if(this.user.isAuth()) {
                        params.token        = this.user.getSessionId();
                    }

                    this.remoteCall(new CallGet(
                        'portals/0' + this.getPortalName() + '/course/0' + courseCEID + '/',
                        params,
                        (data) => {


                            //temporary while API not fixed
                            if (!data || !data.response || !data.response.title) {
                                return this.generatePageError();
                            }

                            courseName  = data.response.title;
                            courseCode  = data.response.course_id;

                            prom.resolve(data.response);
                        }
                    ).defineErrorHandler((query, status) => {

                         if(status == 404) {
                            console.log('redirect404() in courses.getCourseData');
                             this.redirect404();
                         } else {
                             prom.reject();
                             return this.generatePageError();
                             //console.error('Error occured: status = ' + status + 'for query: ' + query.toString());

                         }
                    }));


                }

             });

            return prom;
        };

        this.checkLessonsSequence  = function ( lesson ) {
            if( typeof accountSettings != 'undefined' ) {
                let inSequence = ( typeof accountSettings['isLessonsInSequence'] != 'undefined' ) ? accountSettings['isLessonsInSequence']  : false;
                    if(inSequence) {
                        if(!lesson.isWatched ) {
                            if(!to_watch) {
                                lesson['isSequence'] = false;
                                to_watch = true;
                            } else {
                                lesson['isSequence'] = true;
                                lesson['noAccess'] = true;
                            }
                        }
                    }
            }
            return lesson;
        };

        this.changeNextLessonSequence = function () {
            var new_lesson;
            $.each( lessons, function( i, lesson ) {
                if(lesson.isWatched != true) {
                    new_lesson = lesson ;
                    return false;
                }
            });
            if(typeof new_lesson != 'undefined' ) {
                if( !new_lesson.isWatched ) {
                    new_lesson.isSequence = false;
                    $('div[data-lessonid="' + new_lesson.lesson_id + '"]').removeClass('lock').removeClass('noaccess').addClass('unlock').addClass('courseLesson');

                    $('#notwatching-' + new_lesson.lesson_id + '').removeClass('sequence');
                }
            }
        };

        this.updateAccountSettings = function() {
            var prom= $.Deferred();

            if(typeof this.user.getAccountId() != 'undefined') {

                this.getAccountConfig(this.user.getAccountId(), this.user).done(function (response) {
                    accountSettings  = response;
                }).fail(function(){
                    accountSettings  = undefined;
                }).always(function(){
                    prom.resolve(accountSettings);
                });

            } else {
                accountSettings = undefined;
                return prom.resolve(accountSettings);
            }

            return prom;
        };

        this.getLessonText         = function (data) {

            let prom = $.Deferred();

            if ( !this.urlParts.lessonTitle || !data.course.vttFile ) {

                prom.resolve({
                    "lessonText": null
                });

                return prom;
            }

            $.get(data.course.vttFile, function (vttFile) {

                var player          = new Player();
                var vttPhrases      = player.parseVTT(vttFile);
                var vttText         = '';

                $.each(vttPhrases, function (i, phrase) {
                    vttText += phrase.text.replace('<br>', '') + ' ';
                });

                prom.resolve({"lessonText":vttText});

            }).fail(function () {
                prom.resolve({
                    "lessonText": null
                });
            });

            return prom;
        };


        this.getUserProgressData       = function () {

            let prom = $.Deferred();

            let params = {
                    lang :             this.getLanguage()
                };

            if(this.user.isAuth()) {
                params.token        = this.user.getSessionId();
            }

            let courseId            = typeof kcpack === 'object' ? kcpack.courseId : page.urlParts.contentCacheId;

            //it is like a ceid
            if(courseId.match(/^\d+$/)){
                params._extend      = 'use_course_ceid';
            }

            this.remoteCall(new CallGet(
                'portals/0' + this.getPortalName() + '/course/0' + courseId + '/userdata/',
                params,
                (data) => {

                    prom.resolve(data.response);
                }
            ).defineErrorHandler((query, status) => {
                if(status == 404) {
                    console.log('redirect404() in courses.getUserProgressData');
                    this.redirect404();
                } else {
                    console.error('Error occured: status = ' + status + 'for query: ' + query.toString());
                    prom.reject();
                }
            }));

            return prom;

        };

        this.getLessonStatusInApi   = function(lessonGUID) {
            //get lesson status from api, eg to see if local status is the same
            let prom = $.Deferred();

            if(!this.user.isAuth()) {
                prom.reject({"reason":"not_authorised"})
                return prom;
            }

            this.remoteCall(new CallGet(
                'students/stats/courses/0' + this.defineCourseCode()  + '/lessons/'+lessonGUID+'/status/',
                {
                    token: this.user.getSessionId()
                },
                (data) => {
                    prom.resolve(data.response);
                }
            ).defineErrorHandler((query, status) => {
                prom.reject({"reason":"unknown"});
            }));

            return prom;
        }

        this.defineCategoryCode     = function () {
            return topCategoryCode;
        };

        this.defineCourseCode       = function () {

            return courseCode;
        };

        this.defineCurrentLessonId  = function () {
            return currentLessonId;
        };


        this.defineCourseName       = function () {

            return courseName;
        };

        this.onPlayScormCourse          = function (node, event) {
            var that = this
            event.preventDefault();
            if(!this.user.isAuth())
                return this.showAlert(this.getMessageByCode(this.NOT_AUTH), true);

            var data = this.getContentData();

            if(!data.course['is_access'])
                return this.showAlert(this.getMessageByCode(this.LESSON_NO_ACCESS_LOGGED_IN), true);

            $.ajax({
                url:that.config['APIUrl'] +"courses/0"+that.defineCourseCode()+"/cdnlink",
                dataType:'json',
                cache:false
            }).done(function(r){
                var scormPlayer = new WebPlayer("scorm",r.response.link + "play-scorm.html");

                scormPlayer.on('lessonStarted', function(eventData){
                    if(!lessons[eventData.lessonIndex]['progressPromise'])
                        lessons[eventData.lessonIndex].progressPromise = $.Deferred();
                    else
                        return;//ignore another lesson Started if already started

                    that.userCourses.saveLessonStats(data.course.code, lessons[eventData.lessonIndex].id).done(function(id){
                        lessons[eventData.lessonIndex].progressPromise.resolve({progressId:id})
                        //console.log("start recorded", id, eventData)
                    });
                    //console.log('lessonStarted', eventData);
                });

                scormPlayer.on('lessonCompleted', function(eventData){
                    lessons[eventData.lessonIndex].progressPromise.done(function(d){
                        that.userCourses.saveLessonStats(data.course.code, lessons[eventData.lessonIndex].id, d.progressId).done(function(){
                            lessons[eventData.lessonIndex].progressPromise = null;
                            lessons[eventData.lessonIndex].isWatched = true;
                            //console.log("saved", eventData);
                        });
                    });
                    //console.log('lessonCompleted', eventData);
                });

                var progress =[];
                for(var i=0;i<lessons.length;i++)
                    progress.push(lessons[i]['isWatched']?1:"");
                progress = progress.join(',');

                $('#courseScormWrapper').children().hide(); //hide poster
                scormPlayer.play('#courseScormWrapper',{
                    courseId:that.defineCourseCode(),
                    lang: data.course.language,
                    progress: progress
                });

            });

            return true;
        };

        this.handleContentData      = function (data, userData, categoriesData) {




            const self              = this;

            assignedCourse          = userData['is_assigned'];

            if(this.user.isCoursesConfirmation()) {
                data['isRequestAccess'] = true;
            }

            lessons                 = [];

            data.code               = data['course_id'];
            data.language           = this.getLanguage();
            data.is_access          = userData.is_access;
            data.is_assigned        = userData.is_assigned;
            data.quiz               = userData.quiz;
            data.is_sidebar         = true;

            // convert properties to simple array
            if(isObject(data['properties'])) {
                data['properties']      = objectToArray(data['properties']);
            }

            // new code for learning path
            if(typeof userData['is_access'] !== 'undefined') {
                data['is_access'] = userData['is_access'];
            }

            if(this.user.isCoursesConfirmation() && data.is_selected && !data.is_assigned) {
                data.is_selectable  = true;
            }

            // build ex urls
            data.ico_src            = this.config.CDNContent + 'icons/' + data.code + '.png';
            data['preview']         = {
                path:       this.config.CDNContent + 'previews/',
                src:        data['code'] + '/1280.jpg',
                src2x:      data['code'] + '/1600.jpg',
                sources: [
                    { w: '240w', src: data['code'] + '/240.jpg'},
                    { w: '320w', src: data['code'] + '/320.jpg'},
                    { w: '400w', src: data['code'] + '/400.jpg'},
                    { w: '640w', src: data['code'] + '/640.jpg'},
                    { w: '720w', src: data['code'] + '/720.jpg'},
                    { w: '800w', src: data['code'] + '/800.jpg'},
                    { w: '1280w', src: data['code'] + '/1280.jpg'},
                    { w: '1600w', src: data['code'] + '/1600.jpg'}
                ]
            };
            data.manual             = data['has_manual'] == 1 && this.user.isAuth();

            // for class
            if(data['course_format'] === 'class') {
                data.is_not_quiz    = true;
                data.is_no_video    = true;
                data.is_class       = true;
                data.is_sidebar     = false;
                data.runtime        = false;

                data.is_class       = false;
                data.is_events      = true;
                data.is_events_exists = false;
            }

            // for new class type
            if(isTraversable(data['events'])) {
                data.is_class       = false;
                data.is_events      = true;
                data.is_events_exists = !isEmptyTraversable(data['events']);
                events              = this.formatEvents(data);
            }

            data.is_auth                    = this.user.isAuth();

            try{if(!data.quiz.hasQuiz) data.is_not_quiz = true;}catch(e){}

            this.userCourses.formatDescription(data, this.getMui());

            if (data.manual) {

                data.manual_url = this.config.CDNContent + 'manuals/' + data.language  + '/' + data.code + '.pdf';

            }

            var lessonCount         = 1;
            var totalRuntime        = 0;


            data.chapters           = $.map(data.chapters, function (chapter) {

                chapter.chapterRuntime = 0;
                chapter.lessons     = $.map(chapter.lessons, function (lesson) {


                    lesson['id']    = lesson['lesson_id'];
                    lesson['time']  = self.formatSecondsToMins(lesson['runtime_seconds']);
                    // delete .mp4
                    lesson['file']  = lesson['file'].substr(0, lesson['file'].indexOf('.'));

                      if( userData.progress[lesson['lesson_id']] ) {
                          lesson['end_time'] = userData.progress[lesson['lesson_id']].end_time;
                      }

                    //generate lessons atr href
                    lesson['link']          = page.generateLessonUrl(lesson);

                    var openLessons         = self.config.portal.openLessons || self.config.portal.openLessons == 0 ?
                                              self.config.portal.openLessons : self.config.openLessons;

                    self.userCourses.defineLessonAttributes(data, lesson, lessonCount, openLessons);

                    lesson = self.checkLessonsSequence( lesson );

                    lessonCount++;
                    totalRuntime    = totalRuntime + lesson['runtime_seconds'];
                    chapter.chapterRuntime = chapter.chapterRuntime + lesson['runtime_seconds'];
                    //console.log(totalRuntime);



                    lessons.push(lesson);
                    return [lesson];
                });

                chapter.chapterRuntime = page.formatSecondsToMins(chapter.chapterRuntime);
                return [chapter];
            });

            let curLesson = 1;
            let watchedLessons = 0;


            data['lessonCount']     = lessonCount - 1;

            data.chapters.map(chapter => {

                chapter.lessons = chapter.lessons.map(lesson => {


                    lesson['progressLength'] = lesson['runtime_seconds'] * 100 / totalRuntime;
                    lesson['progressPos'] = (curLesson < data['lessonCount']/2) ? 'right' : 'left';

                    curLesson++;
                    if (lesson.isWatched) {
                        watchedLessons++;
                    }
                    return lesson;

                });

                return chapter;

            });

            //if lesson page will add VTT text
            if(this.urlParts.lessonTitle) {

                var currentLesson   = this.getLesson(null,this.urlParts.contentCacheId);
                data.isLesson       = true;
                data.lessonTitle    = currentLesson.title;
                data.vttFile        = currentLesson.vtt;
            }

            data['totalRuntimeSeconds']    = data['totalRuntime']; // looks like unused variable
            data['totalRuntime']           = page.formatSecondsToHrs(data['totalRuntime']);

            if(lessons.length === 0) {
                return {'course': data}
            }

            data['isScorm'] = lessons[0].lesson_type.toLowerCase() === "scorm";//temporary, because no "course level course type"

            if(data['isScorm']) {
                data.is_sidebar     = false;
            }

            data['totalProgress']       = (watchedLessons==0)?0:(~~(100*watchedLessons/data['lessonCount']) ||1);
            data['totalProgressRound5'] = Math.ceil(data['totalProgress'] / 5) * 5; // for progres circle
            data['slug']                = this.rewriteTitletoUrl(data['title']);

            return {'course': data};
        };

        this.handleCategoriesData   = function (data) {

            var urlParts            = page.appLocation.urlParts;

            $.each(data.sections, function (i, item) {
                if (item && urlParts.categories && item.class.toLowerCase() == urlParts.categories[0]) {
                    topCategoryCode = item.id;
                }
            });
        };

        this.defineCanonical        = function (data) {

            var canonical           = data.canonical ? data.canonical : null;

            if(this.urlParts.lessonTitle) {
                var currentLesson   = this.getLesson(null,this.urlParts.contentCacheId);

                canonical           = currentLesson.canonical;
            }
            if(canonical) {
                canonical = hostName + canonical;
            }

            return canonical;
        };

        this.generateLessonUrl       = function (lesson) {

            var newUrlParts                 = {
                contentCacheId: lesson['ceid'],
                lessonTitle:    this.rewriteTitletoUrl(lesson.title)
            };
            return      this.appLocation.buildURL(newUrlParts);
        };


        this.onLessonShow           = function (node, event) {


            event.preventDefault();

            let lessonID            = $(node).attr('data-lessonID');

            if(typeof lessonID === 'undefined') {

                console.error('LessonID undefined for node: ' + $(node).prop('tagName'));
                return false;
            }

            // find lesson
            let lesson              = this.getLesson(lessonID);

            this.updateBreadCrumbs(lesson);

            if(lesson === null) {

                console.error('LessonID: "' + lessonID + '" is not found');
                return false;
            }

            this.changeLessonPageAttribute(lesson);

            // check access for this lesson
            if(lesson.isAccess === false) {

                currentLessonId = null;

                if("kcpack" in this.getMainData()){
                    this.showGetAccess();
                    return false;
                }

                if(this.user.isAuth()){
                    this.showAlert(this.getMessageByCode(this.LESSON_NO_ACCESS_LOGGED_IN, true));
                    return false
                }

                if ($(node).data('invitation')) {
                    this.showInvitation(this.getMessageByCode(this.LESSON_NO_ACCESS));
                    return false;
                }

                this.showAlert(this.getMessageByCode(this.LESSON_NO_ACCESS), true);
                return false;
            }

            currentLessonId = lessonID;

            if(lesson.isSequence === true ) {
                this.showAlert(this.getMessageByCode(this.NO_SEQUENCE_ACCESS), true);
                return false;
            }
            let view = $(node).data('view') || false;

            if (view && view === 'playing') {

                let embedPlayer = $('#embed-player'),
                    defaultPlayer    = $('#courseVideoWrapper'),
                    playingControls = $('#playing-controls'),
                    defaultControls = $('#course-controls'),
                    playingLessons = $('#lessons-tab'),
                    defaultLessons = $('#course-lessons'),
                    defaultDescription = $('#course-description'),
                    defaultProps = $('#course-props'),
                    playingAbout   =   $('#playing-about');

                //$('#default-view').hide();
                $('#playing-view').show();

                PlayerWidth = this.getMaxPlayerWidth(lessonAspectRatio);
                //if(windowWidth<770){PlayerWidth = (windowWidth/1.3);}
                //console.log("PlayerWidth",PlayerWidth);
                embedPlayer
                    .css({"width":PlayerWidth,"max-width":PlayerWidth})
                    .append(defaultPlayer);

                playingControls.append(defaultControls);
                playingLessons.append(defaultLessons);
                playingAbout
                    .append(defaultProps)
                    .append(defaultDescription);
            }

            const that              = this;
            try{console.log("resetting Player");player.dispose()}catch(e){console.log("...first play")} //allow player to clean up if already playing

            player = new Player(this)
            let params = {
                    aspectratio:                "4:3",
                    autostart:                  true,
                    captiontype:                'alternative',
                    fastForwardDisabled:        false,
                    transcriptalt:              true,
                    disableCaptions:            false,
                    displaycaptionbydefault:    'none',
                    placevideo:                 'course',
                    errorMsg:                   'Fast Forward is not available',
                    playbackRates:               [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
                },
                extra = {
                    captions: this.getLanguages(),
                    _extend: 'captions',
                    token: this.user.getSessionId()
                },
                lessonFastComplete            = false;

            let actions = {

                loadeddata: function(){
                    //maybe update aspect ratio
                    var ar = player.localData["aspectRatio"];
                    var asp = (typeof ar === "string")?ar.split(':'):["16","9"];
                    if( (lessonAspectRatio - (asp[0]/asp[1]) ) > .001 ){ // it's different
                        lessonAspectRatio = asp[0]/asp[1];
                        //console.log("updating aspectRatio", player.localData.aspectRatio, )
                        $(window).trigger('resize',{forced:1});
                    }

                    if(typeof accountSettings != 'undefined' && accountSettings.lessonFastComplete){
                        console.log("Lesson Fast Complete is enabled.");
                        lessonFastComplete = true;
                        that.markLessonAsDone(player.lessonGUID);
                    }

                   that.saveLessonStats(that.defineCourseCode(),  player.getLesson(), false, lessonFastComplete);
                   player.updateNextPrev(that.getPrevLesson(that.getLesson( player.getLesson())), that.getNextLesson(that.getLesson(player.getLesson())));

                },
                playing: function() {

                    $('[id ^= "watching-"]').addClass('hidden');
                    $('#watching-' + player.getLesson()).removeClass('hidden');
                    $('[id ^= "notwatching-"]').removeClass('hidden');
                    $('#notwatching-' + player.getLesson()).addClass('hidden');

                    $('li').removeClass('playnow');
                    $('[data-progress-id="' + player.getLesson() + '"]').addClass('playnow');

                    $('[id ^= "title-watch-"]').removeClass('course-lessons-title-active');
                    $('#title-watch-' + player.getLesson()).addClass('course-lessons-title-active');

                    if(player.getLessonType() === 'html'){
                        player.hideNextPrev();
                    }

                },
                ended: function() {

                    $('#watching-' + player.getLesson()).addClass('hidden');
                    $('#notwatching-' + player.getLesson()).removeClass('hidden');

                    that.saveLessonStats(that.defineCourseCode(), player.getLesson(), true, lessonFastComplete).done(function () {

                        progresses[player.getLesson()].promEnd.done(function () {

                            if(typeof accountSettings != 'undefined' && accountSettings.lessonsAutoplay && player.getLessonType()=='video' ){
                                that.showNextLesson(player, params, extra)
                            }
                        });
                    });

                    if(player.getLessonType() === 'html'){
                        player.updateNextPrev(that.getPrevLesson(that.getLesson( player.getLesson())), that.getNextLesson(that.getLesson(player.getLesson())));
                    }

                },
                next: function (player) {

                    that.showNextLesson(player, params, extra);

                },
                prev: function (player) {

                    var lesson      = that.getPrevLesson(that.getLesson(player.getLesson()));

                    that.updateBreadCrumbs(lesson);

                    if(lesson === null) {
                        return;
                    }

                    $.when(player.show(that.defineCourseCode(), lesson, 'courseVideoEmbed', params, extra)).then(

                        player.updateNextPrev(that.getPrevLesson(lesson.id), that.getNextLesson(lesson.id))

                    );

                    that.changeLessonPageAttribute(lesson);
                },
                error: function (error) {

                    if(error['error'] === 'TRAINING_LIMIT') {
                        that.showAlert( that.getMessageByCode(that.TRAINING_LIMIT), true).done(function (modalWindow) {
                            modalWindow.bindOnClose(function () {
                                location.reload(true);
                            });
                        });
                    }
                },
                event: function(eventInfo){
                    if(eventInfo.name == "courseProgressReset"){
                        that.showAlert( that.getMessageByCode(that.LIMIT_REACHED), true).done(function (modalWindow) {
                            modalWindow.bindOnClose(function () {
                                location.reload(true);
                            });
                        });
                    }

                    //this event occurs when a remote lesson updates api directly, so we need to refresh status
                    if(eventInfo.name == "lessonStatusChanged") {
                        //refresh lesson status from api
                        that.getLessonStatusInApi(player.getLesson()).done(status => {
                            var lesson = that.getLesson( player.getLesson());
                            if(status && status.isCompleted && lesson && lesson.isWatched==false) {
                                //handle lesson is watched in api but not showing watched here (green check).

                                //same code as ended above
                                $('#watching-' + player.getLesson()).addClass('hidden');
                                $('#notwatching-' + player.getLesson()).removeClass('hidden');

                                that.saveLessonStats(that.defineCourseCode(), player.getLesson(), true).done(function () {

                                    progresses[player.getLesson()].promEnd.done(function () {

                                        if(typeof accountSettings != 'undefined' && accountSettings.lessonsAutoplay && player.getLessonType()=='video' ){
                                            that.showNextLesson(player, params, extra)
                                        }
                                    });
                                });

                                if(player.getLessonType() === 'html'){
                                    player.updateNextPrev(that.getPrevLesson(that.getLesson( player.getLesson())), that.getNextLesson(that.getLesson(player.getLesson())));
                                }
                            }
                        });

                    }
                }
            };

            if( typeof accountSettings == 'undefined' && typeof this.user.getAccountId() != 'undefined'){

                this.getAccountConfig(this.user.getAccountId(), this.user).done(function (response) {

                    accountSettings =  response;
                    that.changeParams(params, lesson.isWatched);

                    player.setPlayerHandlers(actions);
                    player.show(that.defineCourseCode(), that.getLesson(lessonID), 'courseVideoEmbed', params, extra);

                }).fail(function (status) {

                    if( status == 498 ){
                         that.user.logout();
                    }

                    that.showAlert( that.getMessageByCode(that.ERROR_SAVE_PROGRESS), true).done(function (modalWindow) {
                        modalWindow.bindOnClose(function () {
                            location.reload(true);
                        });
                    });

                });

            } else {

                that.changeParams(params, lesson.isWatched);

                player.setPlayerHandlers(actions);

                params.lang = this.getLessonContentLanguage();
                player.show(that.defineCourseCode(), that.getLesson(lessonID), 'courseVideoEmbed', params, extra);

            }

            //onLessonShow

            return true;
        };

        this.getLessonContentLanguage       = function(){
            if(!localStorage.getItem('lessonContentLanguage')) localStorage.setItem('lessonContentLanguage', this.getLanguage())
            return localStorage.getItem('lessonContentLanguage')
        };

        this.getMaxPlayerWidth              = function(aspectRatio, maxWidth){
            //we allow 40 px on each side for next/prev, 80 for header and 100 for subtitles/player controls

            maxWidth         = (typeof maxWidth    === "undefined")? 1920  : maxWidth;
            aspectRatio      = (typeof aspectRatio === "undefined")? (4/3) : aspectRatio;
            var leftRightPad = 40 * 2;
            var headerPad    = 80;
            var controlsPad  = 40; //space for subtitles and controlbar
            var docMaxWidth  = $(window).width() - leftRightPad;

            // based on template, size might be smaller
            if($('.inner-page__content').length)
                docMaxWidth=$('.inner-page__content').width() - leftRightPad; //eg troy, rb
            else if ($('.inner-page .course-page').length)
                docMaxWidth=$('.inner-page.course-page').width() - leftRightPad; //ussite

            // the minimum where full vid + coontrols will be visible, while width fits window or maxWidth
            var playerWidth = Math.min(maxWidth, docMaxWidth, (($(window).height() - (controlsPad + headerPad)) * aspectRatio) - leftRightPad);

            //console.log("PlayerWidth", playerWidth);
            return playerWidth;
        };

        this.changeLessonPageAttribute   = function (lesson) {



            if(!lesson) {
                return false;
            }

            if(typeof kcpack === 'object' ) {
                return true;
            }

            window.history.pushState({}, '', lesson.link);

            $('head').find('link[rel=canonical]').attr('href', hostName + lesson.canonical);

            $('body').find('h1').html(lesson.title);


            //Expand sidebar chapter when playing
            //get uncle element
            var currentMenuElement = $('[data-lessonid="'+lesson.lesson_id+'"]');
            var parentOfThis = $(currentMenuElement[0]).parent();
            var uncleOfThis = $(parentOfThis).prev('div.course-lesson_titlecontainer');
            //force uncle click
            if (uncleOfThis.hasClass("open")==false) {
              $(uncleOfThis).click();
            }
            //get other uncles except ours
           $('div.course-lesson_titlecontainer').not(uncleOfThis).each(function(){
             if ($(this).hasClass("open")==true) {
               $(this).click();
             }
          });


          //scroll to top when video starts playing
          var scroll = $(window).scrollTop();
          if (scroll > 100) {
            $('html, body').animate({
                    scrollTop: $("#content").offset().top-100
                }, 750);
          }


        }

        this.showNextLesson             = function (player, params, extra) {
            var lesson      =   this.getNextLesson(this.getLesson(player.getLesson()));

            this.updateBreadCrumbs(lesson);

            this.changeLessonPageAttribute(lesson);

            if(lesson === null) {
                return;
            }

            $.when(player.showNextVideo(this.defineCourseCode(), lesson, 'courseVideoEmbed', params, extra)).then(
                    player.updateNextPrev(this.getPrevLesson(lesson.id), this.getNextLesson(lesson.id))
            );

        };

        this.setHandlers            = function () {

            $('#progress-bar')
                .on('mouseenter', 'li', function(){

                    $('.progress-tip-wrapper').hide();
                    var id = $(this).data('progress-id');

                    $("#progress-tips [data-pointer-id='" + id + "']").find('div.progress-tip-wrapper').attr('style','display:block');


                })
                .on('focus', '.progress-tip__note textarea', function(){

                    $('.progress-tip-wrapper').hide();
                    var id = $(this).data('progress-id');

                    $("#progress-tips [data-pointer-id='" + id + "']").find('div.progress-tip-wrapper').attr('style','display:block');

                });

                if( to_watch == true ) {
                    $('div[rel="next"]').addClass('hidden');
                }

            $(document)
                .on('click', function(e) {

                    if ($(e.target).closest('.progress-tip-wrapper').length) return;

                    $('.progress-tip-wrapper').hide();
                    e.stopPropagation();

                })
                .on('mouseleave', '.course-progress', function(){

                    if (!$(".progress-tip__note textarea").is(":focus")) {

                        $('.progress-tip-wrapper').hide();

                    }

                });


            $(window)
                .on('resize scroll', e => {
                    //this is needed so html lessons don't have mini player. it's ugly, but so is the code the writes the style in the first place
                    if(player && player.getLessonType() === 'html'){
                        $(".dark-wrapper").addClass('floating-player-off')
                        $('#courseVideoEmbed').attr('style', '');
                        $('#courseVideoWrapper').attr('style', '');
                    }else{
                        $(".dark-wrapper").removeClass('floating-player-off')
                    }


                    if ($('div').hasClass('floating-player-off') || $('#qcontent').hasClass('smsquiz') || ("kcpack" in this.getMainData()) ) {
                        return;
                    }

                    this.fixMiniPlayer();
                });

            $(window)
                .on('resize', e => {

                    //if (!(!$('div').hasClass('floating-player-off')) ) {
                        var w =this.getMaxPlayerWidth(lessonAspectRatio);
                        if(PlayerWidth!=w){
                            PlayerWidth = w;
                            $('#embed-player').css({"width":w,"max-width":w});
                        }

                        if ( $(window).width() <= 1240 ) {
                          //debugger;
                          $(".course-container").height($(".course-container-sticky").height())
                        }

                    //}
                });


            $(document).on('click', '#showDescriptionOnMobile', function () {
                $(this).hide();
                $(".course-info__description").show();
            });
            $('.lessons-menu__lessons.drop_m_sub').attr('style','display: none;');



            return null;
        };


        this.fixMiniPlayer = function (e) {

            if ($('div').hasClass('playing-view__panel') == true) {
                var offset = $('.playing-view__panel').offset();

                if (offset.top >= 100) {
                    if ($(document).scrollTop() > offset.top) {

                        var y_v_position = ($(document).scrollTop() + $(window).height()) - ($(document).height() - $('#footer').height());

                        if (y_v_position > -10) {
                            $('#courseVideoWrapper').attr('style', 'position:fixed; right:20px;bottom:' + (y_v_position + 30) + 'px; height: auto; min-height: 104px; width: 247.5px; z-index: 100; display: block !important;margin:0px;');
                        } else {
                            $('#courseVideoWrapper').attr('style', 'position:fixed; right:20px;bottom:20px; height: auto; min-height: 104px; width: 247.5px; z-index: 100; display: block !important;margin:0px;');
                        }

                        $('.course-video__arrow').hide();
                        $('#altcaption').addClass('altcaption-xs');
                        if ($('#altcaption').css('display') === 'none') {
                            $('#courseVideoEmbed').attr('style', '');
                        } else {
                            var bg_h = $('#altcaption').height() + 20;
                            $('#courseVideoEmbed').attr('style', 'margin-bottom:' + bg_h + 'px;');
                        }

                        // ================================================ create up arrov
                        if (!$('div').hasClass('course-video-up')) {
                            $("<div class='scroll-up--ctrl course-video-up'><i class='fa fa-chevron-circle-up' aria-hidden='true'></i></div>").css({height: $('#courseVideoEmbed').height()+'px'}).appendTo($("#courseVideoWrapper").css("position", "relative"));
                        }
                    } else {
                        //go back to not little window
                        $('#altcaption').removeClass('altcaption-xs');
                        $('#courseVideoWrapper').attr('style', '');
                        $('.course-video__arrow').show();
                        if ($('#altcaption').css('display') !== 'none') {
                            var bg_h = 50;
                            if ($('#altcaption').height() > 0) {
                                bg_h += $('#altcaption').height();
                            }
                            $('#courseVideoEmbed').attr('style', 'margin-bottom:' + bg_h + 'px;');
                        } else {
                            $('#courseVideoEmbed').attr('style', 'margin-bottom:50px;');
                        }

                        if ($('div').hasClass('course-video-up')) {
                            $('.course-video-up').remove();
                        }

                    }
                }
            }

        };

        /**
         *
         * @param {string} lessonID
         * @param {number} lessonCEID
         * @return {{}}|null
         */
        this.getLesson              = function (lessonID, lessonCEID) {


            var result              = null;

            $.each(lessons, function (index, lesson) {

                if(lesson['lesson_id'] === lessonID || lessonCEID == lesson['ceid']) {

                    result          = lesson;
                    result['index'] = index;

                    return false;
                }
            });

            return result;
        };

        this.getKcpackStudentId     = function() {
            var embeddedId = $('#kcpack_student_id').html();
            var scormId = scormApi.isReady && scormApi.LMSGetValue('cmi.core.student_id');
            var tinCanId = tinCanApi.isReady && tinCanApi['actor'] && JSON.stringify(tinCanApi['actor']);

            return embeddedId || scormId || tinCanId;
        };

        /**
         *
         * @param lesson
         * @return {{}|null}
         */
        this.getPrevLesson          = function (lesson) {

            if(lesson === null) {
                return null;
            }

            var index               = lesson['index'];

            index--;

            if(index < 0) {
                return null;
            }

            if(typeof lessons[index] === 'object' && lessons[index].isAccess === true) {
                var result          = lessons[index];
                result['index']     = index;

                return result;
            }

            return null;
        };

        this.getNextLesson          = function (lesson) {


            if(lesson === null) {
                return null;
            }

            var index               = lesson['index'];


            index++;


            if(index < 0) {
                return null;
            }

            if(typeof lessons[index] === 'object' && lessons[index].isAccess === true) {


                var result          = lessons[index];
                result['index']     = index;

                return result;
            }

            return null;
        };

        /**
         *
         * @param lessonID
         */
        this.markLessonAsDone       = function (lessonID) {
            var lesson              = this.getLesson(lessonID);

            if(lesson === null) {
                return;
            }
            //send any events if course status changed
            var course = this.getContentData()['course'];
            if(course.totalProgress == 0){
                courseState = courseStates.inProgress;
                this.sendCourseEvent("courseStarted", null, accountSettings);
            }

            this.sendCourseEvent("lessonCompleted",{lessonId: lesson.lesson_id, lessonTitle: lesson.title}, accountSettings);

            if(!lesson.isWatched){
                lesson.isWatched  = true;
                //update total progress
                var watched=0;
                for (var c in course.chapters) for (var l in course.chapters[c].lessons)
                    watched += course.chapters[c].lessons[l].isWatched?1:0;
                course.totalProgress = ~~(100 * watched / course.lessonCount) || 1;

                //if complete, update and announce
                if(course.totalProgress == 100){
                    courseState = courseStates.allLessonsCompleted;
                    this.sendCourseEvent("allLessonsCompleted", null, accountSettings)
                }

            }
            if(typeof accountSettings != 'undefined' && typeof accountSettings['isLessonsInSequence'] != 'undefined' ) {
                if( accountSettings['isLessonsInSequence'] != false ) {
                    this.changeNextLessonSequence();
                }
            }

            $('#watched-' + lessonID).removeClass('hidden');
            $('#access-' + lessonID).addClass('hidden');

            $('[data-progress-id="' + lessonID + '"]').addClass('watched');

            this.updateProgressBar(course.totalProgress);

        };

        this.updateProgressBar = (percent) => {
            for(var c="",l="_",i=0;i<100;i++)c+="#",l+="_";
            $('#course-percent').html(percent+'%');
            $('#course-round').removeAttr('class').addClass('course-progress__round').addClass('progress-'+(Math.ceil(percent / 5) * 5));
            console.log("progress:["+((percent==100)?c:((c.substr(100-percent)+l.substr(percent+1))))+']');
        };

        this.saveLessonStats        = function (courseID, lessonID, isComplete, fastComplete) {

            const that              = this;

            //var courseStats = this.userCourses.coursesStats[courseID];
            if(this.user.isAuth() === false) {
                return $.Deferred().fail();
            }

            // not save data twice
            if(fastComplete && isComplete) {

                progresses[lessonID].promEnd = new $.Deferred().resolve();
                return $.Deferred().resolve();
            }

            if (!isComplete) { //ie "lesson started", no "lesson complete"

                progresses[lessonID] = {
                    progressID: null,
                    prom: new $.Deferred()
                };

                return this.userCourses.saveLessonStats(courseID, lessonID, null).done((progressID) => {

                    progresses[lessonID].progressID = progressID;

                    if (fastComplete) {

                        progresses[lessonID].prom.resolve();

                        return this.userCourses.saveLessonStats(courseID, lessonID, progressID);

                    } else {

                        progresses[lessonID].prom.resolve();

                    }

                    repeatSaveProgress = 0;

                }).fail(function (query, status) {

                    //try to send progress n time and after show error message
                    that.reSendProgress(courseID, lessonID, isComplete, fastComplete, status == 498);
                });

            }

            //progress "start" was not saved
            if( typeof progresses[lessonID] == 'undefined') {
                that.reSendProgress(courseID, lessonID, isComplete, fastComplete);
                return;
            }

            progresses[lessonID].promEnd =  new $.Deferred();


            return progresses[lessonID].prom.done(() => {

                return this.userCourses.saveLessonStats(courseID, lessonID, progresses[lessonID].progressID).done(() => {

                    this.markLessonAsDone(lessonID);

                    repeatSaveProgress = 0;

                    progresses[lessonID].promEnd.resolve();

                }).fail(function (query, status) {

                    //try to send progress n time and after show error message
                    that.reSendProgress(courseID, lessonID, isComplete, fastComplete, status == 498);
                });

            });


        };

        /**
         *
         * @param {int} seconds
         * @return {string}
         */

        this.formatSecondsToMins    = function (seconds) {

            var m = seconds/60 ^ 0,
                s = seconds-m*60;
            s = s < 10 ? '0' + s : s;

            return m + ':' + s;
        };

        /**
         *
         * @param {int} seconds
         * @return {string}
         */

        this.formatSecondsToHrs = function(seconds) {
            var h = seconds/3600 ^ 0,
                m = (seconds-h*3600)/60 ^ 0;

            m = m < 10 ? '0' + m : m;
            return h + 'hrs. ' + m + 'min.';
          };





        /**
         * Returns message by code
         *
         * @param   {int|string}    code
         * @return  {string}
         */
        this.getMessageByCode       = function (code) {

            const defaultError      = 'Server error';

            var mui                 = this.getMainData().mui;
            // mui:messages-contactus-success
            var strings             = mui;

            if(     typeof strings['pageContent'] === 'undefined'
                ||  typeof strings['pageContent']['quiz'] === 'undefined') {
                return defaultError;
            }

            strings                 = strings['pageContent']['quiz'];

            switch(code) {

                case this.NOT_AUTH:                         return mui.error['notAuth'];
                case this.ENTER:                            return strings['enter'];
                case this.LIMIT_REACHED:                    return strings['limitReached'];
                case this.IS_PASSED:                        return strings['isPassed'];
                case this.NEED_TO_WATCH_ALL:                return strings['needToWatchAll'];
                case this.LESSON_NO_ACCESS:                 return mui.error['signInMessagePopup'];
                case this.NO_SEQUENCE_ACCESS:               return mui.error['sequenceMessagePopUp'];
                case this.LESSON_NO_ACCESS_LOGGED_IN:       return mui.error['loggedInNoCourseAccess'];
                case this.NO_VIDEO_FORWARDING:              return mui.error['noVideoFastForwardingMessage'];
                case this.ERROR_SAVE_PROGRESS:              return mui.error['errorSaveLessonProgress'];
                case this.TRAINING_LIMIT:                   return mui.error['trainingLimit'];

                default:                                    return defaultError;
            }
        };

        this.onLoadQuiz             = (node, event) => {

            event.preventDefault();

           this.setVideoOnPause();

            // check if user is auth
            if(!this.user.isAuth()) {
                if("kcpack" in this.getMainData()){
                    this.showGetAccess();
                    return;
                }

                if ($(node).data('invitation')) {
                    this.showInvitation(this.getMessageByCode(this.NOT_AUTH));
                    return;
                }

                this.showAlert(this.getMessageByCode(this.NOT_AUTH), true);
                return;
            }

            // check if All lessons is watched
            const courseData          = this.getContentData().course;
            const isWatched = courseData.chapters.every((chapter) => {

                return chapter.lessons.every((lesson) => lesson.isWatched);

            });

            if(!isWatched) {
                this.showAlert(this.getMessageByCode(this.NEED_TO_WATCH_ALL), true);
                return;
            }

            if (courseData.quiz && courseData.quiz.success && courseData.quiz.success.is_passed) {
                this.showAlert(this.getMessageByCode(this.IS_PASSED), true);
                return;
            }

            if (!courseData.is_access) {
                this.showAlert(this.getMainData().mui.mylearning.content.quiz.courseAccessDeny);
                return;
            }

            if (courseData.quiz && !courseData.quiz.isAllowed) {
                this.showDanger(this.getMessageByCode(this.LIMIT_REACHED), function(){
                    let promise         = $.Deferred();
                    page.onResetProgress(courseData.course_id);
                    promise.resolve();
                    return promise;
                });
                return;
            }

            let muiQuiz             = this.getMainData().mui.pageContent.quiz;
            var failAttempt         = courseData.quiz.maxCount || 5;
                failAttempt         = courseData.quiz.maxCount == 0 ? muiQuiz.unlimited : failAttempt;
            var muiMsg              = this.getMainData().mui.mylearning.content.quiz.startMessage;
            if(courseData.quiz.maxCount == 0) {
                muiMsg              = this.getMainData().mui.mylearning.content.quiz.startUnlimited;
            }
            var msg                 = muiMsg.replace(/\{\{fileAttempt\}\}/g, failAttempt);

            this.showConfirm(msg, function(){
                let promise         = $.Deferred();

                $(node).blur();

                var quiz            = new Quiz(page, page.defineCourseCode());
                quiz.show();
                history.pushState({}, '', window.location + '/quiz');
                promise.resolve();

                return promise;
            }, this.getMainData().mui.buttonLabel.accept);
        };

        this.onSendAbuse            = (node, event) => {

            this.showAbuseModal();

            event.preventDefault();

        };

        //abuse modal scope
        (function(){

            let abuseCategoryInfo       = null;
            let abuseModal              = null;
            let abuseTemplate           = null;
            let categoryPath            = [];

            page.showAbuseModal         = function() {

                page.lockPage();

                categoryPath            = [];

                if(abuseModal){
                    abuseModal = null;
                    // this.getAbuseCategories()
                    //     .then(function (categores) {
                    //         return abuseModal.showAbuseCategoriesList(categores);
                    //     }).done(function () {
                    //         abuseModal.show();

                    //         page.unlockPage();
                    //     });
                    // return;
                }

                $.when(this.loadAbuseModalTemplate(), this.getAbuseCategories())
                    .done((abuseModal, categores) => {

                        abuseModal.showAbuseCategoriesList(categores);

                        page.unlockPage();
                        abuseModal.show().then( function () {
                            abuseModal.onRepositionModal( $( '#abuseModal.cloned' ) );
                        });

                    });

            };

            page.loadAbuseModalTemplate     = function () {

                if(abuseModal){
                    return $.when(abuseModal);
                }

                return this.loadTemplate('ui/courseAbuse').then(function(template){

                    if( $('#abuseModal').length ){
                        $("#abuseModal").each(function () {
                            $(this).remove();

                        });
                    }

                    $('<div>').attr('id', 'abuseModal')
                        .addClass("modalWindow")
                        .addClass("wide")
                        .css( 'display', 'none' )
                        .html(page.templater.render(template, page.getMainData()))
                        .appendTo('body');

                    if(isEmpty(abuseCategoriesTpl)){
                        abuseCategoriesTpl = $('#abuse-categories', template).get(0).innerHTML;
                    }

                    if(isEmpty(abuseFormTpl)){
                        abuseFormTpl        = $('#abuse-form', template).get(0).innerHTML;
                    }

                    abuseModal = new ModalWindow({
                        modalID: '#abuseModal',
                        isConfirming: true
                    });

                    abuseModal.onClose = function(node, event){
                        this.close();
                    };

                    abuseModal.onSelectAbuseCategory  = (node, event) => {

                        let categoryId          = $(node).data('id');
                        categoryPath.push(categoryId);

                        page.getAbuseCategories(categoryId)
                            .done((categories) => {

                                if(categories.length === 0){
                                    abuseModal.showAbuseForm(categoryId);
                                }else{
                                    abuseModal.showAbuseCategoriesList(categories, true);
                                }

                            });

                    };

                    abuseModal.onSend           = function () {

                        let abuseData           = this.defineAbuseData();
                        let data                = {
                            course_id : abuseData.lesson.course_id,
                            lesson_id : abuseData.lesson.lesson_id,
                            lesson_language : abuseData.lesson.lesson_language,
                            report_category : abuseData.category.id,
                            description : abuseData.form.description,
                            token : page.user.getSessionId()
                        };

                        return page.remoteCall(new CallPost('portals/0' + page.getPortalName() + '/abuse/', data))
                            .done((res => {

                                $('#abuse-categories').addClass('is_hidden');
                                $('#abuse-form').addClass('is_hidden');
                                $('#abuse-success').removeClass('is_hidden');

                                $('#abuseModal [data-handler="onSend"]').addClass('is_hidden');

                            }));

                    };

                    abuseModal.onBack               = function(node, event){

                        let backCategory            = null;
                        if(categoryPath.length > 1){
                            backCategory            = categoryPath.slice(-2)[0];
                        }

                        categoryPath.pop();

                        page.getAbuseCategories(backCategory)
                            .done(function (categories) {
                                abuseModal.showAbuseCategoriesList(categories, backCategory);
                            });
                    };

                    abuseModal.showAbuseCategoriesList = (categories, isBack) => {

                        page.renderTo(abuseCategoriesTpl, {categories: categories, isBack: isBack}, '#abuse-categories');
                        page.assignPageHandlers('#abuse-categories', abuseModal);

                        $('#abuse-categories').removeClass('is_hidden');
                        $('#abuse-form').addClass('is_hidden');
                        $('#abuse-success').addClass('is_hidden');

                        $('#abuseModal [data-handler="onSend"]').addClass('is_hidden');

                    };

                    abuseModal.showAbuseForm    = (categoryId) => {

                        let abuseForm           = $('#abuse-form');

                        abuseCategoryInfo       = page.getAbuseCategoryInfo(categoryId);
                        page.renderTo(abuseFormTpl, abuseCategoryInfo, abuseForm );

                        $('#abuse-categories').addClass('is_hidden');
                        $('#abuse-success').addClass('is_hidden');
                        abuseForm.removeClass('is_hidden');

                        $('#abuseModal [data-handler="onSend"]').removeClass('is_hidden');

                    };

                    abuseModal.defineAbuseData        = function () {

                        let formData            = {};

                        // get all form data
                        $('#abuse-form').find('input,textarea,select').each(function () {
                            if($(this).prop('type') === 'radio' && !$(this).prop('checked')){
                                return true;
                            }
                            formData[$(this).prop('name')] = $(this).val();
                        });

                        //get lesson info

                        let lessonInfo = {
                            lesson_id : page.defineCurrentLessonId(),
                            course_id : page.defineCourseCode(),
                            lesson_language : page.getLessonContentLanguage()
                        };

                        return {
                            category: abuseCategoryInfo,
                            lesson: lessonInfo,
                            form: formData
                        }
                    };

                    page.assignPageHandlers($('#abuseModal'), abuseModal);

                    return abuseModal;
                });

            };

        }());

        this.onSendFeedback         = function (element, event) {

            event.preventDefault();

            this.setVideoOnPause();

            var form                = new FeedbackForm(this, this.defineCourseCode(), this.defineCourseName());

            form.show();
        };

        this.onFeedback = function (element, event) {
            event.preventDefault();
            this.setVideoOnPause();
            element.href =  "/" + this.getLanguage() + "/courseFeedback/" + this.defineCourseCode();
        };


        this.onMarkLessonsAsWatched = function (element, event) {

            event.preventDefault();

            const self              = this;

            this.userCourses.markLessonsAsWatched(this.defineCourseCode()).always(function () {

                self.showAlert('All lessons marks as watched').done(function (modalWindow) {
                    modalWindow.bindOnClose(function () {
                        self.invalidateMain();
                        self.reload();
                    });
                });
            });
        };

        this.onAddCourse            = function (element, event) {

            event.preventDefault();

            const that              = this;

            this.userCourses.addCourseToList(this.defineCourseCode()).always(function () {

                that.showAlert(that.getMainData().mui.pageContent.course.AddMessage).done(function (modalWindow) {
                    modalWindow.bindOnClose(function () {
                        that.invalidateMain();
                        that.reload();
                    });
                });
            });
        };

        this.onOpenTab              = function (node, event) {

            event.preventDefault();

            if ($(node).hasClass('active')) return;

            $('#course-tabs').find('.active').removeClass('active');
            $(node).addClass('active');

            $('#tabs-content').children().hide();

            $($(node).attr('href')).show();

        };

        this.changeParams    = function (params, isWatched = false) {

            if( typeof accountSettings != 'undefined' && typeof accountSettings.fastForwardDisabled != 'undefined' ){

                switch (accountSettings.fastForwardDisabled) {

                case 'all':
                    params.fastForwardDisabled  = true;
                    params.transcriptalt        = false;
                    params.isWatched            = isWatched;
                    break;

                case 'assigned':
                    if(assignedCourse !== null && assignedCourse) {
                       params.fastForwardDisabled  = true;
                       params.transcriptalt        = false;
                       params.isWatched            = isWatched;
                    }
                }

            }

            if( typeof accountSettings != 'undefined' && typeof accountSettings.stopVideoInHiddenTab != 'undefined' ){

                params.stopVideoInHiddenTab  = accountSettings.stopVideoInHiddenTab == 1 ? 1 : 0;

            }


            return params;
        };

        this.ctrlRelatedCourses    = function (node) {

            let component = new Related(this, node);

            component.carousel();

        };

        this.setVideoOnPause    = function () {

            $("video").each(function(){
                this.pause();
            });
        };

        this.reSendProgress    = function (courseID, lessonID, isComplete, fastComplete, expiredToken) {

            const that              = this;

            var n                   = 2; //how match time try to resend

            if( repeatSaveProgress < n &&  !expiredToken) {

                setTimeout(function(){
                    that.saveLessonStats(courseID, lessonID, isComplete, fastComplete);
                }, 2000);
                repeatSaveProgress ++;

            } else {

                repeatSaveProgress = 0;

                if (document.exitFullscreen) {

                    document.exitFullscreen();
                }
                else if (document.mozCancelFullScreen) {

                    document.mozCancelFullScreen();
                }
                else if (document.webkitCancelFullScreen) {

                    document.webkitCancelFullScreen();
                }
                else if (document.msExitFullscreen) {

                    document.msExitFullscreen();
                }


                if( expiredToken ){
                    this.user.logout(); //logout if token expered for clear localUserData
                }

                this.setVideoOnPause();

                this.showAlert( this.getMessageByCode(this.ERROR_SAVE_PROGRESS), true).done(function (modalWindow) {
                    modalWindow.bindOnClose(function () {
                        location.reload(true);
                    });
                });
            }
        };

        this.updateBreadCrumbs    = function (lesson) {

            if(!lesson) {
                return false;
            }
            breadCrumbs = breadCrumbs.filter((item) =>
                  item.type != 'lesson'
            );

            breadCrumbs.push({
                 type:       'lesson',
                 caption:    lesson.title,
                 url:        ''
            });


            breadCrumbs.forEach(function(item, i, breadCrumbs) {
                item['last']        = item['type'] == 'lesson';
                item['delimeter']   = breadCrumbs.length != i + 1 ? ' > ' : null;
            });

            this.ctrlBreadCrumbs($('#breadcrumbs'), {breadCrumbs:breadCrumbs});
        };

        this.getCoursesForSelected      = function () {

            let def                     = $.Deferred();


            if(!this.config.isRequestAccess){
                return def.resolve([]);
            }

            let params                  = {
                'token':                this.user.getSessionId(),
                'lang':                 this.getLanguage()
            };


            this.remoteCall(new CallGet('portals/course_lists/for_selection/', params,
                function(res) {

                    def.resolve(res.response);

                }).asCached().asLocalCached()
                .defineErrorHandler(() => {
                    console.log('404 redirect in courses.getCoursesForSelected');
                    this.redirect('page404');
                }));

            return def;

        };

        this.getCourseInfo = function (courseID, lang){
            if(!lang) var lang            = this.getLanguage();
            var prom            = $.Deferred();
            if(!lang) {
                prom.resolve({});
            }
            let params = {};

            this.remoteCall(new CallGet(
                'courses/0' + courseID + '/langs/0' + lang + '/',
                params,
                (data) => {
                    prom.resolve(data.response);
                }
            ).defineErrorHandler((query, status) => {
                    prom.reject();
                    console.error('Error occured: status = ' + status + 'for query: ' + query.toString());
            }));


            return prom;
        };

        this.getCoursesEBooks      = function (courseID, lang, options) {

            var prom            = $.Deferred();

            if(options && options.isShoweBooks === false) {
                return prom.resolve({});
            }

            var params          = {
                _extend:'eBooks'
            };

            var ebooksString = "";

            this.remoteCall(new CallGet(
                'courses/0' + courseID + '/langs/0' + lang + '/',
                params,
                (data) => {

                    if(data.response && data.response.eBooks) {
                        eBooks  = data.response.eBooks[lang];
                    }
                    $.each(eBooks, function (i, item) {
                        item.previewURL     =   page.config.CDNPortal + 'opencontent/courses/ebook/previews/' +
                                                courseID + '/' + lang + '/' + item.preview;
                        item.fileURL        =   page.config.CDNPortal + 'opencontent/courses/ebook/files/' +
                                                courseID + '/' + lang + '/' + item.file;
                    });

                    prom.resolve(eBooks);
                }
            ).defineErrorHandler((query, status) => {
                    prom.reject();
                    console.error('Error occured: status = ' + status + 'for query: ' + query.toString());
            }));

            return prom;
        };

        this.onGetEbook             = function (n, e) {

            e.preventDefault();
            var eBookCEID             = $(n).attr('data-ceid');
            var eBook;
            $.each(eBooks, function (i,item) {
                if (item['ceid'] == eBookCEID) {
                    eBook       = item;
                    return true;
                }
            });

            let redirect_page = 'landingEbook';
            if(this.user.isAuth()) {
                redirect_page = 'promoEbook';
            }
            if(typeof eBook != 'undefined') {
                var name = eBook.name.toLowerCase().replace(/\ /g, '-');
                window.history.pushState({}, '', '/' + this.getLanguage() + '/' + redirect_page + '/course/' + this.defineCourseCode() + '/' + eBookCEID + '/' + name);
                this.onChangeLocation();
            }
        };

        this.downLoadPDF = function (file) {

            var lang                = this.getLanguage(),
                courseID            = this.defineCourseCode(),
                link                = document.createElement('a');
                link.download       = file;
                link.href           = page.config.CDNPortal + 'opencontent/courses/ebook/files/' +
                                      courseID + '/' + lang + '/' + file;
                link.dispatchEvent(new MouseEvent('click'));
        };

        this.renderEventList        = function (eventId) {

            if(!isObject(events)) {
                return;
            }

            let $events             = $('#event-selector');

            let mui             = this.getMui();

            if(isNotEmpty(mui['pageContent']) && mui['pageContent']['event']) {
                mui             = mui['pageContent']['event'];
            }

            // clean up
            $events.html(' ');

            for(let id in events) {

                if(!events.hasOwnProperty(id)) {
                    continue;
                }

                // assign first event id
                if(isEmpty(eventId)) {
                    eventId         = id;
                }

                let $option         = $('<option value="'
                                    + id
                                    //+ '" class="event-status-' + events[id]['event_status']
                                    + '">');

                let name            = events[id]['list_name'];

                if(events[id]['event_status'] === 'review') {
                    name           += ' - ' + mui['review'];
                } else if (events[id]['event_status'] === 'approved') {
                    name           += ' - ' + mui['approved'];
                } else if (events[id]['event_status'] === 'rejected') {
                    name           += ' - ' + mui['rejected'];
                }

                $option.text(name);

                $events.append($option);
            }

            if(isEmpty(eventId)) {
                return;
            }

            $events.val(eventId);
            let status              = events[eventId]['event_status'];

            // If reg is not possible?
            if(isEmpty(events[eventId]['is_register'])) {
                status              = 'disable';
            }

            // change button for status
            this.changeEventStatus(status, $('#event_action_btn'), $('#eventStatus'));
            let msg                 = this.changeEventMsg(events[eventId], $('#eventMessage'));

            if(isEmpty(msg)) {
                $('#event_action_btn').css('padding-top', "15px");
            } else {
                $('#event_action_btn').css('padding-top', 0);
            }
        };

        const that                  = this;

        this.outContentPromise.done(function () {
          //close all elements from sidebar
          var elements = document.getElementsByClassName(".course-lessons__list");
          for (var i = 0, len = elements.length; i < len; i++) {
                  elements.removeClass("open");
                  elements.find("span").hide();
                  elements.find("i").removeClass("closed").addClass("open");
          }


          //tabs for sidebar
           that.renderEventList();
           $('ul.tabs li').click(function(){
            var tab_id = $(this).attr('data-tab');

            $('ul.tabs li').removeClass('current');
            $('.tab-content').removeClass('current');

            $(this).addClass('current');
            $("#"+tab_id).addClass('current');
          })

          //prev and next buttons hovered
          $('#courseVideoWrapper').hover(
            function() {
              $( '.course-video__arrow--prev' ).fadeTo(1);
              $( '.course-video__arrow--next' ).fadeTo(1);

            }, function() {
              $( '.course-video__arrow--prev' ).fadeTo(0);
              $( '.course-video__arrow--next' ).fadeTo(0);
            }
          );

          //collapse for menu

          $(".course-lesson_titlecontainer").click(function(arg) {

              var currentHeight = 0; //i dont think this us useful

              var chapter = $(this);

              if (chapter.hasClass("open") == false) {

                chapter.find("i").removeClass("closed").addClass("open");
                chapter.find("span").hide();

                var target = $(this).next('div.course-lessons__list');

                target.slideDown("fast", function(){
                  chapter.addClass("open");
                  currentHeight = $("#course-lessons").height() + target.height();
                  that.courseScroll.updateSizes();
                });


                //return true;
              }

              else if (chapter.hasClass("open") == true) {
              //COLLAPSE COLLAPSE

                chapter.find("i").removeClass("open").addClass("closed");
                chapter.find("span").show();
                var target = $(this).next('div.course-lessons__list');
                target.slideUp("fast", function(){
                chapter.removeClass("open");
                currentHeight = $("#course-lessons").height();

                var theSidebar = $("#course-lessons")
                /* Calculate Viewport Height minus 160 px from headers */
                var vpHeight =  $(window).height() - 160;

                if (theSidebar.hasClass("smallSideBar")  || theSidebar.hasClass("fixed-bottom")    ) {

                    if ((theSidebar.height() < vpHeight) && theSidebar.hasClass("smallSidebarSticky") == false ) {

                      theSidebar.animate({position:"sticky",top:"160px"},300,
                      function(){
                        theSidebar.addClass("sticky-top160");
                        theSidebar.css("margin-top","auto");
                        theSidebar.removeClass("fixed-bottom");
                        theSidebar.addClass("smallSidebarSticky");
                        theSidebar.css("bottom","auto");
                        that.courseScroll.updateSizes();
                      });
                    }

                  }

                });

                //return true;
              }

              that.courseScroll.updateSizes();
              });

          // this will close "download app banner and add that missing height wich is not calculated elsewhere"
          $(document).on('click', '.sb-button', function(e){
            $('#content').css("margin-top","73px");
          })

          $(document).on('click', '.sb-close', function(e){
            $('#content').css("margin-top","73px");
          })


          $(window).scroll(function (event) {

            if (that.getPortalName() == "www" && $("body").hasClass("kcpack") == false) {
              if (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) ) {
                if ($(window).width() > 768) {

                  var vpHeight = $(window).height()
                  var position = window.localStorage.getItem("position");
            			if (!position) {
            				var position = $(window).scrollTop(position);
            			}

            			var currentScroll = $(window).scrollTop();
            			var theSidebar = $("#course-lessons");
            			var vpHeight =  $(window).height() - 160;
            			var theVideo = $(".course-container-sticky");
            			var portalName = page.getPortalName();
            			var topVar = "160px";

                  that.courseScroll.scrollEvents(vpHeight, position, currentScroll, theSidebar, theVideo, topVar);

                }
              }
            }

          });

        }); //outContentPromise


/*


        this.scrollEvents = function () {

          updateSizes(true);
          var position = window.localStorage.getItem("position");
          if (!position) {
            var position = $(window).scrollTop(position);
          }

          var currentScroll = $(window).scrollTop();
          var theSidebar = $("#course-lessons");
          var vpHeight =  $(window).height() - 160;
          var theVideo = $(".course-container-sticky");
          var portalName = page.getPortalName();
          var topVar = "160px";

          if (portalName != "www") {
            topVar = "99px"
            vpHeight =  $(window).height() - 99;
          }


          if (currentScroll < 10) {
            updateSizes();

          }

          if ($(".course-page_playlist").height() < vpHeight) {

              theSidebar.css("position","sticky");
              theSidebar.addClass("sticky-top160");
              theSidebar.css("top",topVar);
              theSidebar.css("bottom","auto");
              theSidebar.css("margin-top","0");

              if (currentScroll > 1)
                theSidebar.addClass("smallSideBar");

          }

          // SCROLL GOES DOWN
          else if(currentScroll > position ) {

            theSidebar.removeClass("smallSideBar");
            theSidebar.removeClass("smallSidebarSticky");

            if (currentScroll > 1) {


              if ( theSidebar.hasClass("sticky-top160") || theSidebar.hasClass("upFromFooter")) {

                theSidebar.removeClass("sticky-top160");
                theSidebar.removeClass("upFromFooter");
                theSidebar.css("top","auto");
                theSidebar.css("position","relative");
                theSidebar.css("margin-top",currentScroll);
              }

              if ( isOnScreen("#cpsbBottom") ) {

                theSidebar.css("width",$(".course-sidebar").width()+"px");
                theSidebar.addClass("fixed-bottom");
                theSidebar.css("position","fixed");
                theSidebar.css("bottom","20px");
              }

              if ( isOnScreen(".footer") ) {

                if (theSidebar.hasClass("fixed-bottom")) {

                  theSidebar.removeClass("fixed-bottom");
                  theSidebar.addClass("absolute-bottom");
                  theSidebar.parent().css("position","relative");
                  theSidebar.css("position","absolute");
                  theSidebar.css("bottom","0px");
                  theSidebar.css("margin-top","auto");
                }

                if (theVideo.hasClass("fixed-bottom")) {

                  theVideo.removeClass("fixed-bottom");
                  theVideo.css("position","absolute");
                  theVideo.css("bottom","0px");
                  theVideo.css("margin-top","0");
                  theVideo.addClass("absolute-bottom");
                }

              }

              if ( theSidebar.hasClass("upFromFooter") ) {

                theSidebar.css("position","relative");
                theSidebar.css("margin-top", currentScroll);
                theSidebar.removeClass("upFromFooter");
              }


              if (isOnScreen("#vcBottom") && theVideo.hasClass("absolute-bottom") == false ) {

                theVideo.css("width",$(".course-container").width()+"px");
                theVideo.addClass("fixed-bottom");
                theVideo.removeClass("upFromFixBtm");
                theVideo.css("position","fixed");
                theVideo.css("bottom","20px");
              }

              if (theVideo.hasClass("sticky-top160")) {

                theVideo.removeClass("sticky-top160");
                theVideo.css("top","auto");
                theVideo.css("position","relative");
                theVideo.css("margin-top",currentScroll);

              }

            }
          } //scrollDown

          // SCROLL GOES UP
          else if(currentScroll < position )  {
            theSidebar.removeClass("smallSideBar");
            theSidebar.removeClass("smallSidebarSticky");


            if (  theSidebar.hasClass("fixed-bottom")) { //scroll up when fixed bottom, no footer visible

              var marginTop = theSidebar.offset().top
               marginTop = marginTop - 145; //removes headers height
              theSidebar.css("position","relative");
              theSidebar.css("margin-top", marginTop );
              theSidebar.removeClass("fixed-bottom");
              theSidebar.addClass("upFromFixBtm");

            }


            if ( isOnScreen("#cpsbTop") || (isOnScreen("#cpsbTop") && theSidebar.hasClass("upFromFixBtm") )    ) {

              theSidebar.css("position","sticky");
              theSidebar.css("width",$(".course-sidebar").width()+"px");
              theSidebar.addClass("sticky-top160");
              theSidebar.css("margin-bottom","auto");
              theSidebar.css("margin-top","0");
              theSidebar.css("top",topVar);
              theSidebar.removeClass("upFromFixBtm");

            }

            if ( isOnScreen(".footer") == false && theSidebar.hasClass("absolute-bottom") && isOnScreen("#cpsbTop") )
            {
              //console.log("Case 8");
              theSidebar.removeClass("absolute-bottom");
              theSidebar.addClass("upFromFooter");
              theSidebar.css("bottom","auto");
              theSidebar.css("width",$(".course-sidebar").width()+"px");
              theSidebar.css("position","fixed");

            }

            //VIDEO VIDEO VIDEO VIDEO

            if (theVideo.hasClass("fixed-bottom")) {

              var marginTop = theVideo.offset().top
              marginTop = marginTop - 145; //removes headers height

              theVideo.css("position","relative");
              theVideo.css("margin-top", marginTop );
              theVideo.removeClass("fixed-bottom");
              theVideo.addClass("upFromFixBtm");
            }

            if ( typeof ($("#vcTop").offset().bottom) != undefined && $("#vcTop").offset().bottom > -5 ) {

              theVideo.addClass("sticky-top160");
              theVideo.css("position","sticky");
              theVideo.css("top",topVar);
              theVideo.css("bottom","auto");
              theVideo.css("margin-top","0");
              theVideo.removeClass("absolute-bottom");

              if (theVideo.hasClass("upFromFixBtm"))
                  theVideo.removeClass("upFromFixBtm");

            }


          } //scroll UP

          window.localStorage.setItem("position",currentScroll); //update position



        }

        //Adjuts lements sizes when sidebar expands/collapse
        function updateSizes(arg){

          var vpHeight = $(window).height()-160;
          var sidebar = $('.course-sidebar');
          var videoconteiner = $('.course-video-container');
          var sbHeight = $('#course-lessons').height();
          var vcHeight = $('.course-container-sticky').height();

          if (sbHeight > vcHeight) {

            videoconteiner.css("height",sbHeight+"px");
            $('.inner-page__row_course-page').css("height",sbHeight+"px"); // so video container can magic scroll
            $('.course-container').css("height",sbHeight+"px"); // so sidebar container can magic scroll
              sidebar.css("height",sbHeight+"px");

          }

          //sidebar height is smaller than videocontent height
          if (sbHeight < vcHeight ) {

            $('.inner-page__row_course-page').css("height", vcHeight+"px");
            sidebar.css("height",vcHeight+"px");
            videoconteiner.css("height",vcHeight+"px");
            sidebar.css("height",vcHeight+"px")

            if (sbHeight < $(".course-container-sticky").height()  )
              $(".course-container").css("height", $(".course-container-sticky").height()+"px");

            else if (sbHeight > $(".course-container-sticky").height()  )
              $(".course-container").css("height", sbHeight+"px");

          }

        }

        function isOnScreen(elem) {
        	// if the element doesn't exist, abort
        	if( elem.length == 0 ) {
        		return;
        	}
        	var $window = jQuery(window);
        	var viewport_top = $window.scrollTop();
        	var viewport_height = $window.height();
        	var viewport_bottom = viewport_top + viewport_height;
        	var $elem = jQuery(elem);
        	var top = $elem.offset().top;
        	var height = $elem.height();
        	var bottom = top + height;

        	return (top >= viewport_top && top < viewport_bottom) ||
        	(bottom > viewport_top && bottom <= viewport_bottom) ||
        	(height > viewport_height && top <= viewport_top && bottom >= viewport_bottom)
        }
*/


        this.onSelectEvent          = function (element, event) {
            
            let $eventList          = $(element);
            let eventId             = $(element).val();

            // find event div
            let $events             = $('#events');
            let $event              = $events.find('[data-id="' + eventId + '"]');
            let status              = $event.attr('data-status');

            // show need event
            $events.find('.event').addClass('is_hidden');
            $event.removeClass('is_hidden');

            // change button for status
            this.changeEventStatus(status, $('#event_action_btn'), $('#eventStatus'));
            let msg                 = this.changeEventMsg(events[eventId], $('#eventMessage'));

            if(isEmpty(msg)) {
                $('#event_action_btn').css('padding-top', "15px");
            } else {
                $('#event_action_btn').css('padding-top', 0);
            }
        };

        this.onSendToApprove2       = function (element, event) {

            event.preventDefault();

            const that              = this;

            let $eventList          = $('#event-selector');
            let eventId             = $eventList.val();

            // find event div
            let $events             = $('#events');
            let $event              = $events.find('[data-id="' + eventId + '"]');
            let status              = $event.attr('data-status');
            let $eventBtn           = $('#event_action_btn');

            if($eventBtn.hasClass('disabled')) {

                // check if not login
                if(!this.user.isAuth()) {
                    let mui         = this.getMui();
                    this.showAlert(mui.error['auth_required']);
                }

                return;
            }

            if(status === 'review')
            {
                status              = 'unregister';
            }
            else
            {
                status              = 'review';
            }

            let url                 = 'accounts/' + this.user.getAccountId()
                                    + '/courses/0/events/'
                                    + eventId + '/users/'
                                    + that.user.getUserId() + '/status';

            this.remoteCall(new CallPost(url, {'status': status, 'token': this.user.getSessionId()}, (response) => {

                if(isEmpty(response['response'])) {
                    return;
                }

                let mui             = this.getMui();

                if(isNotEmpty(mui['mylearning']) && mui['mylearning']['alert']) {
                    mui             = mui['mylearning']['alert'];
                }

                response            = response['response'];

                if(isNotEmpty(response) && isNotEmpty(response['status'])) {

                    $event.attr('data-status', response['status']);

                    // change button for status
                    let $eventBtn           = $('#event_action_btn');
                    let $eventStatus        = $('#eventStatus');

                    // change status
                    that.changeEventStatus(response['status'], $eventBtn, $eventStatus);

                    if(isNotEmpty(events[eventId])) {
                        events[eventId]['status']       = response['status'];
                        events[eventId]['event_status'] = response['status'];
                    }

                    that.renderEventList(eventId);

                    if(response['status'] === 'error') {
                        that.showAlert(mui['error']);
                    } else {

                        let printFormLink   = that.generateNewUrl('printCourseListForm/' + courseCode + '/event/' + eventId);

                        that.showApproveModal().done(function (modalWindow) {
                            $('[data-role="printFormLink"]').attr('href', printFormLink);

                            if(response['status'] === 'review'){
                                $('[data-role="approvedEventModal-text"]').text(mui['pending']);
                            }else{
                                $('[data-role="approvedEventModal-text"]').text(mui['registered']);
                            }
                        });

                    }
                }
            }));
        };

        this.onSendToApprove        = function (element, event) {

            event.preventDefault();

            const that              = this;
            let eventId             = $(element).attr('data-id');
            let status              = $(element).attr('data-status');

            if(status === 'review')
            {
                status              = 'unregister';
            }
            else
            {
                status              = 'review';
            }

            let url                 = 'accounts/' + this.user.getAccountId()
                                    + '/courses/0/events/'
                                    + eventId + '/users/'
                                    + that.user.getUserId() + '/status';

            this.remoteCall(new CallPost(url, {'status': status, 'token': this.user.getSessionId()}, (response) => {

                if(isEmpty(response['response'])) {
                    return;
                }

                let mui             = this.getMui();

                if(isNotEmpty(mui['mylearning']) && mui['mylearning']['alert']) {
                    mui             = mui['mylearning']['alert'];
                }

                response            = response['response'];

                if(isNotEmpty(response) && isNotEmpty(response['status'])) {

                    if(response['status'] === 'error') {
                        that.showAlert(mui['error']);
                    } else if(response['status'] === 'review') {
                        that.showAlert(mui['pending']).done(function (modal) {
                            modal.bindOnClose(function () {
                                //that.redirect('myLearning');
                            })
                        });
                    } else {
                        that.showAlert(mui['registered']).done(function (modal) {
                            modal.bindOnClose(function () {
                                //that.redirect('myLearning');
                            })
                        });
                    }
                }
            }));
        };

        let loadedCategoriesCashe   = [];
        this.getAbuseCategories     = function (categoryId) {

            let params = {};
            if(categoryId){
                params.categoryId = categoryId;
            }

            params.preferredLanguage = page.getLanguage();
            params._extend          = 'loadDefaultIsEmpty,onlyWithTitles';

            return this.remoteCall(new CallGet('portals/0' + this.getPortalName() + '/abuse/categories/', params))
                .then((res => {
                    for(let i in res.response){
                        if(!this.getAbuseCategoryInfo(res.response[i].id)){
                            loadedCategoriesCashe.push(res.response[i]);
                        }
                    }

                    return res.response;
                }))
        };

        this.getAbuseCategoryInfo   = function (categoryId) {

            for(let i in loadedCategoriesCashe){
                if(loadedCategoriesCashe[i].id === categoryId){

                    if( loadedCategoriesCashe[i].dsc != null ) {
                        loadedCategoriesCashe[i].dsc  = loadedCategoriesCashe[i].dsc.replace(/([^>])\n+/g, '$1<br/>');
                        return loadedCategoriesCashe[i];
                    }

                }
            }

            return false;
        };

        function Related(page, node) {

            let targetId = node.attr('id'),
                carousel = '#' + node.find('.owl-carousel').attr('id'),
                data = {
                    'watchNext' : page.getMainData().mui.watchNext
                };

            this.carousel = () => {

                $.when(this.defineData() ).then(() => {

                    page.renderTo(page.getTemplateFromNode(node), data, '#' + $(node).attr('id'));

                    this.setHandlers();

                })

            };

            this.defineData = () => {

                let params                = {
                    lang:               page.getLanguage(),
                    category:           page.defineCategoryCode(),
                    limit: '0,20',
                    lessons_count: true
                };

                return page.remoteCall(
                    new CallGet('portals/0' + page.getPortalName() + '/course',
                        params,
                        (res) => this.buildData(res.response)
                    ));


            };

            this.buildData = (courses) => {

                let list = courses.map((course) => {

                //  course['runtime_mins'] =  course['course_runtime_seconds'];
                  course['runtime_mins'] = page.formatSecondsToHrs(course['course_runtime_seconds']);

                //  course['languages_string'] = page.parseLangs(course['languages']) ;




                    if(course['course_id'] !==  page.defineCourseCode()) {

                        var newUrlParts                 = {
                            contentCacheId: course['ceid'],
                            courseTitle:    page.rewriteTitletoUrl(course.title)
                        };

                        course.url          = page.appLocation.buildURL(newUrlParts);
                        course['preview'] = {
                            path:       page.config.CDNContent + 'previews/',
                            src:        course['course_id'] + '/320.jpg',
                            src2x:      course['course_id'] + '/640.jpg',
                            sources: [
                                      {
                                        maxWidth:   395,
                                        src:        course['course_id'] + '/320.jpg',
                                        src2x:      course['course_id'] + '/640.jpg'
                                      },
                                      {
                                        maxWidth:   600,
                                        src:        course['course_id'] + '/640.jpg',
                                        src2x:      course['course_id'] + '/1280.jpg'
                                      }
                                    ]
                        };

                        return course;

                    }

                }).filter((course) => typeof course !== 'undefined');

                return $.extend(data, {list});

            };

            this.setHandlers = () => {
                $(carousel).owlCarousel({
                    loop: true,
                    margin: 10,
                    nav: false,
                    center: false,
                    responsiveRefreshRate: 10,
                    responsive:{
                        0:{
                            items:1
                        },
                        600:{
                            items:2
                        },
                        1000: {
                            items: 3
                        }
                    }

                });

                page.assignPageHandlers('#' + targetId, this)

            };

            this.onPrevSlide = () => {
                $(carousel).trigger('prev.owl.carousel');
            };

            this.onNextSlide = () => {
                $(carousel).trigger('next.owl.carousel');
            };

        }

        this.showApproveModal       = function () {

            let selector            = '#approvedEventModal';
            let $alert              = $(selector);

            let modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        true
            });

            modalWindow.bindOnClose(function () {
                that.redirect('myLearning');
            });

            return modalWindow.show()
                .done(function(){
                    modalWindow.getModalNode()
                        .find('[rel^=close]')
                        .bind('click', function () {
                            modalWindow.close();
                        });
                });
        };

        this.ERROR                      = 'error';
        this.NOT_AUTH                   = 'not_auth';
        this.LESSON_NO_ACCESS           = 'lesson_no_access';
        this.NO_SEQUENCE_ACCESS         = 'no_sequence_access';
        this.LESSON_NO_ACCESS_LOGGED_IN = 'lesson_no_access_logged_in';
        this.NO_VIDEO_FORWARDING        = 'no_video_forwarding';
        this.ENTER                      = 'enter';
        this.LIMIT_REACHED              = 'limitReached';
        this.IS_PASSED                  = 'isPassed';
        this.NEED_TO_WATCH_ALL          = 'needToWatchAll';
        this.ERROR_SAVE_PROGRESS        = 'progress_not_saved';
        this.TRAINING_LIMIT             = 'training_limit';
    }

    Courses.prototype               = Object.create(Page.prototype);
    Courses.prototype.constructor   = Courses;

    return Courses;
});
