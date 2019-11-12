    var volumeLevel;
    var selectedResolution;
    var curPlaybackRate;
    var iOS                 = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;


    var hidden, visibilityChange;

    $(window).blur(function(){
        hidden                  = "hidden";
        visibilityChange        = "visibilitychange";
    });
    $(window).focus(function(){
        hidden                  = "";
        visibilityChange        = "";
    });

    function Player(page, handlers) {
        var that = this;
        var videoPlayer;
        var htmlPlayer;

        this.$window                = null;
        this.playerHandlers         = {};

        this.course                 = null;
        this.lessonType             = null;
        this.lessonGUID             = null;
        this.lessonTitle            = null;
        this.subsEnabled            =  (!localStorage.getItem('captionLang') || localStorage.getItem('captionLang') == 'none') ? false : true;
        this.localData              = {};



        if(typeof handlers === 'object') {

            this.playerHandlers     = handlers;
        }

        this.defineSelector         = function () {

            return '#courseVideoWrapper';

        };

        this.defineParameters       = function (course, lesson) {

            if(typeof course !== 'undefined') {
                this.course         = course;
            }

            if(typeof lesson.id !== 'undefined') {
                this.lessonGUID         = lesson.id;
            }

            if(typeof lesson.title !== 'undefined') {
                this.lessonTitle        = lesson.title;
            }

            if(typeof lesson.lesson_type !== 'undefined') {
                this.lessonType        = lesson.lesson_type;
            }

            if (typeof lesson  == 'string') {
              this.lessonGUID = lesson;
            }
            return this;
        };

        this.getCourse              = function () {

            return this.course;
        };

        this.getLesson              = function () {

            return this.lessonGUID;
        };

        this.getLessonTitle         = function () {

            return this.lessonTitle;
        };

        this.getLessonType         = function () {
            try{var type = this.localData.data.response.link[0].type}catch(e){}

            if(type!='undefined')
                return type
            else
                return this.lessonType;
        };

        this.setPlayerHandlers      = function (handlers) {

            this.playerHandlers     = handlers;

            return this;
        };

        this.setupPlayerHandlers    = function () {
            var that=this;
            $.each(this.playerHandlers, function(action, handler){

                if(typeof handler === 'function'
                    && videoPlayer
                    && action !== 'prev' || action !== 'next') {

                    try{
                        videoPlayer.off(action);
                        videoPlayer.on(action, handler);
                    }catch(e){
                        try{videoPlayer.dispose()}catch(e){}
                    }
                }

                if(htmlPlayer){
                    //map htmlplayer events to handlers used by coursejs (same handles used for video events)
                    if(action == "loadeddata")
                        htmlPlayer.on('lessonStarted', handler);
                    if(action == "playing")
                        htmlPlayer.on('lessonStarted', handler); //call both handlers since html has no "loadeddata" event
                    if(action == "ended")
                        htmlPlayer.on('lessonCompleted', handler);
                    if(action == "prev")
                        htmlPlayer.on('playlistPrev', handler.bind(null, that));//prev/next handlers in course.js expect
                    if(action == "next")                                       // player as param yet bind requires first
                        htmlPlayer.on('playlistNext', handler.bind(null, that));// param to be "this" then bound params
                    if(action == "event")
                        htmlPlayer.on('customEvent', handler);
                }

            });

            return this;
        };

        this.updateNextPrev         = function (prev, next) {

            if(prev === null) {
                this.$window.find('[rel=prev]').hide();
            } else {
                this.$window.find('[rel=prev]').show();
            }

            if(next === null) {
                this.$window.find('[rel=next]').hide();
            } else {
                this.$window.find('[rel=next]').show();
            }
        };

        this.hideNextPrev         = function () {
            this.$window.find('[rel=prev]').hide();
            this.$window.find('[rel=next]').hide();
        };

        this.stop                   = function() {
            if(typeof videoPlayer != 'undefined') videoPlayer.pause()
        };

        this.start                   = function() {
            if(typeof videoPlayer != 'undefined') videoPlayer.play()
        };

        this.showNextVideo          = function(courseID, lesson,  containerID, params, extraApiRequestParameters){

            var that = this;

            var captionType         = params.captiontype ? params.captiontype : 'default'; //set type of captions: default | alternative
            captionType             = (iOS) ? 'default' : captionType;

            if(!videoPlayer || videoPlayer || that.getLessonType()=="html" /*last lesson was html*/ ) { //this function is for when already playing, just to update source
                this.show(courseID, lesson,  containerID, params, extraApiRequestParameters)
                return;
            }

            $('track').remove();
            $('source').remove();

            this.defineParameters(courseID, lesson);

            this.loadSource(courseID, lesson, params, extraApiRequestParameters, captionType).done(function () {
                if(that.getLessonType()=="html"){
                    try{
                        videoPlayer.pause();
                        videoPlayer.stop();
                        videoPlayer.dispose();
                    }catch(e){
                        console.log("video player stopped");
                        try{videoPlayer.dispose();}catch(e){}
                    }

                    $('.video-js').hide()

                    if(htmlPlayer){
                        htmlPlayer.dispose();
                        htmlPlayer=null
                    }
                    htmlPlayer = new WebPlayer();
                    htmlplayer.addPlayer(that.lessonGUID,that.localData.data.response.link[0].file)
                    htmlPlayer.setPlayer(that.lessonGUID)
                    that.setupPlayerHandlers();
                    htmlPlayer.on("lessonStarted",function(){
                        $("#"+containerID).css({height:'auto',width:'auto', margin:'auto'});//size was pre-allocated before load but now needs to support resizing.
                    });
                    var playerData = that.sizeForHtmlPlayer();
                    playerData['token'] = typeof $.cookie('LocalUserData') != 'undefined' && typeof $.cookie('LocalUserData').sessionId != 'undefined' ? $.cookie('LocalUserData').sessionId : null;
                    htmlPlayer.play("#"+containerID, playerData)
                    //$('video').attr('src','');
                }else{
                    try{htmlPlayer.dispose();}catch(e){}
                    $('.video-js').show()
                    $('video').append(that.localData.allTraks).attr('src', that.localData.data.response.link[0].file);

                    if (videoPlayer) {
                        videoPlayer.play();
                    }
                }
            }).fail(function (error) {

            });
        };

        //called in all cases except when just moving to the next video (in that case showNextVideo is used)
        this.show                   =   function(courseID, lesson,  containerID, params, extraApiRequestParameters) {

            var that = this;

            var promise             = $.Deferred();

            if(typeof videoPlayer == 'object'){

                var video = document.getElementById('course_vjs_html5_api');

                if ($('track').length) {
                    $('track').each(function(){
                        that.src = "";
                    });
                }
                if (video) {
                    video.src = "";
                }
                if (videoPlayer) { //eg if returned to page after going to another page, dispose of previous
                    try{videoPlayer.dispose();}catch(e){console.log("resetting video player")}
                }


            }

            try{htmlPlayer.dispose();htmlPlayer=null}catch(e){htmlPlayer=null;}

            this.defineParameters(courseID, lesson);

            this.$window            = $(this.defineSelector());

            const _self             = this;
            var captionType         = params.captiontype ? params.captiontype : 'default'; //set type of captions: default | alternative
            captionType             = (iOS) ? 'default' : captionType;
            /*
             * ONLY ONE OF fastForwardDisabled or transcriptAlt CAN BE TRUE OTHERWISE IT FUNCTIONS IGNORED
             */

            var fastForwardDisabled = params.fastForwardDisabled ? params.fastForwardDisabled : false; //disable rewind action
            var transcriptAlt       = params.transcriptalt ? params.transcriptalt : false; //enable alternative || transcript.
            var stopVideoInHiddenTab = params.stopVideoInHiddenTab ? 1 : 0;

            $("#"+containerID).css({height: $(that.defineSelector()).height(), width: $(that.defineSelector()).width()}).html('Loading video...');


            this.loadSource(courseID, lesson, params, extraApiRequestParameters, captionType).done(function () {

                var videoJsPlayerhtml = '<video  crossdomain '                                                  +
                                                'crossorigin    = "anonymous" '                                 +
                                                'id             = "course_vjs" '                                +
                                                'class          = "video-js vjs-default-skin" controls '        +
                                                'preload        = "none" '                                      +
                                                'width          = "100%"  >'                                    +
                                                that.localData.allSources                                       +
                                                that.localData.allTraks                                         +
                                        '</video>';

                params.width = $("#"+containerID).width();
                params.height = (params.width / that.localData.aspectRatio.split(':')[0]) * that.localData.aspectRatio.split(':')[1];
                $("#"+containerID).css({height: params.height + 'px', width: params.width + 'px', "margin-bottom":'0px','padding-left':'0px'}).html(videoJsPlayerhtml);


                //init htmlPlayer
                // console.log('lesson type 1: '+that.getLessonType());
                // console.log('lesson type 2: '+that.localData.data.response.link[0].type);
                if(that.getLessonType()=="html"){

                    try{
                        videoPlayer.pause();
                        videoPlayer.stop();
                        videoPlayer.dispose();
                    }catch(e){
                        console.log("video player stopped");
                        try{videoPlayer.dispose();}catch(e){}
                    }
                    $('.video-js').hide()

                    htmlPlayer = new WebPlayer();
                    htmlPlayer.addPlayer(that.lessonGUID,that.localData.data.response.link[0].file)
                    htmlPlayer.setPlayer(that.lessonGUID)

                    // page.unbindPageHandlers(that.defineSelector(), that);
                    that.setupPlayerHandlers();
                    htmlPlayer.on("lessonStarted",function(){
                        $("#"+containerID).css({height:'auto',width:'auto', margin:'auto'});//size was pre-allocated before load but now needs to support resizing.
                    });

                    var playerData = that.sizeForHtmlPlayer();
                    playerData['token'] = typeof $.cookie('LocalUserData') != 'undefined' && typeof $.cookie('LocalUserData').sessionId != 'undefined' ? $.cookie('LocalUserData').sessionId : null;
                    htmlPlayer.play("#"+containerID, playerData);

                }
                else if(that.getLessonType()=="video"){
                    videoPlayer = videojs(document.getElementById('course_vjs'), {
                        'controls': true,
                        'autoplay': params.autostart,
                        'aspectRatio': that.localData.aspectRatio,
                        'playbackRates': params.playbackRates || false
                    },

                    function() {

                        var defaultRes              = selectedResolution || 'high';

                        videoPlayer.videoJsResolutionSwitcher({default : defaultRes});
                        videoPlayer.on('resolutionchange', function(){
                            selectedResolution      = videoPlayer.currentResolution().label;
                        });

                        if(that.localData.aspectRatio == "4:3") {
                            $('#'+containerID).closest('.preview--course').addClass('four-by-three');
                            $(window).trigger('resize');
                        }
                        videoPlayer.on("loadedmetadata", function(){

                            document.getElementById('course_vjs').addEventListener('contextmenu', function(event) {
                                event.preventDefault();
                                return false;
                            }, false);


                            var marginBottom         = that.subsEnabled && that.localData.allTraks.length > 0 ? 95 : 30;

                            $(_self.defineSelector()).css({'margin-bottom':(marginBottom + 20) + 'px' });

                            $("#"+containerID).css({height:'auto',width:'auto',margin:'auto', 'margin-bottom':marginBottom + 'px'});//size was pre-allocated before load but now needs to support resizing.


                            if(stopVideoInHiddenTab == 1) {
                                that.checkVisibility();
                            }

                            var displayAlt = 'none';

                            //alternative caption
                            if(captionType == 'alternative' && typeof params['tracks'] == 'object' && typeof params['tracks'][0] != 'undefined' && !params['disableCaptions']) {

                                //fix control bar and add padding for control bar
                                $('.video-js, .vjs-tech').addClass('video-only-bar');
                                $('.vjs-control-bar').addClass('video-permanent-bar');
                                $('.vjs-texttrack-settings').css('display','none');

                                //set alternative captions language
                                var siteLang  = 'en',
                                    videoLang = params.sources[0].label;

                                var captionsArray = [];

                                if (that.localData.vttLang[videoLang])
                                    captionsArray = that.localData.vttLang[videoLang].data;
                                else if (that.localData.vttLang[siteLang])
                                    captionsArray = that.localData.vttLang[siteLang].data;

                                //enable caption by default with selected language
                                if(typeof defaultCaptionLang != 'undefined' && captionType == 'alternative' && captionsArray.length) {
                                    captionsArray = vttLang[defaultCaptionLang].data;

                                    displayAlt = 'block';
                                    $('.video-js, .vjs-tech').removeClass('video-only-bar');
                                    $('.video-js, .vjs-tech').addClass('video-bar-caption');
                                }

                                //create alternative transcription tab
                                that.enableTranscript(transcriptAlt,fastForwardDisabled,captionsArray)

                                //create and insert alternative captions block
                                var outputBlock = document.createElement('div');
                                outputBlock.id = 'altcaption';
                                outputBlock.className = 'altcaption';
                                outputBlock.style["display"] = displayAlt;
                                document.getElementById('course_vjs').appendChild(outputBlock);


                                //inner cue to alternative captions block
                                /*
                                this trigger duplicates every time I launch new video. Meaning if I launch one video
                                then on every time update function is called once. But if I keep watching videos then
                                the function get's triggered as many times as many videos I have watched. Though if I
                                do off trigger then player timeline stops working for some reason
                                */
                                //videoPlayer.off("timeupdate")
                                videoPlayer.on("timeupdate", function(){
                                    if(!captionsArray.length){
                                        /*
                                        there is a problem that VTT file loads async without any promise so it the loading delays for sometime
                                        then we end up here with captionsArray empty because it was defined aboce as
                                        captionsArray = that.localData.vttLang[siteLang].data;
                                        and that.localData.vttLang was empty by then. So here I check if captionsArray is empty and if so then try
                                        to get it's content from that.localData.vttLang[siteLang].data again which might have the content by now.
                                        This fixes the error with disappearing subtitles but it's not the best solution.
                                        */
                                        var storageLang = localStorage.getItem('captionLang');
                                        if(typeof lang == 'undefined' || !lang) var lang;
                                        if(storageLang) lang = storageLang;
                                        else if(typeof defaultCaptionLang !== 'undefined' && defaultCaptionLang) lang = defaultCaptionLang;
                                        else lang = siteLang;
                                        if(lang && typeof that.localData.vttLang[lang] !== 'undefined')
                                            if(typeof that.localData.vttLang[lang].data !== 'undefined'){
                                                captionsArray = that.localData.vttLang[lang].data;
                                                console.log('vtt fix applied');
                                            }
                                    }

                                    var now = videoPlayer.currentTime();
                                    var text = "", cap = "", number = "";
                                    for (var i = 0, len = captionsArray.length; i < len; i++) {
                                        $('#transcript-tab-content a').removeClass('activeCue');
                                        cap = captionsArray[i];
                                        if (now >= cap.timeA && now <= cap.timeB)
                                        {
                                            text = cap.text;
                                            number = i;
                                            break;
                                        }
                                    }
                                    try{
                                        document.getElementById('altcaption').innerHTML = '<span class="cuealt">'+text+'</span>';
                                    }catch(e){
                                        console.log("altcaption not found"); //happens when clicking outside previous (closing)
                                    }
                                    $('#phrase_'+number).addClass('activeCue');
                                });


                                var captionButtonArea   = document.querySelector('.course_vjs-dimensions .vjs-captions-button ul');

                                videoPlayer.textTracks().on('change', function(event) {

                                    var targetCaptionLang   = 'captions off';

                                    $.each(videoPlayer.textTracks(), function (i, item) {

                                        if(item && item.mode == 'showing') {
                                            targetCaptionLang = item.language;
                                        }

                                    });


                                    $('.vjs-menu').removeClass('vjs-lock-showing');
                                    $('.vjs-captions-button .vjs-menu').css({'display':'none'});

                                    if(targetCaptionLang == 'captions off'){

                                            localStorage.setItem('captionLang', 'none');

                                            document.getElementById('altcaption').style.display = 'none';
                                            $('.video-js, .vjs-tech').addClass('video-only-bar');
                                            $('.video-js, .vjs-tech').removeClass('video-bar-caption');

                                            if (that.subsEnabled) {
                                                $("#"+containerID).css({"margin-bottom":'30px'});
                                                $(_self.defineSelector()).css({'margin-bottom':'50px' });
                                                //$('#courseVideoWrapper').height(params.height);
                                                that.subsEnabled = false;
                                            }

                                            that.disableTranscript();

                                    } else {

                                            localStorage.setItem('captionLang', targetCaptionLang);

                                            document.getElementById('altcaption').style.display = 'block';
                                            if(typeof that.localData.vttLang[targetCaptionLang] !== 'undefined')
                                                if(that.localData.vttLang[targetCaptionLang].dir)
                                                    document.getElementById('altcaption').style.direction = that.localData.vttLang[targetCaptionLang].dir;

                                            $('.video-js, .vjs-tech').removeClass('video-only-bar');
                                            $('.video-js, .vjs-tech').addClass('video-bar-caption');

                                            if (!that.subsEnabled) {
                                                $("#"+containerID).css({"margin-bottom":'95px'});
                                                $(_self.defineSelector()).css({'margin-bottom':'115px' });
                                                //$('#courseVideoWrapper').height(params.height + 65);
                                                that.subsEnabled = true;
                                            }



                                            //set default caption language
                                            var defaultCaptionLang = targetCaptionLang;

                                            if (that.localData.vttLang[defaultCaptionLang]) {

                                                captionsArray = that.localData.vttLang[defaultCaptionLang].data;

                                                that.enableTranscript(transcriptAlt,fastForwardDisabled,captionsArray)

                                            } else {
                                                that.disableTranscript()
                                            }

                                    }


                                    that.fixMiniPlayer();

                                });

                                var storageLang = localStorage.getItem('captionLang');


                                if (!storageLang) {

                                    if (siteLang != videoLang && that.localData.vttLang[siteLang]) {

                                        $(captionButtonArea).find(":contains('" + that.localData.vttLang[siteLang].lang + "')").click()

                                    }


                                } else if (storageLang != 'none') {

                                    if (that.localData.vttLang[storageLang]) {
                                        $(captionButtonArea).find(":contains('" + storageLang + "')").click()
                                    }

                                }

                            } else {
                                that.disableTranscript()
                            }//end alternative caption

                            //that.setupPlayerHandlers();

                            // page.unbindPageHandlers(that.defineSelector(), that);
                            // page.assignPageHandlers(that.defineSelector(), that);

                            // page.assignPageHandlers('#transcript-tab-content', that);

                            if(typeof curPlaybackRate == 'number') {

                                videoPlayer.playbackRate(curPlaybackRate);
                            }

                            $(".vjs-menu-item").click(function () {

                                curPlaybackRate = videoPlayer.playbackRate();
                            });

                        });

                        //enable rewStop action
                        if(fastForwardDisabled == true &&  transcriptAlt == false) {

                            //allows users to seek backwards but not forwards.
                            var currentTime = 0;
                            var playerPaused = 0;

                            videoPlayer.on("seeking", function(event) {
                                if (currentTime < videoPlayer.currentTime()) {
                                    videoPlayer.currentTime(currentTime);
                                    $('input[rel="closeOk"]').off('click');
                                    showErrorWin(params.errorMsg ? params.errorMsg : 'Error message!');
                                }
                            });

                            setInterval(function() {
                                if(playerPaused){
                                    videoPlayer.pause();
                                }
                                if (!videoPlayer.paused()) {
                                    currentTime = videoPlayer.currentTime();
                                }
                            }, 1000);

                            //show error message
                            function showErrorWin(errorMsg) {

                                page.showAlert(errorMsg, true);
                                playerPaused = true;

                                $('input[rel="closeOk"]').on('click', function(event){

                                    $('body').removeAttr( 'style' );

                                    playerPaused = false;
                                    videoPlayer.play();
                                });
                            }
                        }



                        if(typeof volumeLevel == 'number') {

                            videoPlayer.volume(volumeLevel);
                        }

                        videoPlayer.on("volumechange", function () {

                            volumeLevel     = videoPlayer.volume();

                        });

                        that.setupPlayerHandlers();

                    }); //function
                }//end if type == "video"

                promise.resolve();

            }).fail(function (response) {

                promise.reject(response);
            });//loadSource


            return promise;
        };

        this.loadSource                 = function (courseID, lesson, params, extraApiRequestParameters, captionType) {

            var promise         = $.Deferred();

            this.localData.data = {};

            const that          = this;

            var userData        = undefined;

            var token           = typeof userData != 'undefined' && typeof userData.sessionId != 'undefined' ? userData.sessionId : null;

            var APIurl          = config.APIUrl;

            if(typeof params.lang == 'undefined' || !params.lang) params.lang = 'en'

            var APIresourceURL  = APIurl+"courses/0"+courseID+"/lessons/" + this.getLesson() + "/videos/0"+params.lang+"/";

            var  URLparams      = [];

            if(token != null) {
                URLparams[0]      = 'token=' + token;
            }


            if(typeof extraApiRequestParameters == 'object'){
                $.each(extraApiRequestParameters, function(k,v){
                    URLparams[URLparams.length] = k+'='+v;
                });
            }

            // the code below defines STUDENT ID depend on portal this code was called from
            if (typeof STUDENT_ID != 'undefined' && STUDENT_ID){
                // for StarGate portals
                URLparams[URLparams.length] = 'studentID='+STUDENT_ID;

            } else if(
                typeof _this != 'undefined' &&
                typeof _this.siteApi != 'undefined' &&
                typeof _this.siteApi.session != 'undefined' &&
                typeof _this.siteApi.session.email != 'undefined' &&
                _this.siteApi.session.email){
                // for US Site
                URLparams[URLparams.length] = 'studentID='+'kc-'+_this.siteApi.session.email;

            } else if(
                typeof SESSION != 'undefined' &&
                typeof SESSION._amember_id != 'undefined' &&
                SESSION._amember_id
            ){
                // for old portals
                URLparams[URLparams.length] = 'studentID='+SESSION._amember_id;
            }

            // prevent
            URLparams[URLparams.length] = '_='+new Date().getTime();

            if ( URLparams.length > 0 ){
                APIresourceURL += '?';

                for(var i=0;i<URLparams.length;i++){
                    APIresourceURL += URLparams[i];
                    if(URLparams[i+1]) APIresourceURL += '&';
                }

            }
            $.getJSON(APIresourceURL, function(data) {

                if (!data.response.link) {
                    promise.reject();
                    alert('error: bad video url');
                    return;
                }

                if (typeof data.response.link == "string") {

                    params['file'] = data.response.link;

                } else if (typeof data.response.link == "object") {

                    params['sources'] = [];

                    $.each(data.response.link, function (k, v) {
                        params['sources'][k] = {
                            file: v.file,
                            label: v.label,
                            default: (v.is_default ? true : false)
                        };
                        if(v.resolutions) {
                            params['sources'][k]['resolutions'] = v.resolutions;
                        }
                    });
                }

                if (typeof data.response.previewImage == "string" && typeof params['image'] !== 'undefined') {
                    params['image'] = data.response.previewImage;
                }

                if (typeof data.response.captions == "object" && !params['disableCaptions']) {
                    params['tracks'] = [];
                    $.each(data.response.captions, function (k, v) {
                        params['tracks'][k] = {
                            file: v.file,
                            label: v.label,
                            default: (v.is_default ? true : false),
                            kind: v.kind,
                            dir: v.label == 'ar' ? 'rtl' : 'ltr'
                        };
                    });

                }

                var aspectRatio;
                //var captionType         = params.captiontype ? params.captiontype : 'default'; //set type of captions: default | alternative

                if (data.response.link[0].videoAspectRatio != null) {
                    aspectRatio = data.response.link[0].videoAspectRatio;
                } else {
                    aspectRatio = "4:3";
                }
                var allTraks;

                if (captionType == 'alternative' && !params['disableCaptions']) {

                    if($( "style" ).hasClass( "vjs-text-track-display-st" )==false) {
                        $('head').append('<style class="vjs-text-track-display-st"> ::cue {opacity:0;} video::-webkit-media-text-track-container {opacity:0;} video::-webkit-media-text-track-background {opacity:0;} video::-webkit-media-text-track-display {opacity:0;} .vjs-text-track-display {display:none;} </style>');
                    }
                    // fix aspectRatio ERROR
                    if( aspectRatio == "4:3"){
                        $("style.course_vjs-dimensions.vjs-fluid").remove();
                        $('head').append('<style class="course_vjs-dimensions vjs-fluid">.course_vjs-dimensions.vjs-fluid{padding-top:75%}</style>');
                    }else{
                        $("style.course_vjs-dimensions.vjs-fluid").remove();
                        $('head').append('<style class="course_vjs-dimensions vjs-fluid">.course_vjs-dimensions.vjs-fluid{padding-top:56.25%}</style>');
                    }

                    var vttLang     = {};

                    $.each(params['tracks'], function (i, o) {
                        $.get(params['tracks'][i].file, function (data) {
                            vttLang[params['tracks'][i].label] = {
                                lang: params['tracks'][i].label,
                                data: that.parseVTT(data),
                                dir: params['tracks'][i].dir
                            };
                        });
                    });

                    allTraks        = that.renderTracks(params);

                } else {

                    allTraks        = that.renderTracks(params);
                }

                that.localData =    {
                    data:data,
                    allSources:     that.renderTwoSources(params),
                    allTraks:       allTraks,
                    aspectRatio:    aspectRatio,
                    vttLang:        vttLang
                };
                promise.resolve();

            }).fail(function(jqXHR, textStatus, error ) {

                let response        = $.parseJSON(jqXHR.responseText);

                if(typeof response['response'] !== 'undefined'
                    && typeof response['response']['message'] !== 'undefined') {

                    let message     = response['response']['message'];

                    if(message.match(/^TRAINING_LIMIT/i)) {
                        promise.reject({'status': 'error', 'error': 'TRAINING_LIMIT'});

                        // error handler
                        if(typeof that.playerHandlers['error'] === 'function') {
                            that.playerHandlers['error'].call(this, {'status': 'error', 'error': 'TRAINING_LIMIT'});
                        }

                        return;
                    }
                }

                promise.reject({'status': textStatus, 'response': response});
            });

            return promise;
        };

        /**
         * (TMP instead renderSources) for render two resolutions, while all lessons will be converted
         * @param params
         * @returns {string}
         */
        this.renderTwoSources       = function (params) {
            var allSources          = '';
            $.each(params['sources'], function (i, s) {

                var res720          = false;
                if(s.resolutions) {
                    $.each(s.resolutions, function (r, v) {
                        allSources += '<source src="'+ v +'" type="video/mp4" label="' + r + '" res="' + r + '" >';
                        res720      =  Number(r) == Number(720);
                    });
                    if(!res720) {
                        allSources += '<source src="'+ s.file +'" type="video/mp4" label="720" res="720" >';
                    }
                } else {
                    allSources += '<source src="'+ s.file +'" type="video/mp4" label="'+ s.label +'">';
                }
            });

            return allSources;
        };
        /**
         * Regular method for render sources
         * @param params
         * @returns {string}
         */
        this.renderSources          = function (params) {
            var allSources          = '';
            $.each(params['sources'], function (i, s) {

                if(s.resolutions) {
                    $.each(s.resolutions, function (r, v) {
                        allSources += '<source src="'+ v +'" type="video/mp4" label="' + r + '" res="' + r + '" >';
                    });
                } else {
                    allSources += '<source src="'+ s.file +'" type="video/mp4" label="'+ s.label +'">';
                }
            });

            return allSources;
        };

        this.renderTracks           = function (params) {

            var allTraks            = '';

            $.each(params['tracks'], function (i, o) {
                var p = params['tracks'][i];
                var tmpDefault = '';
                if (typeof defaultCaptionLang != 'undefined' && defaultCaptionLang == p.label) tmpDefault = " default ";
                allTraks += '<track crossorigin kind="' + p.kind + '" label="' + p.label + '" srclang="' + p.label + '" src="' + p.file + '"' + tmpDefault + '>';
            });

            return allTraks;

        };


        this.onPrev                 = function (node, event) {

            event.preventDefault();

            if(typeof this.playerHandlers['prev'] === 'function') {

                var handler         = this.playerHandlers['prev'];

                handler(this, event);
            }
        };

        this.onNext                 = function (node, event) {

            event.preventDefault();

            if(typeof this.playerHandlers['next'] === 'function') {

                var handler         = this.playerHandlers['next'];
                handler(this, event);
            }
        };

        this.onMove                 = function(node,event) {

            event.preventDefault();

            var timeTag            = $(node).attr('data-time');

            videoPlayer.currentTime(timeTag);
            videoPlayer.play();

        };

        this.parseVTT               = function(vttText){

            var vtt = vttText.split('WEBVTT');

            var items = vtt[1].split('\n\r');

            var vttFrases = [];
            var i = 0;
            $.each(items, function( index, value ) {
                var parts = items[index].split('\n');

                var partsFiltered = parts.filter(function(part) {

                    return part.length && isNaN(part);
                });


                if (partsFiltered.length <= 1) {
                    return true;
                }

                var time = partsFiltered[0].split(' --> ');

                if (time[1]) {

                    var timeAParse = time[0].split(':');
                    var timeA = (+timeAParse[0]) * 60 * 60 + (+timeAParse[1]) * 60 + (+timeAParse[2]);
                    var timeBParse = time[1].split(':');
                    var timeB = (+timeBParse[0]) * 60 * 60 + (+timeBParse[1]) * 60 + (+timeBParse[2]);

                    vttFrases[i] =
                    {
                        number: i,
                        timeA: timeA,
                        timeB:timeB,
                        text: partsFiltered[1] + (partsFiltered[2] ? '<br>' + partsFiltered[2] : '')
                    };

                    i++;

                }
            });

            return vttFrases;
        };

        this.enableTranscript       = function(transcriptAlt, fastForwardDisabled, captionsArray) {

            var that = this;

            if(transcriptAlt &&  !fastForwardDisabled && captionsArray.length) {

                var altTranscript = captionsArray.map(function(elem, i){
                    return '<a href="#!" id="phrase_'+i+'" data-handler="onMove"  data-time="'+elem.timeA+'">' +elem.text.replace('<br>', '') +'</a>';
                }).join(" ");

                $('#transcriptTab').css({
                    'visibility': 'visible'
                }).removeClass('hidden');

                 document.getElementById('transcript-tab-title').innerHTML = that.getLessonTitle();
                 document.getElementById('transcript-tab-content').innerHTML = altTranscript;
                 page.assignPageHandlers('#transcript-tab-content', that);

            }

        };

        this.disableTranscript      =   function() {
            $('#transcriptTab').css({
                'visibility': 'hidden'
            });

        };

        this.checkVisibility      =   function() {

            $(document).off('.visible');

            var visibilityHandler = function handleVisibilityChange() {
                if (hidden == 'hidden') {

                    videoPlayer.pause();
                }

            };

            $(window).on('blur.visible', document, visibilityHandler);

        };

        this.handleResize       = function(e){
            var lessonType = this.getLessonType()
            if(!lessonType)
                return false;

            if(lessonType == 'html') {
                try {
                    let s = this.sizeForHtmlPlayer();
                    htmlPlayer.resize(s.width, s.height)
                } catch (e) {
                    console.log('html player not ready to resize')
                }
            }
        };

        this.fixMiniPlayer = function (e) {

            if ($('div').hasClass('playing-view__panel') == true) {
                var offset = $('.playing-view__panel').offset();
                if (offset.top >= 100) {
                    if ($(document).scrollTop() > offset.top) {

                        var y_v_position = ($(document).scrollTop()+$(window).height())- ($(document).height() - $('#footer').height());
                        if(y_v_position >-10){
                            $('#courseVideoWrapper').attr('style', 'position:fixed; right:20px;bottom:'+(y_v_position+30)+'px; height: auto; min-height: 104px; width: 247.5px; z-index: 100; display: block !important;margin:0px;');
                        } else{
                            $('#courseVideoWrapper').attr('style', 'position:fixed; right:20px;bottom:20px; height: auto; min-height: 104px; width: 247.5px; z-index: 100; display: block !important;margin:0px;');
                        }

                        $('.course-video__arrow').hide();
                        if ($('#altcaption').css('display') !== 'none') {
                            $('#courseVideoEmbed,#courseVideoWrapper').attr('style', '');
                        } else {
                            $('#courseVideoEmbed').attr('style', '');
                        }
                    }
                }
            }
        };

        this.sizeForHtmlPlayer = function(){
            let width = $(this.defineSelector()).width();
            let height = (width / this.localData.aspectRatio.split(':')[0]) * this.localData.aspectRatio.split(':')[1] + 30;

            if($(window).width() < $(window).height()) {
                height = width * 1.5 - 40;
            }

            return {width: width, height:height, lang: page.getLanguage()}
        };

        this.dispose            = function() {
            //any cleanup that needs to happen, such as detach events
            try{videoPlayer.stop()      }catch(e){}
            try{videoPlayer.dispose()   }catch(e){}
            try{htmlPlayer.dispose()    }catch(e){}
            try{$(window).off('resize', this.handleResizeRef)}catch(e){}
        };

        this.getCurrentPlayer            = function() {

            return  videoPlayer;
        };

        //***Player constructor ***//
        this.handleResizeRef = function(e) {that.handleResize(e)}
        //setup resize event and keep reference for dispose
        $(window).resize(this.handleResizeRef);

    }
