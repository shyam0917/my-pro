
;define(['jquery', 'lib/Page', 'lib/CallGet','ui/player','ui/ModalWindow', 'videoplayer', 'signUp'],
    function ($, Page, CallGet,  Player, ModalWindow, videojs, SignUp) {

        function LandingFacebook() {

            Page.call(this);

            const that              = this;

            var data                = {};
            var form                = '.header-form-wrapper';
            var categories          = ['business', 'computer', 'finance', 'safety',];
            var specifiedCourses    = {
                business: {
                    hidden: ['BUS1184', 'BUS1194', 'BUS4444', 'BUS1127','BUS1125', 'BUS1129', 'BUS1122', 'BUS1171'],
                    visible:['BUS1164', 'BUS1196', 'BUS1200', 'BUS1193']
                    // visible:['BUS1200', 'BUS1058', 'BUS1031', 'BUS1040'] //exp
                },
                safety:{
                    hidden: ['SAF1012', 'SAF1021B', 'SAF1016', 'SAF1008'],
                    visible:['SAF1066', 'SAF1065', 'SAF1064', 'SAF1006']
                },
                finance:{
                    hidden: ['BNK1006', 'BNK1026', 'BUS1045', 'BNK1027'],
                    visible:['BNK1004', 'BNK1014', 'BNK1015', 'BNK1028']
                },
                computer:{
                    hidden: ['CMP1128', 'CMP1130', 'CMP1134', 'CMP1095','CMP1118', 'CMP1099', 'CMP1115', 'CMP1113'],
                    visible:['CMP1126', 'CMP1114', 'CMP1110', 'CMP1122']
                }
            };
            var imgSources          = [
                                            {minWidth:1000,sourse:320, sourse2x:640},
                                            {minWidth:875, sourse:640, sourse2x:1280},
                                            {minWidth:370, sourse:400, sourse2x:800}
                                         ];
            var phrases             = [
                'Build a New Skill',
                'Get a New Job',
                'Become a Leader',
                'Get a Promotion',
                'Increase your Productivity'
            ];
            var closeSelector       = '.modal_close';
            var signUPmui           = {};

            this.dataCourses        = {};

            this.getClassName       = function () {
                
                var location        = this.appLocation.urlParts.all,
                    className       = 'lpfb_01';

                if(location &&  location[2]) {
                    switch (location[2]) {
                        case 'lp1': className = 'lpfb_01';   break;
                        case 'lp2': className = 'lpfb_02';  break;
                        case 'lp3': className = 'lpfb_03';  break;
                    }
                }
                return className;
            };

            this.getRandomInt       = function (min, max) {

                    return Math.floor(Math.random() * (max - min)) + min;
            };

            this.defineContent      = function () {

                return $.when(  this.getLocalSettings(),
                                //this.getAllCourses(categories),
                                this.getSignUPmui(),
                                this.getSpecifiedCourses()
                             )
                    .then((settings, pageMui, allCourses) => {
                        if(settings && !settings.isUS) {
                            //that.generatePageError();
                            //return;
                        }

                        data['totalPrice']    = settings.prices ? settings.prices['monthly'] : 14.99;
                        data['randomPhrase']  = phrases[0];
                        data['className']     = that.getClassName();
                        data['categories']    = that.handleContentData(allCourses, specifiedCourses);

                        that.setContentData(data);
                        that.rotationPhrase();
                });
            };

            this.getSpecifiedCourses = () => {

                var prom            = $.Deferred();

                this.remoteCall(new CallGet('courses/langs', {_extend:'details,author,intro,trt', lang:this.getLanguage()},
                    function(res) {

                        prom.resolve(res.response);

                    }).defineErrorHandler((res, status) => {
                    prom.reject();
                }));
                return prom;
            };

            this.arrayIncludes      = function(haystack, needle) {
                for(var i = 0; i < haystack.length; i++)
                    if(haystack[i] == needle)
                        return true;
                    
                return false;
            };

            this.getSignUPmui       = function() {

                var prom            = $.Deferred();

                this.remoteCall(new CallGet('mui/0www/0en/', {groups: 'Pages-SignUp', code: 'all', nested: true, '_': this.config.LocalStorageStamp},
                    function(res) {

                        if(res.response && res.response.SignUp) {
                            signUPmui   = {conditions: res.response.SignUp.conditions};
                        }
                        prom.resolve();

                }).defineErrorHandler((res, status) => {
                        prom.reject();
                }));
                return prom;
            };

            this.handleContentData  = function (allCourses, specifiedCourses) {

                var categoriesCourses = [],
                     lang             = this.getLanguage(),
                    formattedCourses  = {};

                $.each(allCourses, function (i,course) {
                    formattedCourses[course['course_ID']] = course;
                });

                $.each(categories, function (i, tplName) {
                    var visible       = [];
                    $.each(specifiedCourses[tplName].visible, function (j, courseID) {
                        let dataFormat = that.prepareDataFormat(formattedCourses[courseID], lang);
                        if(typeof dataFormat != 'undefined' ) {
                            visible.push( dataFormat );
                        }
                    });

                    var hidden       = [];
                    $.each(specifiedCourses[tplName].hidden, function (j, courseID) { 
                        let dataFormat = that.prepareDataFormat(formattedCourses[courseID], lang);
                        if(typeof dataFormat != 'undefined' ) {
                            hidden.push( dataFormat );
                        }
                    });

                    categoriesCourses[i] = {
                        category: {
                            categoryTitle:  tplName,
                            hidden:         that.prepareHiddenCourse(hidden),
                            visible:        visible
                        }
                    };
                });

                return categoriesCourses;
            };

            this.prepareDataFormat   = function (course, lang) {
                if(typeof course !== 'undefined') {
                    return {
                        id:         course['course_ID'],
                       trt:        course['trt']['hours'],
                        title:      course['details'][lang]['title'],
                        tagline:    course['details'][lang]['tagline'],
                        author:     course['author']['lang'] != 'en' ? course['author']['langs']['en']['full_name'] : course['author']['full_name'],
                        introGUID:  course['intro'] ? course['intro']['guid'] :'',
                        imgPath:   `${that.config.CDNContent}previews/${course.course_ID}/`,
                        //will be replaced to buildURL after
                        url:        '/' + lang + '/library/' + course['ceid'] + '/course/' + that.rewriteTitletoUrl( course['details'][lang]['title']),
                        imgFile:   '320.jpg',
                        imgFile2x: '640.jpg',
                        imgSources: imgSources
                    };
                } 
            };


            this.prepareHiddenCourse = function (originalArray) {

                var result = [], pagination = [], size = 4;

                var i       = 0;
                while (originalArray.length > 0) {
                    result.push({hiddenCourses: originalArray.splice(0, size), number:i });
                    i++;
                }
                return result;
            };

            this.onShowMore         = function (n,e) {

                var node            = $(n);
                var wrapper         = $(node).closest('.hidden-wrapper');
                var hiddenCourses   = $(wrapper[0]).find('.hidden');

                if(hiddenCourses.length) {
                    var  dataNumber = $(hiddenCourses[0]).data('number');

                    $(wrapper[0]).find('[data-number="'+dataNumber+'"]').removeClass('hidden');

                    if(hiddenCourses.length == 1) {
                        $(n).text('Hide');
                    }

                } else {

                    $(n).text('Show more');
                    $(wrapper[0]).find('.hidden-courses').addClass('hidden');
                }
            };

            this.formatSecondsToMins    = function (seconds) {

                var m = seconds/60 ^ 0,
                    s = seconds-m*60;
                s = s < 10 ? '0' + s : s;

                return m + ':' + s;
            };


            // this.sortArrayByOther   = function (originalArray, sort) {
            //
            //     var sorted          = [];
            //
            //     //if not all courses exist, do not sort
            //     if(originalArray.length < 4) {
            //         return originalArray;
            //     }
            //
            //     $.each(sort, function (i, courseID) {
            //         $.each(originalArray, function (j, item) {
            //             if(item['id'] == courseID) {
            //                 sorted[i]   = item;
            //             }
            //         });
            //     });
            //     return sorted;
            // };

            this.getLocalSettings   = () => {

                let promise = $.Deferred();

                var visitorLocalsettings = JSON.parse(localStorage.getItem("visitorLocalsettings"));
            
                if(deepInObject(visitorLocalsettings, 'ipInfo.country')){
                    let settings = {
                        prices: visitorLocalsettings.settings.prices,
                        isUS: visitorLocalsettings.ipInfo.country === 'US'
                    };

                    promise.resolve(settings);
                }else{

                    this.remoteCall(new CallGet('visitor/localsettings/',
                        {}, (r) => {
                            localStorage.setItem("visitorLocalsettings", JSON.stringify(r.response));
                            let settings = {
                                prices: r.response.settings.prices,
                                isUS: r.response.ipInfo.country === 'US'
                            };


                            promise.resolve(settings);

                        }
                    ).defineErrorHandler(function (query, status) {

                        promise.reject(that.E_SERVER, this);

                    }));
                }

                return promise;
            };

            this.onSubmitFacebookLanding = function (n, e) {

                var currentForm     = $(n).closest(form),
                    emails          = $(currentForm).find('[name="email"]').val(),
                    password        = $(currentForm).find('[name="password"]').val(),
                    params          = {emails};

                $(this.defineSelector()).remove();

                if(!emails.length) {
                    this.showAlert(that.getMainData().mui.form.requiredField.invalidTypeMessage, true);
                    return;
                }

                this.remoteCall(new CallGet(
                    '/accounts/available-emails',
                    params,
                    (res) => {

                        if (res.response.unavailable.length) {

                            this.showAlert(emails + ' is unavailable', true);
                            $(form).find('[name="email"]').val('');

                            return;
                        }

                        that.switchContainer('payform');
                        var signUP  = new SignUp();
                        var payData    = {
                            email:                  emails,
                            password:               password,
                            licenses:               1,
                            totalPrice:             0.99,
                            subscriptionPeriod:     'month',
                            paymentPeriod:          'month, after 3 moths for $0.99, ',
                            chargeDate:             '',
                            accountPageType:        'trial',
                            mui:                    signUPmui,
                            target:                 'container',
                            landing_FB:             1
                        };

                        $.extend(payData, that.getMainData().mui);

                        signUP.onShowPayForm(payData);
                        $('#leanOverlay').fadeOut(300);
                    }
                ));

            };

            this.switchContainer    = function (container) {
                if(container == 'payform') {
                    $('.signup-page').removeClass('hidden');
                    $('.facebooklanding-wrapper').addClass('hidden');
                }
                if(container == 'language') {
                    $('.header-item.header-item--lang span').addClass('hidden');
                }

            };

            this.onPlayPreview      = function (n,e) {

                e.preventDefault();

                var
                    lesson              = $(n).data('lessonid'),
                    course              = $(n).data('course-id'),
                    type                = $(n).data('lesson-type'),
                    lang                = this.getLanguage(),
                    link                = '/' + lang + '/library/' + course;

                if(!lesson || lesson.length == 0 || type != 'video' ) {
                    return true;
                }

                return that.loadTemplate('ui/previewModal', function (html) {
                    var mainData = that.getMainData();
                    var lng = that.appLocation.urlParts.pageLanguage;
                    that.getLangs();
                    if( mainData.site.language == 'en' ){ mainData.ltr = true; }
                    $.getJSON( that.config['CDNPortal']+'opencontent/courses/details/'+course+'_'+lng+'.json', function( resp ) {
                        resp.langs = that.parseLangs(resp.langs);
                        var newUrlParts    = {
                            courseTitle:    that.rewriteTitletoUrl(resp.title),
                            contentCacheId: resp.ceid,
                            pageController: 'courses'
                        };
                        resp.url = that.appLocation.buildURL(newUrlParts),
                        mainData.courseData = resp;
                        that.renderTo(html, mainData, that.APPEND_TO_BODY);
                        that.showModal();
                        that.renderPlayer(course, lesson, link);
                        that.assignPageHandlers(that.defineSelector(), that);
                        // that.setHandlers();
                    }).fail(function (){
                        that.renderTo(html, mainData, that.APPEND_TO_BODY);
                        that.showModal();
                        that.renderPlayer(course, lesson, link);
                        that.assignPageHandlers(that.defineSelector(), that);
                    });

                    // that.renderTo(html, that.getMainData(), that.APPEND_TO_BODY);
                    // that.showModal();
                    // that.renderPlayer(course, lesson, link);
                    // that.assignPageHandlers(that.defineSelector(), that);

                });
            };
            
            this.getLangs                   = function () {

                return $.ajax({
                    cache: true,
                    url: that.config.basePath + 'json/langs--v' + that.config.LocalStorageStamp + '.json',
                    dataType: "json",
                    success: function(res) {
                        return $.extend(data, {'langs': res});
                    }
                });
            };

            this.parseLangs             = function (codes) {

                let dataCodes = data.langs.map((dataCode) =>dataCode.codeISO6391);

                return codes.filter((code) => ~that.config.languages.indexOf(code)).map(function (code) {

                    let index = dataCodes.indexOf(code);

                    if (~index) {
                        return data.langs[index].native;
                    }


                }).join(', ');

            };
            this.defineSelector     = function () {

                return '#previewModal';
            };

            this.showModal          = function () {

                this.modalWindow        = new ModalWindow({
                    modalID:        this.defineSelector(),
                    top:            100,
                    overlay:        0.4,
                    closeButton:    closeSelector,
                    onOpen: () => {
                    },
                    onClose: () => {

                        $(this.defineSelector()).remove();
                        delete localStorage.captionLang;
                    }
                });

                return this.modalWindow.show();
            };

            this.renderPlayer       = function(course, lesson, link) {

                var player = new Player(this);

                var params = {
                    autostart:                  true,
                    captiontype:                'alternative',
                    rewactionstop:              false,
                    transcriptalt:              false,
                    disableCaptions:            false,
                    displaycaptionbydefault:    'none',
                    placevideo:                 'course',
                    playbackRates:               [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
                };

                var extra = {
                    captions: that.getLanguages(),
                    _extend: 'captions'

                };

                var actions = {
                    playing: function() {

                        that.getCurrentTime(player.getCurrentPlayer(), 2);

                    },
                    ended: function () {

                    }
                };

                var lessonData = {
                    id:lesson,
                    lesson_type:'video'
                };

                player.setPlayerHandlers(actions);
                
                var result               = player.show(course, lessonData, 'courseVideoEmbed', params, extra);

                result.fail(function () {
                     window.history.pushState({}, '', link || '/');

                     location.reload();
                });
            };


            this.getCurrentTime     = function (myPlayer, timeLeft) {

                if(typeof myPlayer == 'object'){

                    var duration    = myPlayer.duration();

                    myPlayer.on("timeupdate", function(){

                        if( (duration - myPlayer.currentTime()) < (+timeLeft + 1) &&
                             duration - myPlayer.currentTime() > (+timeLeft - 0.5)) {

                            that.showPopUpOnVideo(myPlayer.currentTime());
                        }
                    });
                }
            };

            this.showPopUpOnVideo         = function (player) {

                var clonedForm  = $('#header-form').clone();

                $(clonedForm).find('.header-form-smaller').removeClass('hidden');

                $(that.defineSelector()).find('.header-form-wrapper').remove();
                $(that.defineSelector()).addClass('dark');
                $(that.defineSelector()).append(clonedForm);

                that.assignPageHandlers(that.defineSelector(), that, true);

            };

            this.rotationPhrase         = function () {
                var key             = 0;
                var timerId         = setInterval(function() {

                    $('.header-text-color').css({'background-color':'#999999'});

                    do {
                        var randomKey   = that.getRandomInt(0,5);
                    } while (randomKey == key);
                    key             = randomKey;
                    $('.header-text-color').html(phrases[key]);

                    var changeBG    = setTimeout(function() {

                        $('.header-text-color').css({'background-color':'#F17E3C'});
                    }, 150);

                }, 2850);

            };

            this.loadStylesPromise.done( function () {
                that.switchContainer('language');
            });

        }
        LandingFacebook.prototype = Object.create(Page.prototype);
        LandingFacebook.prototype.constructor = LandingFacebook;
        return LandingFacebook;

    });