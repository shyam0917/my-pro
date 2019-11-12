;define(['jquery', 'ui/ModalWindow', 'ui/player', 'videoplayer'], function ($, ModalWindow, Player, videojs) {

    /**
     *
     * @param {Page} page
     * @param {{}=} node
     * @constructor
     */
    function PreviewModal(page, node) {
        const that                  = this;
        let data                    = {};

        var closeSelector           = '.modal_close';
        var player = new Player(page);

        this.modalWindow            = null;

        /**
         * Selector for this node
         *
         * @return {String}
         */
        this.defineSelector         = function () {

            var selector            = $(node).attr('href');

            if(typeof selector === 'undefined' || selector.substring(0, 1) !== '#') {
                selector            = '#previewModal';
            }

            return selector;
        };

        /**
         *
         * @return {Promise}
         */
        this.show                   = function (id, course_id, link, altCaptionConfig = false ) {

            const that              = this;
           //force modalWindow init() to append #leanOverlay and #mContainer to body before generating preview modal
            that.showModal(true);

            $.when(page.loadTemplate('ui/previewModal'), that.getLangs())
                .done(function (html) {

                var mainData = page.getMainData();
                var lng = page.appLocation.urlParts.pageLanguage;

                if( mainData.site.language == 'en' ){ mainData.ltr = true; }
                $.getJSON( page.config['CDNPortal']+'opencontent/courses/details/'+id+'_'+lng+'.json', function( resp ) {

                    resp.langs = that.parseLangs(resp.langs);
                    var newUrlParts                 = {
                            courseTitle:    page.rewriteTitletoUrl( resp.title ),
                            contentCacheId: resp.ceid,
                            pageController: 'courses'
                        };
                    resp.url  = page.appLocation.buildURL(newUrlParts),
                    mainData.courseData  = resp;
                    page.renderTo(html[0], mainData, page.APPEND_TO_BODY);
                    page.assignPageHandlers(that.defineSelector(), that);
                    that.setHandlers();
                    that.showModal();
                    that.renderPlayer(id, course_id,link, altCaptionConfig);

                }).fail( function(){

                    page.renderTo(html[0], mainData, page.APPEND_TO_BODY);
                    page.assignPageHandlers(that.defineSelector(), that);
                    that.setHandlers();
                    that.showModal();
                    that.renderPlayer(id, course_id,link, altCaptionConfig);

                });

            });
        };
        this.getLangs                   = function () {

            return $.ajax({
                cache: true,
                url: page.config.basePath + 'json/langs--v' + page.config.LocalStorageStamp + '.json',
                dataType: "json",
                success: function(res) {
                    return $.extend(data, {'langs': res});
                }
            });
        };
        this.parseLangs             = function (codes) {

            let dataCodes = data.langs.map((dataCode) =>dataCode.codeISO6391);

            return codes.filter((code) => ~page.config.languages.indexOf(code)).map(function (code) {

                let index = dataCodes.indexOf(code);

                if (~index) {
                    return data.langs[index].native;
                }


            }).join(', ');

        };

        this.showModal              = function (initModalContainer) {

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

            if (initModalContainer == true)
              return this.modalWindow.init();
            else
              return this.modalWindow.show();
        };

        this.renderPlayer       = function(course, lesson, link, altCaptionConfig = false ) {

            if (course === 'howitworks') {

                let playerId = 'howvideo';

                const videoJsPlayerhtml =
                    '<video crossdomain crossorigin="anonymous" id="'+ playerId +'" class="video-js vjs-default-skin video-static video-permanent-bar" controls preload="auto" width="100%" autoplay="true">' +
                    '<source src="' + lesson +'" type="video/mp4">' +
                    '</video>';

                $('#courseVideoEmbed').html(videoJsPlayerhtml);

                let player = videojs(document.getElementById(playerId), {
                    autoplay: true,
                    controls: true,
                    aspectRatio: '16:9'
                });

                return;
            }

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
                captions: page.getLanguages(),
                _extend: 'captions'

            };

            //player.setPlayerHandlers(actions);
            var result               = player.show(course, lesson, 'courseVideoEmbed', params, extra, altCaptionConfig);

            //if lesson (preview) closed then go to course
            result.fail(function () {
                window.history.pushState({}, '', link || '/');
                location.reload();
            });

        };

        /**
         * The method setup additional input handlers
         */
        this.setHandlers            = function () {


        };

        this.showProgressOverlay    = function () {

            $(this.defineSelector()).find(".progressOverlay").removeClass('hidden');
        };

        this.hideProgressOverlay    = function () {

            $(this.defineSelector()).find(".progressOverlay").addClass('hidden');
        };


    }

    return PreviewModal;
});
