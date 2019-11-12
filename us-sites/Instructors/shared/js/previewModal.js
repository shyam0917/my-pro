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
    this.show                   = function (id, course_id, link) {

        const that              = this;
        var lng = 'en';
        return $.when(this.getjsonContent(id, lng ) ).then( function( resp ) {
            that.getLangs().done(function ( languages ) {

              resp.langs = that.parseLangs(resp.langs, languages);
              var html = '<div id="previewModal" class="modal modal--preview preview--course">'+

                  '<a class="modal__close modal_close">x</a>'+
                  '<div class="modal_flex">'+
                      '<div class="content content_courses">'+
                          '<div class="course-video__preview" id="courseVideoEmbed"></div>'+
                      '</div>'+
                      '<div class="preview-sidebar">'+
                          '<div class="library-item__header">'+
                            '<a class="modal_close">'+
                                '  <span class="library-item__title">'+
                                          resp.title+
                                  '</span>'+
                              '</a>'+
                          '</div>'+

                          '<div class="preview-course-details">'+
                              '<div class="preview-course-information">'+
                              '<div class="library-item__caption">'+
                                    '  <div class="library-item__icon">'+
                                          '<i class="icon icon-author"></i>'+
                                      '</div>'+
                                      '<span class="library-item__value">'+
                                          resp.author+
                                      '</span>'+
                                  '</div>'+
                                  '<div class="library-item__caption">'+
                                      '<div class="library-item__icon">'+
                                          '<i class="icon icon-runtime"></i>'+
                                      '</div>'+
                                      '<span class="library-item__value">'+
                                          resp.trt+
                                      '</span>'+
                                  '</div>'+
                                  '<div class="library-item__caption">'+
                                      '<div class="library-item__icon">'+
                                          '<i class="icon icon-lessons"></i>'+
                                      '</div>'+
                                      '<span class="library-item__value">'+
                                          resp.totallessons+
                                      '</span>'+
                                  '</div>'+
                                  '<div class="library-item__caption">'+
                                      '<div class="library-item__icon">'+
                                          '<i class="fa fa-globe fa-lg"></i>'+
                                      '</div>'+
                                      '<span class="library-item__value">'+
                                          resp.langs+
                                      '</span>'+
                                  '</div>'+
                              '</div>'+
                              '<div class="library-item__description">'+
                                  resp.description+
                              '</div>'+
                          '</div>'+
                    '  </div>'+
                '  </div>'+
              '</div>';
              $('#mContainer').append(html);
              that.showModal();
              that.renderPlayer(id, course_id,link);
            }).then( function(resp){
            });

        });
    };

    // the getJavaScriptObjectNotationContent function
    this.getjsonContent              = function ( id, lng ) {
      var prom  = $.Deferred();
      var url  = config['CDNPortal']+'opencontent/courses/details/'+id+'_'+lng+'--v' + Date.now() + '.json';

      $.ajax({
        url: url ,
        cache: false,
        dataType: "json"
      }).done( function ( resp ){

        resp.langs = resp.langs.filter( function (index) {
           if(index != 'ar'){
             return index;
           }
        });
        prom.resolve(resp);
      }).fail( function(r) {
        console.log(r)
      });
      return prom;
    };
    this.getLangs                   = function () {
      var prom = $.Deferred();
      $.getJSON( 'https://staticcontent.knowledgecity.com/json/langs.json',function(lng) {
        prom.resolve(lng);
      });
      return prom;
    };
    this.parseLangs             = function (codes, alllngs) {
        var dataCodes = alllngs.map( function( dataCode ) { return dataCode.codeISO6391 });

        var listedLangs = codes.map( function ( code ) {

              var index = dataCodes.indexOf(code);

              if (~index) {
                  return alllngs[index].native;
              }
        }).join(', ');
        return listedLangs;

    };
    this.showModal              = function () {

        this.modalWindow        = new ModalWindow({
                modalID:        this.defineSelector(),
                top:            100,
                overlay:        0.4,
                closeButton:    closeSelector,
                onOpen: function() {



                },
                onClose: function() {

                    $(that.defineSelector()).remove();
                    delete localStorage.captionLang;
                }

            });

        return this.modalWindow.show();
    };

    this.renderPlayer       = function(course, lesson, link) {

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
            captions: ['en','es'],
            _extend: 'captions'

        };

        //player.setPlayerHandlers(actions);
        var result               = player.show(course, lesson, 'courseVideoEmbed', params, extra);

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
