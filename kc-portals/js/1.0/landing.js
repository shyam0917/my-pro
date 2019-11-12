;define(['jquery', 'lib/Page', 'lib/CallGet','ui/player', 'videoplayer'],
    function ($, Page, CallGet,  Player, videojs) {

        function Landing() {

            Page.call(this);

            const that                  = this;

            var courseGUID              = null;

            var data                    = {};

            var player;

            var allLessons              = {};

            var timer;

            var timeCount               = 0;

            var startedLessonID         = null;

            //specific lessons for course landing page
            this.dataCourses                = {
                BUS1194:{
                lessons:
                {
                    '82d2c81b-9527-4510-bb68-448093742384': {
                        description: {
                            en: 'Understanding the reason for the report will ensure you cover the content effectively',
                            es: 'Understanding the reason for the report will ensure you cover the content effectively'
                        },
                        popUplink: ''
                    },
                    '219eb9e0-63cf-4594-bc14-2c9f211eaf55': {
                        description: {
                            en: 'Learn how to communicate your message to your audience',
                            es: 'Learn how to communicate your message to your audience'
                        },
                        popUplink: ''
                    },
                    'ba032ab6-e916-4868-8972-4e985d094040': {
                        description: {
                            en: 'Identify the important sections needed for your reports',
                            es: 'Identify the important sections needed for your reports'
                        },
                        popUplink: ''
                    },
                    '6086d6e2-3048-488f-8aa4-bba76bb26646': {
                        description: {
                            en: 'Learn to incorporate company values into your reports',
                            es: 'Learn to incorporate company values into your reports'
                        },
                        popUplink: 'library/business/5c1aa1cf-f564-4fc7-9470-34ad66c05f69/management'
                    }
                },
                template: 'vertical',
                showPopUp: false
                },
                BUS1200:{
                    lessons:
                    {
                        '414d6718-25de-4743-a7d4-8e40483057eb': {
                            description: {
                                en: 'Overcome technical and semantic barriers that disrupt your messages.',
                                es: 'Overcome technical and semantic barriers that disrupt your messages.'
                            },
                            popUplink: 'library/business/d611048e-b3b4-4769-823b-d0b79e465957/communication-skills'
                        },
                        'f5deb98d-1e58-41e9-a19c-3e5a7bdfb35b': {
                            description: {
                                en: 'What type of communicator are you? Find out now.',
                                es: 'What type of communicator are you? Find out now.'
                            },
                            popUplink: 'library/business/5c1aa1cf-f564-4fc7-9470-34ad66c05f69/management'
                        },
                        '03a50ec8-4a2e-4889-8225-879b91837222': {
                            description: {
                                en: 'Build rapport and effectively communicate when using technology.',
                                es: 'Build rapport and effectively communicate when using technology.'
                            },
                            popUplink: 'courses/d611048e-b3b4-4769-823b-d0b79e465957/BUS1116'
                        },
                        '31cf4998-bcb8-4a94-af7e-dcaf6d4e3f7e': {
                            description: {
                                en: 'Use these effective tips to get your team to participate in meetings.',
                                es: 'Use these effective tips to get your team to participate in meetings.'
                            },
                            popUplink: 'library/business/5c1aa1cf-f564-4fc7-9470-34ad66c05f69/management'
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1140:{
                    lessons:
                    {
                        '3b3de95c-d9b7-4cad-a4e6-e8c09da3df4f': {
                            description: {
                                en: 'Learn what business intelligence is and how it can help your company.',
                                es: 'Learn what business intelligence is and how it can help your company.'
                            },
                            popUplink: ''
                        },
                        '2973dc95-dc74-4b09-b468-7daed944f1bd': {
                            description: {
                                en: 'Understand how to find important information in data.',
                                es: 'Understand how to find important information in data.'
                            },
                            popUplink: ''
                        },
                        '8004f898-c2ad-4da3-a389-377b12b342f9': {
                            description: {
                                en: 'Learn how data can improve the quality of information you have.',
                                es: 'Learn how data can improve the quality of information you have.'
                            },
                            popUplink: ''
                        },
                        'd99ef7c7-7f74-4f43-8e39-6e1107276d4c': {
                            description: {
                                en: 'Understand how you can group similar data together.',
                                es: 'Understand how you can group similar data together.'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1196:{
                    lessons:
                    {
                        '7fa065c0-c986-46c8-a744-de6bbab26628': {
                            description: {
                                en: 'Learn what initiative is and how to make it work for you.',
                                es: 'Learn what initiative is and how to make it work for you.'
                            },
                            popUplink: ''
                        },
                        '4316c7f7-a3c4-49fe-9e75-7afd815a8155': {
                            description: {
                                en: 'Identify ways you can take initiative in the workplace.',
                                es: 'Identify ways you can take initiative in the workplace.'
                            },
                            popUplink: ''
                        },
                        'bf9a7759-444c-478b-a11c-228f0676593e': {
                            description: {
                                en: 'Learn some of the barriers you may face when taking initiative.',
                                es: 'Learn some of the barriers you may face when taking initiative.'
                            },
                            popUplink: ''
                        },
                        '49287d5e-2a8f-4dc0-b755-8b115692f128': {
                            description: {
                                en: 'Discover techniques for presenting your ideas to management.',
                                es: 'Discover techniques for presenting your ideas to management.'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1164:{
                    lessons:
                    {
                        '9fb06b28-80ce-4ac2-9485-50fe54086982': {
                            description: {
                                en: 'Learn how the Stage-Gate Decision-Making Process works',
                                es: 'Learn how the Stage-Gate Decision-Making Process works'
                            },
                            popUplink: ''
                        },
                        '57d0602d-f565-4f1e-8a73-ef28b6ed58d6': {
                            description: {
                                en: 'Learn how to plan for and handle risks',
                                es: 'Learn how to plan for and handle risks'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1172:{
                    lessons:
                    {
                        'b9dc328e-256c-446d-91d6-3ff7aebd781f': {
                            description: {
                                en: 'Learn about your role and responsibilities',
                                es: 'Learn about your role and responsibilities'
                            },
                            popUplink: ''
                        },
                        '7a892f84-e908-4078-b438-aad674c22b04': {
                            description: {
                                en: 'Understand how to report violations',
                                es: 'Understand how to report violations'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1210:{
                    lessons:
                    {
                        'eb442590-a852-4471-9af1-86d1a45c6ba1': {
                            description: {
                                en: 'Learn the techniques to carefully plan your projects and improve efficiency as well as understanding of the project objectives.',
                                es: 'Learn the techniques to carefully plan your projects and improve efficiency as well as understanding of the project objectives.'
                            },
                            popUplink: ''
                        },
                        '2c68a11e-b601-4f37-acbe-d60be24e0472': {
                            description: {
                                en: 'Procurement is used to determine what to buy, when to buy and from whom to buy it. This lesson discusses the corporate procurement strategy and the project procurement strategy.',
                                es: 'Procurement is used to determine what to buy, when to buy and from whom to buy it. This lesson discusses the corporate procurement strategy and the project procurement strategy.'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                SAF1075:{
                    lessons:
                    {
                        '25bc647c-77fd-412f-934e-b7fa73b2a039': {
                            description: {
                                en: 'Learn how business processes create a discriminatory environment.',
                                es: 'Learn how business processes create a discriminatory environment.'
                            },
                            popUplink: ''
                        },
                        '24e98854-99e2-47a3-8038-4005de0d6d90': {
                            description: {
                                en: 'Learn to develop a culture of inclusiveness.',
                                es: 'Learn to develop a culture of inclusiveness.'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1266:{
                    lessons:
                    {
                        'df3f3431-f905-41fc-96fb-027679810936': {
                            description: {
                                en: 'Understand the basics of EQ.',
                                es: 'Understand the basics of EQ.'
                            },
                            popUplink: ''
                        },
                        '7c19db7d-a601-49bc-82d8-cd9939214246': {
                            description: {
                                en: 'Learn why EQ is a critical component in professional success.',
                                es: 'Learn why EQ is a critical component in professional success.'
                            },
                            popUplink: ''
                        },
                        'ee41c21e-266e-450b-9763-a1fe0c303b9c': {
                            description: {
                                en: 'Discover 10 ways you can begin immediately improving your EQ.',
                                es: 'Discover 10 ways you can begin immediately improving your EQ.'
                            },
                            popUplink: ''
                        },
                        'f0864832-2a1d-4d73-ba2e-e4150e91c293': {
                            description: {
                                en: 'Learn what you can do to help your team members develop their EQ.',
                                es: 'Learn what you can do to help your team members develop their EQ.'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1261:{
                    lessons:
                    {
                        '8d872e23-d002-462b-abaa-8b76b87c7089': {
                            description: {
                                en: 'Learn how two-way communication differs from one-way communication.',
                                es: 'Learn how two-way communication differs from one-way communication.'
                            },
                            popUplink: ''
                        },
                        'ab3d7141-6c95-4cc5-a5d1-8001d87915d0': {
                            description: {
                                en: 'Learn how to effectively communicate in face-to-face settings.',
                                es: 'Learn how to effectively communicate in face-to-face settings.'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1211:{
                    lessons:
                    {
                        'e336b3a5-3322-41f5-bef5-11e69cfbb6f8': {
                            description: {
                                en: 'Identify the signs of procrastination and learn how to overcome procrastination.',
                                es: 'Identify the signs of procrastination and learn how to overcome procrastination.'
                            },
                            popUplink: ''
                        },
                        '323b8bd0-049b-4bb3-b472-eced47e4aff4': {
                            description: {
                                en: 'Cultivate these habits to make your tasks easier.',
                                es: 'Cultivate these habits to make your tasks easier.'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1213:{
                    lessons:
                    {
                        'ddfd09e5-a2a2-406f-b517-2052648ec7d3': {
                            description: {
                                en: 'Learn about the models that can be used to determine how a company buys goods and services',
                                es: 'Learn about the models that can be used to determine how a company buys goods and services'
                            },
                            popUplink: ''
                        },
                        '29a68571-2273-40a6-92b9-120f38c422cc': {
                            description: {
                                en: 'Learn how to use advanced technology to meet your clients virtually anywhere in the world',
                                es: 'Learn how to use advanced technology to meet your clients virtually anywhere in the world'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                },
                BUS1259:{
                    lessons:
                    {
                        'cbe096ef-6312-4cc1-b52f-a38f26d59980': {
                            description: {
                                en: 'Learn six steps for choosing the best remote employees',
                                es: 'Learn six steps for choosing the best remote employees'
                            },
                            popUplink: ''
                        },
                        '6d81e05d-a7cb-4d67-b946-544f3cb63bff': {
                            description: {
                                en: 'Learn the keys to building your remote culture',
                                es: 'Learn the keys to building your remote culture'
                            },
                            popUplink: ''
                        }
                    },
                    template: 'vertical',
                    showPopUp: false
                }
            };


            this.getClassName           = function () {
                
                var location        = this.appLocation.urlParts.all;

                if(this.dataCourses[location[1]] &&  this.dataCourses[location[1]].template == 'horizontal'
                    || location[2].search('HV') != '-1') {
                    console.log('HV');
                    return 'landingH';
                } else  {
                   return 'landing';
                }
            };

            this.formatSecondsToMins    = function (seconds) {

                var m = seconds/60 ^ 0,
                    s = seconds-m*60;
                s = s < 10 ? '0' + s : s;

                return m + ':' + s;
            };

            this.defineContent          = function () {

                this.outContentPromise.done(() => {

                    this.checkUrlAndPlay();

                });
                var urlParts            = this.appLocation.urlParts.all;
                var courseID            = urlParts[2];

                return $.when(this.getCourseData(courseID), this.getCourseLanguages(courseID), this.getPageMui())
                    .then((result, langs, resPage) => {

                        that.setLibtitleFromContent(result.title, '' ,courseID);

                        courseGUID          = courseID;
                        data.course         = result;
                        data.preview        = that.config.CDNContent + 'previews/' + courseID + '/800.jpg';
                        data.langs          = langs.fullNameLangs.join(', ');
                        data.courseURL      = that.generateNewUrl('courses/' +  courseID);

                        that.handleContentData(courseID, result).done(function () {
                            that.setContentData(data);
                            $("video").attr("poster", data.preview);
                            $("video").trigger("click");
                        });

                    });
            };



            this.getCourseData          = (courseCode) => {

                var prom = $.Deferred();

                var params = {
                    'lang':             this.getLanguage()
                };

                this.remoteCall(new CallGet(
                    'portals/0' + this.getPortalName() + '/course/0' + courseCode + '/', params,
                    (data) => {

                        prom.resolve(data.response);
                    }
                ).defineErrorHandler((query, status) => {

                    if(status == 404) {
                        console.log('redirect404() in landing.getCourseData');
                        this.redirect404();

                    } else {
                        console.error('Error occured: status = ' + status + 'for query: ' + query.toString());
                        prom.reject();
                    }
                }));

                return prom;

            };

            this.arrayIncludes      = function(haystack, needle)
            {
                for(var i = 0; i < haystack.length; i++)
                    if(haystack[i] == needle)
                        return true;
                    
                return false;
            };

            this.getCourseLanguages          = (courseCode) => {

                var prom = $.Deferred();

                $.when( $.getJSON(this.config.basePath + 'json/langs--v'+this.config.LocalStorageStamp+'.json', function (langs) {


                })).then(function (langs) {

                    that.remoteCall(new CallGet(
                        'courses/0' + courseCode + '/', {_extend: 'published'},
                        (data) => {

                            data.response.fullNameLangs     = [];

                            $.each(langs, function (i, lang) {

                                if( that.arrayIncludes(data.response.available_langs, lang.codeISO6391) &&
                                    that.arrayIncludes(that.config.languages, lang.codeISO6391) ) {

                                    data.response.fullNameLangs.push(lang.name);
                                }
                            });

                            prom.resolve(data.response);
                        }
                    ).defineErrorHandler((query, status) => {

                        console.error('Error occured: status = ' + status + 'for query: ' + query.toString());
                        prom.reject();
                    }));

                });

                return prom;
            };



            this.handleContentData      = function (courseID, course) {

                var promise             = $.Deferred();

                var lessons             = [];

                var lessonsCount        = 1;

                var totalRuntime        = 0;

                var lang                = this.getLanguage();

                $.each(course.chapters, function (j,chapter) {

                    $.each(chapter.lessons, function (i,lesson) {

                        if (that.dataCourses[course.course_id] && that.dataCourses[course.course_id].lessons
                            && typeof that.dataCourses[course.course_id].lessons[lesson['lesson_id']] != 'undefined' ) {

                            lesson['id']      = lesson['lesson_id'];

                            lesson['preview'] = that.config.CDNContent + 'previews/' + course.course_id + '/lessons/' + lesson['lesson_id'] + '.jpg';

                            lesson['description']  = that.dataCourses[course.course_id].lessons[lesson['lesson_id']].description[lang] || null;

                            lesson['runtime']      = that.formatSecondsToMins(lesson.runtime_seconds);

                            lessons.push(lesson);

                        } else if ( !that.dataCourses[course.course_id] && lessons.length < 4 ) {

                            lesson['id']           = lesson['lesson_id'];

                            lesson['description']  =  null;

                            lessons.push(lesson);

                        }

                        allLessons[lesson['lesson_id']] = lesson;

                        lessonsCount++;
                        totalRuntime    = totalRuntime + lesson['runtime_seconds'];
                    });

                });

                data.lCount     = lessonsCount;

                data.video      = lessons;

                data.runtime    = this.formatSecondsToHrs(totalRuntime);

                promise.resolve();

                return promise;

            };



            this.onPlayVideo            = function (node, event) {
                event.preventDefault();

                var $node                   = $(node);

                //this.changeURL($node.attr('data-id'), true);

                this.playVideo(courseGUID, $node.attr('data-id'));

                return true;
            };

            this.setActiveVideo         = function (lessonID, status) {

                $('.landing__player__wrapper').removeClass('active');

                if(status) {
                    $('#'+ lessonID ).addClass('active')
                }

            };


            this.onPlayFirstVideo         = function () {

                var wrapper       = 'inner-page__row';

                var palyer        = 'landing__lesson-title';

                $('.' + wrapper).find('.' + palyer + ':first').click();

            };



            this.checkUrlAndPlay     = function () {

                var urlParts        = this.appLocation.urlParts.all;

                if (urlParts.length == 4 && urlParts[3] != '' && this.appLocation.isGUID(urlParts[3])) {

                    this.playVideo(urlParts[2], urlParts[3]);

                    startedLessonID = urlParts[3];
                }
            };


            this.changeURL         = function (lessonID, pushState) {

                var urlParts            = this.appLocation.urlParts.all;

                var newURL              = this.generateNewUrl(urlParts[1] + '/' + urlParts[2] + '/' + lessonID + '/');

                if (pushState) {

                    history.pushState({}, '', newURL);
                }

                return newURL;
            };

            var cid;
            var lid;
            this.playVideo          = function (courseID, lessonID) {
                if(typeof cid != 'undefined' && typeof lid != 'undefined') 
                    if(cid == courseID && lid == lessonID) 
                        return;

                cid = courseID
                lid = lessonID
                
                var lesson = {
                    id:lessonID,
                    lesson_type:'video'
                };
                player = new Player(this);
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
                        captions: 'en,es',
                        _extend: 'captions',
                        cause: 'landing',
                        studentID: '58ddebd295c20cfeea4841f9d6f9a497'
                    };

                let actions = {
                    loadeddata: function(){

                        that.setActiveVideo(lessonID, true);
                        that.changeURL(lessonID, true);
                    },
                    playing: function() {

                        // if (that.dataCourses && that.dataCourses[courseID].showPopUp ) {
                        //
                        //     that.getCurrentTime( player.getCurrentPlayer() );
                        // }


                    },
                    ended: function () {

                        if (that.dataCourses ) {
                            that.playNextVideo(courseID, lessonID);
                        }
                    }


                };



                player.setPlayerHandlers(actions);
                player.show(courseID, lesson, 'landingPlayer', params, extra);
            };

            this.getCurrentTime         = function (myPlayer) {

                if(typeof myPlayer == 'object'){

                    var duration    = myPlayer.duration();

                    myPlayer.on("timeupdate", function(){

                        if( (duration - myPlayer.currentTime()) < 6 &&  duration - myPlayer.currentTime() > 4.5) {

                            that.showPopUpOnVideo(myPlayer.currentTime());

                        }

                    });
                }

            };


            this.showPopUpOnVideo         = function (player) {

                var courseID    = this.getCurrentLocation()[1];

                var lessonID    = this.getCurrentLocation()[3];

                var $wrapper    = $('#landingPlayer');

                var width       = $wrapper.width();

                var lessons     = Object.keys(that.dataCourses[courseID].lessons);

                var nextLesson  = lessons[($.inArray(lessonID, lessons) + 1) % lessons.length];


                var popUps      = {
                    'popup-right': {
                        text:           allLessons[nextLesson].title,
                        href:           this.changeURL(nextLesson, false),
                        runTime:        this.formatSecondsToMins(allLessons[nextLesson].runtime_seconds),
                        preview:        that.config.CDNContent + 'previews/' + courseID + '/lessons/' + lessonID + '.jpg',
                        hide:            lessons[lessons.length - 1] == lessonID //not show if last lesson
                    },
                    'popup-left': {
                        text:           'Click here to view Employee Engagement Course',
                        href:           this.generateNewUrl(that.dataCourses[courseID].lessons[nextLesson].popUplink),
                        preview:        that.config.CDNContent + 'previews/BUS1125.jpg'
                    }
                };

                $.each(popUps, function (key, popUp) {

                    if( $wrapper.find('#' + key).length == 0 && !popUp.hide) {

                        var $popUp  = $('#' + key + '-tmp').clone();

                        $popUp.find('.title').html(popUp.text);

                        $popUp.find('.runtime').html(popUp.runTime);

                        $popUp.appendTo($wrapper)
                            .removeClass('hidden')
                            .attr('id', key)
                            .attr('href', popUp.href)
                            .css('width', (width-40)/4 + 'px')
                            .css('height', (((width-40)/3)/16)*7 + 'px')
                            .css('background-size', 'cover' );
                    }
                });

                if(!timer || typeof timer == 'undefined') {
                    timeCount = 6;
                    timer = setInterval(function() {
                        that.countDown($('.countdown'),courseID,  nextLesson);
                    }, 1000);
                }

            };


            this.countDown          = function ($node, courseID, lessonID) {

                timeCount--;

                $node.html(timeCount);

                if(timeCount === 0) {
                    clearInterval(timer);

                    this.playVideo (courseID, lessonID);

                    timer = null;

                    $node.html('');
                }
            };

            this.playNextVideo          = function (courseID, lessonID) {

                var lessons     = Object.keys(that.dataCourses[courseID].lessons);

                var nextLesson  = lessons[($.inArray(lessonID, lessons) + 1) % lessons.length];

                //not playing after loop 4 videos or after end of  4 videos
                if( (startedLessonID && startedLessonID == nextLesson) || lessons[0] == nextLesson) {
                    return false;
                }

                this.playVideo (courseID, nextLesson);
            };




        }
        Landing.prototype = Object.create(Page.prototype);
        Landing.prototype.constructor = Landing;

        return Landing;

    });