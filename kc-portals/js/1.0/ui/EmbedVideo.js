
    function EmbedVideo(page,node) {

        const that              = this;
        var data                    = {};
        var template                = node.html();
        var targetId                = node.attr('id');

        if( node.hasClass('cloned') ) {
            targetId += ".cloned";
        }

        var lang                    = ( page.getLanguage() != 'en' && page.getLanguage() != 'es') ? 'en' : page.getLanguage();
        this.videoResource = false;
        this.ccResource = false;
        this.muted      = false;

        this.player                = function () {

            var cc =  this.ccResource ? '<track crossorigin="" kind="captions" label="es" srclang="es" src="//fileshare.knowledgecity.com/vids/lms/es/welcome/welcome.vtt">' : '';
            var videoJsPlayerhtml = '<video crossdomain crossorigin="anonymous" id="welcome_video" class="video-js vjs-default-skin video-static video-permanent-bar" controls preload="auto" ';
            if( this.muted ) {
                videoJsPlayerhtml += 'muted ';
            }
                videoJsPlayerhtml += 'width="100%">' +
                '<source src="'+this.videoResource+'" type="video/mp4">' + cc +
                '</video>';


            $('#' + targetId).find('#modal__text').html(videoJsPlayerhtml);

            var player;

            $('head').append( '<style> ::cue {opacity:0;} video::-webkit-media-text-track-container {opacity:0;} video::-webkit-media-text-track-background {opacity:0;} video::-webkit-media-text-track-display {opacity:0;} .vjs-text-track-display {display:none;} </style>' );

            return $.when(this.defineData()).then(function ( ) {

                var captionsArray = {
                    lang: 'es',
                    data: data.captions,
                    dir: 'ltr'
                };

                player = videojs(document.getElementById('welcome_video'), {
                    'autoplay': true,
                    'controls': true,
                    aspectRatio: '16:9',
                    playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

                });

                player.on('play', function(){

                    $('#welcome_video .vjs-captions-button .vjs-selected').removeClass('vjs-selected');
                    if( lang == 'en' ) {
                        $('#welcome_video .vjs-captions-button').find(":contains('captions off')").click();
                    } else {
                        $('#welcome_video .vjs-captions-button').find(":contains('" + lang + "')").click();
                    }
                });
                player.on("timeupdate", function(){
                    var now = player.currentTime();
                    if (that.ccResource) {
                        var text = "", cap = "", number = "";
                        for (var i = 0, len = captionsArray.data.length; i < len; i++) {

                            cap = captionsArray.data[i];
                            if (now >= cap.timeA && now <= cap.timeB)
                            {
                                text = cap.text;
                                number = i;
                                break;
                            }
                        }

                        document.getElementById('altcaption2').innerHTML = '<span class="cuealt">'+text+'</span>';
                    }
                });

                var displayAlt = (lang != 'en') ? 'block': 'none';

                $('.vjs-control-bar').addClass('video-permanent-bar');

                var outputBlock = document.createElement('div');
                outputBlock.id = 'altcaption2';
                outputBlock.className = 'altcaption';
                outputBlock.style["display"] = displayAlt;
                document.getElementById('welcome_video').appendChild(outputBlock);

                $(document).ready(function(){
                    $('#welcome_video .video-js, #welcome_video .vjs-tech').removeClass('video-bar-caption');
                    $('#welcome_video .vjs-captions-button ul').on("click", function(event) {

                        var targetCaptionLang = event.target.firstChild.nodeValue;

                        if(targetCaptionLang == 'captions off'){

                            document.getElementById('altcaption2').style.display = 'none';


                            $('#welcome_video .video-js, #main-about-video .vjs-tech').addClass('video-only-bar');
                            $('#welcome_video .video-js, #main-about-video .vjs-tech').removeClass('video-bar-caption');


                        } else {

                            document.getElementById('altcaption2').style.display = 'block';
                            document.getElementById('altcaption2').style.direction = captionsArray.dir;

                            $('#welcome_video .video-js, #welcome_video .vjs-tech').removeClass('video-only-bar');
                            $('#welcome_video .video-js, #welcome_video .vjs-tech').addClass('video-bar-caption');

                        }


                    });

                    player.play();
                })

            });

        };

        this.preview                = function() {

            var that = this;

            return $.when(page.outContentPromise, page.loadStylesPromise).then(function () {
                page.renderTo(template, page.getMainData(), '#' + targetId);
                that.setHandlers();

            });

        };



        this.setHandlers            = function () {

            page.assignPageHandlers('#' + targetId, this);

        };

        this.onPlayVideo            = function() {

            this.player();

        };

        this.defineData             = function () {

            if( this.ccResource ) {
                return $.get(this.ccResource, function (captions) {
                    that.buildData(captions);
                });
            } else {
                data = {
                    captions: {}
                }
                return $.Deferred().resolve({});
            }

        };

        this.buildData              = function (captions) {

            data = {
                captions: this.parseVTT(captions)
            }

        };

        this.parseVTT               = function(vttText){

            var vtt = vttText.split('WEBVTT');

            var items = vtt[1].split('\n\n');

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

    }
