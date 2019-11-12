;define(['jquery', 'lib/FormPage', 'lib/CallGet', 'owl', 'ui/player', 'videoplayer'],
    function($, FormPage, CallGet, owlCarousel, Player, videojs){

    function Index() {

        FormPage.call(this);

        var clientsData  = null;
        var page         = this;
        let data         = {};
        this.position    = -1;
        this.to          =  0;

        this.getClassName           = function () {
            return 'Index';
        };

        this.defineContent          = function() {

            this.outContentPromise.done(() => {
                this.setHandlers();
                this.runTestimonials();
            });

            return $.when(
                this.getFeaturedData(),
                this.getPageMui(),
                this.getClientsData(),
                this.isCountryAllowed(),
                this.getStudentsWithCertificates(),
                this.getBenefitsIcons(),
                this.getTestimonialData()
            ).then((
                featured,
                mui,
                clients,
                isCountryAllowed,
                certificates,
                benefitsIcons,
                testimonial
            ) => {

                let data = Object.assign(
                    mui,
                    featured,
                    {'benefits': this.handleBenefitsData(mui.benefits)},
                    {clients},
                    {certificates},
                    {'testimonials': testimonial},
                    {'isCountryAllowed': isCountryAllowed},
                    {'congrats': this.config.isShowCongrats}
                );
                $.extend( data, benefitsIcons );

                this.setContentData(data);
                this.renderPreviewsCarousel(data);
                this.renderClientsCarousel();
                this.renderBenefitsCarousel();
                this.renderAltIEBenefits();


            }).then(() => {
                this.renderCongratsCarousel();
            });


        };

        this.getBenefitsIcons   = () => {

            let prom =  $.Deferred();
            var benefits = {};

            benefits['isBrandingSettings'] = true;
            if(!this.checkBrandingSettings()) benefits['isBrandingSettings'] = false;
            if(typeof this.config.portal.colorScheme !== 'undefined' && this.config.portal.colorScheme.main_benefits_customIcons) benefits['isBrandingSettings'] = false;

            if( benefits['isBrandingSettings'] ) {
                var cnf  = this.config;
                var clrs = cnf.portal.colorScheme;
                var cls1 = '';
                var cls2 = '';

                if( typeof clrs !="undefined" &&
                    typeof clrs.main_benefits_icon_background_color !="undefined" &&
                    typeof clrs.main_benefits_icon_color !="undefined"
                ) {
                    cls1 = clrs.main_benefits_icon_color;
                    cls2 = clrs.main_benefits_icon_background_color;
                }
                benefits['benefit1'] = cnf.pathTemplate+"/images/benefit-1.svg?cls1="+cls1+"&cls2="+cls2;
                benefits['benefit2'] = cnf.pathTemplate+"/images/benefit-2.svg?cls1="+cls1+"&cls2="+cls2;
                benefits['benefit3'] = cnf.pathTemplate+"/images/benefit-3.svg?cls1="+cls1+"&cls2="+cls2;
                benefits['benefit4'] = cnf.pathTemplate+"/images/benefit-4.svg?cls1="+cls1+"&cls2="+cls2;
                benefits['benefit5'] = cnf.pathTemplate+"/images/benefit-5.svg?cls1="+cls1+"&cls2="+cls2;
                benefits['benefit6'] = cnf.pathTemplate+"/images/benefit-6.svg?cls1="+cls1+"&cls2="+cls2;
            }
            prom.resolve(benefits)
            return prom;
        };

        this.checkBrandingSettings = () => {
            var ptl = page.config.portal;
            return ptl.template == 'template01' && ( typeof ptl.disableBrandingSettings == 'undefined' || ptl.disableBrandingSettings ==  false );
        };

        this.getTestimonialData = () => {
            let prom = $.Deferred();
            if(this.getPortalName() == 'www' ) {
                $.get( this.config.pathTemplate+'/json/'+this.getLanguage()+'-testimonials--v'+this.config.LocalStorageStamp+'.json', testimonials => {
                    if( typeof testimonials === 'string' ) {
                        testimonials = $.parseJSON( testimonials );
                    }
                    prom.resolve( this.handleTestimonialData( testimonials ) );
                }).fail(() => {
                    prom.resolve({});
                });
            }
            else {
                prom.resolve({});
            }
            return prom;
        };

        this.handleTestimonialData = testimonials => {

            return testimonials.map( testimonial  => {

                var img_arr = testimonial.image.split('.');
                testimonial.image = this.config.pathTemplate + '/images/clients/testimonials/'+img_arr[0]+'--v'+ this.config.LocalStorageStamp +'.'+img_arr[1];

                // testimonial.image = this.config.pathTemplate + '/images/clients/testimonials/'+testimonial.image;

                return testimonial;
            });
        };

        this.runTestimonials = () => {
            if( this.to != 0 ) {
                clearTimeout(this.to);
            }
            this.to = setInterval( function () {

                var activo = $( '.dot-wrapper' ).find( '.activo' );
                var position = activo.parent().index();
                $( '.dot-wrapper' ).find( '.dot.slideshow-dot' ).removeClass( 'activo' );
                if( activo.length > 0 ) {
                    if( position < $( '.dot-wrapper' ).children().length-1 ) {
                        position++;
                        $( '.dot-wrapper' ).children( '.full-slide-wrapper ').eq( position ).find( '.dot.slideshow-dot' ).addClass( 'activo' );
                    } else {
                        $( '.dot-wrapper' ).children().first().find( '.dot.slideshow-dot' ).addClass( 'activo' );
                    }
                } else {
                    $( '.dot-wrapper' ).children().first().find( '.dot.slideshow-dot' ).addClass( 'activo' );
                }
            }, 15000 );
            $( '.dot.slideshow-dot' ).off( 'click' ).on( 'click', function () {
                $( '.dot-wrapper' ).find( '.dot.slideshow-dot' ).removeClass( 'activo' );
                $(this).addClass( 'activo' );
            });
        };

        this.getClientsData = () => {
            let prom = $.Deferred();

            $.get(this.config.pathTemplate + '/json/clients--v'+this.config.LocalStorageStamp+'.json',

                clients => {


                    if (typeof  clients === 'string') {

                        clients =  $.parseJSON(clients);
                    }

                    prom.resolve(this.handleClientsData(clients))
                }).fail(() => {
                    prom.resolve({});
                });

            return prom;

        };

        this.handleClientsData = clients => {

            return clients.map(client => {

                let data = {
                    logo: `${this.getMainData().IMG}clients/logos/${client.name}${!client.company || typeof client.company === 'undefined' ? '' : '-' + this.getLanguage()}--v${this.config.LocalStorageStamp}.png`,

                };

                if(client.company){
                    data.name   = client.company[page.getLanguage()];
                    data.height = 50;
                }

                if (client.title) {
                    data.title = typeof client.title === 'string' ? client.title : client.title[this.getLanguage()]
                }

                return data;

            });

        };

        this.renderAltIEBenefits = function () { // fix for IE
            $.when(this.outContentPromise).then(() => {
                if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/)) || (typeof $.browser !== "undefined" && $.browser.msie == 1)) {
                    $('.index-benefit__back').addClass('hidden');
                    $('.index-benefit').addClass('index-benefit-alt').removeClass('index-benefit');
                    $('.index-benefit__inner').addClass('index-benefit__inner-alt');
                    $('.index-benefit__front').addClass('index-benefit__front-alt');
                    $('.index-benefit__inner-alt')
                        .on('mouseover', function (events) {
                            $(this).find('.index-benefit__front').addClass('hidden');
                            $(this).find('.index-benefit__back').removeClass('hidden');
                            $(this).find('.index-benefit__back').addClass('index-benefit__back-alt');
                        })
                        .on('mouseleave', function (event) {
                            $(this).find('.index-benefit__front').removeClass('hidden');
                            $(this).find('.index-benefit__back').addClass('hidden');
                            $(this).find('.index-benefit__back').removeClass('index-benefit__back-alt');
                        });
                }
            });
        };

        this.renderClientsCarousel = () => {

            const target = '#clientsCarousel';

            $.when(this.outContentPromise, this.loadStylesPromise).then(() => {

                $(target).owlCarousel({
                    loop: true,
                    margin: 20,
                    speed: 1500,
                    dots: true,
                    slideBy: 'page',
                    responsive: {
                        0:{
                            items: 2
                        },
                        400: {
                            items: 3
                        },
                        700: {
                            items: 5
                        },
                        1150 : {
                            items: 6
                        }
                    }
                });

            });
        };

        this.renderBenefitsCarousel = () => {
            const target = '#benefitsCarousel';
            $.when(this.outContentPromise, this.loadStylesPromise).then(() => {
                $(target).owlCarousel({
                    loop: true,
                    margin: 20,
                    speed: 1500,
                    dots: false,
                    slideBy: 'page',
                    items: 1,
                    responsive: {
                        0:{
                            items:1
                        },
                        480: {
                            items: 2
                        }
                    }
                });

            });
        };

        this.handleBenefitsData = benefits => {

            if (!benefits || !benefits.length) return [];

            const ROW_LENGTH = 4;

            return benefits.map((benefit, i) => {

                benefit.index = i;

                return benefit;

            }).reduce((newArray, benefit, i, array) => {

                if (i < newArray.length * ROW_LENGTH) return newArray;

                newArray.push({row: array.slice(i, i + ROW_LENGTH )});

                return newArray;

            }, []);


        };

        this.handleFeaturedData  = (featured) => {
            const coursesNav = false;
            let cLength = featured.courses.length;
            if( cLength > 3 ){ this.coursesNav = true; }
            return {
                featuredCategories: this.buildFeaturedCategories(featured.categories),
                featuredCoursesShow: !!(featured.courses && featured.courses.length),
                featuredCoursesNav: this.coursesNav,
                featuredCourses: this.buildFeaturedCourses( featured.courses )
            }
        };

        this.buildFeaturedCourses = (featured) => {
            if(!featured || !featured.length) return false;
            return featured.map(course => {
                return {
                    title:course.course_title,
                    url: this.generateNewUrl('library/' + course.course_id + '/' + page.rewriteTitletoUrl(course.course_title)),
                    course_id: course.course_id,
                    lesson_id: course.firstLesson_guid,
                    preview: {
                        path:       page.config.CDNContent + 'previews/',
                        src:        course['course_id'] + '/400.jpg',
                        src2x:      course['course_id'] + '/800.jpg',
                        sources: [
                            {
                                maxWidth:   395,
                                src:        course['course_id'] + '/400.jpg',
                                src2x:      course['course_id'] + '/800.jpg'
                            },
                            {
                                maxWidth:   600,
                                src:        course['course_id'] + '/640.jpg',
                                src2x:      course['course_id'] + '/1280.jpg'
                            }
                        ]
                    },
                    runtime: this.formatSecondsToHrs(course.trt),
                    lesson_type: course.introType || 'video'
                }
            });
        };

        this.buildFeaturedCategories = (featured) => {

            const that = this;
            if (!featured || !featured.length) return false;

            let template = 'default';

            // css flexbox row items order
            let totalCat = featured.length;
            let maxItemClass = ''; let lastItem = ''; let rowsize = '';
            let maxVal5 = ''; let maxVal4 = '';
            if( totalCat >= 5 ){ maxVal5 = ( 5 * parseInt( totalCat / 5 ) ); }
            if( totalCat >= 4 ){ maxVal4 = ( 4 * parseInt( totalCat / 4 ) ); }
            if( totalCat <= 3 ){ rowsize = 'one-row'; }
            let c = 1;

            let library = featured.map(section => {
              if( totalCat <= 3 ){
                maxItemClass = 'three-per-row';
              } else {
                lastItem = '';
                let flag5 = false; let flag4 = false; let flag3 = false;
                if( totalCat <= 10 ){
                  if( totalCat % 5 == 0 ){
                    flag5 = true;
                    maxItemClass = 'five-per-row';
                    if( c % 5 == 0 ){ lastItem = 'last-item'; }
                  } else if( totalCat % 4 == 0 ){
                    flag4 = true;
                    if( !flag5 ){ maxItemClass = 'four-per-row'; }
                    if( c % 4 == 0 ){ lastItem = 'last-item'; }
                  } else if( totalCat % 3 == 0 && totalCat < 9 ){
                    if( !flag5 && !flag4 ){
                      flag3 = true;
                      maxItemClass = 'three-per-row';
                      if( c % 3 == 0 ){ lastItem = 'last-item'; }
                    }
                  } else {
                    if( !flag5 && !flag4 && !flag3 ){
                      if( totalCat < 10 ){
                        if( totalCat == 7 ){
                          maxItemClass = 'four-per-row';
                          if( c > maxVal4 ){ maxItemClass = 'three-per-row'; }
                          if( c % 4 == 0 || c == 7 ){ lastItem = 'last-item'; }
                        }
                        if( totalCat == 9 ){
                          maxItemClass = 'five-per-row';
                          if( c > maxVal5 ){ maxItemClass = 'four-per-row'; }
                          if( c % 5 == 0 || c == 9 ){ lastItem = 'last-item'; }
                        }
                      } else {
                        maxItemClass = 'five-per-row';
                        if( c % 5 == 0 ){ lastItem = 'last-item'; }
                      }
                    }
                  }
                } else {
                  maxItemClass = 'five-per-row';
                  if( c % 5 == 0 ){ lastItem = 'last-item'; }
                }
              }
              c++;

              if(!section.ceid) {
                that.appLocation.topCategories.map(topCat => {
                  if(section.jsonFileName == topCat.json_filename) {
                      section.ceid =  topCat.id;
                  }
                });
              }

              let catImg = typeof section.categoryImage !== 'undefined' && typeof section.categoryImage == 'string' ?
                  `${this.getMainData().CDN_PORTAL}/assets/images/categories/${this.getLanguage()}/${section.categoryImage}` :
                  `${this.getMainData().IMG}featured/${section.jsonFileName}.jpg`;

              let defaultImg = `${this.getMainData().IMG}featured/default.jpg`;

              catImg = this.addRVTnumber(catImg);
              return {
                  img : catImg,
                  defaultImg : defaultImg,
                  title: section.title,
                  url: this.generateNewUrl('library/' + section.ceid + '/' + section.jsonFileName),
                  slug : section.slug,
                  rowcss: maxItemClass,
                  lastItemRow: lastItem,
                  categories: (section.children && section.children.length) ? section.children.map(category => {

                      // fix main page icon
                      var icon = this.config.pathTemplate + '/images/noimage--v'+this.config.LocalStorageStamp+'.png';
                      try {
                          var cat_icon = JSON.parse(category.imgFiles);
                          if(typeof cat_icon.catAppIcon!=='undefined'){
                              if(cat_icon.catAppIcon!=='0') {
                                  icon = this.config.CDNPortal + 'opencontent/portals/' + this.config.portalID + '/assets/images/categories/' + category.id + '/app/icon/' + this.addRVTnumber(cat_icon.catAppIcon);
                                  icon = this.addRVTnumber(icon);
                              }
                          }
                      } catch (e) {
                          //err
                      }
                      return {
                          title  : category.title,
                          url    : this.generateNewUrl('library/' + category.ceid + '/' + section.jsonFileName + '/' + category.slug),
                          icon   : icon,
                          slug   : category.slug,
                      }
                  }) : []
              };

            });

            if (library.length >4 && this.config['portalName']=='saibacademy') {
                template = 'tiles5';
            }

            switch(template) {
                case 'tiles5':

                    let main,
                        odd = [],
                        even = [];

                    library.forEach(function(section, i){

                        if (i === 0) {

                            main = section;

                        } else if ( i % 2 === 1) {

                            odd.push(section)

                        } else {

                            even.push(section)

                        }

                    });

                    return {
                        'tiles5': {
                            'library': [
                                {main: main},
                                {group: {sections: odd}},
                                {group: {sections: even}}
                            ]
                        }
                    };

                    break;
                default:
                    return {
                        default: {
                            library: library
                        },
                        rowsize: rowsize
                    };
                    break;
            }

        };

        this.getFeaturedData =  () => {

            let prom = $.Deferred();

            this.remoteCall(new CallGet('portal/static/json/featured/' + this.getLanguage() + this.rvtVal(), {}, (res) => {

                    $.when(this.defineCategoriesData()).then(() => {

                        prom.resolve(this.handleFeaturedData(res))

                    });

                })
                .defineErrorHandler(function (query, status) {

                    prom.resolve({});

                })
                .asCached().asLocalCached());


            return prom;

        };

        this.getStudentsWithCertificates = () => {

            let prom = $.Deferred();
                if (!this.config.portal.isShowCongrats) {
                    prom.reject({});
                }
                else{
                this.remoteCall(new CallGet('portals/0' + this.config.portalID + '/stats/public/certifications' +'?_limit=' + this.config.portal.openCertificates + '&lang=' + page.appLocation.urlParts.pageLanguage , {}, (res) => {
                    if(typeof res.response != 'object' || res.response.length < 1)
                        prom.resolve({});
                    else
                        prom.resolve(res);

                    })
                    .defineErrorHandler(function (query, status) {
                        prom.reject({});
                    })
                    .asCached().asLocalCached());
                     return prom;
                   }

        };

        this.renderPreviewsCarousel = (data) => {

            const infoCourses =  data.featuredCourses;
            const totalCourses = infoCourses.length;
            let loopFlag = false;
            let navFlag = false;
            let autoplayFlag = false;
            let previewFlag = false;
            if( totalCourses > 3 ){
              loopFlag = true; navFlag = true; autoplayFlag = true; previewFlag = true;
            }

            const target = '#previewsCarousel';

            $.when(this.outContentPromise, this.loadStylesPromise).then(() => {

                $(target).owlCarousel({
                    loop: loopFlag,
                    nav: navFlag,
                    center: false,
                    slideBy: 'page',
                    autoplay: autoplayFlag,
                    autoWidth: false,
                    responsiveRefreshRate: 50,
                    responsive:{
                        0:{
                            items:1
                        },
                        600:{
                            items:3
                        },
                        900:{
                            items:3
                        }
                    },
                });

            });

            if( previewFlag ){
              this.onPrevPreview = () => {
                  $(target).trigger('prev.owl.carousel');
              };
              this.onNextPreview = () => {
                  $(target).trigger('next.owl.carousel');
              };
            }
        };

        this.renderCongratsCarousel = () => {
            const target = '#congratsCarousel';
            $.when(this.outContentPromise, this.loadStylesPromise).then(() => {
              $(target).owlCarousel({
                loop: true,
                nav: false,
                center: false,
                slideBy: 'page',
                autoplay: true,
                autoWidth: false,
                responsiveRefreshRate: 50,
                responsive:{
                  0:{
                      items:1
                  },
                  600:{
                      items:2
                  },
                  900:{
                      items:3
                  },
                  1101:{
                      items:4
                  }
                },
              });
            });
            this.onPrevCert = () => {$(target).trigger('prev.owl.carousel')};
            this.onNextCert = () => {$(target).trigger('next.owl.carousel');};
        };

        this.ctrlClients    = function (node) {

            var component           = new ClientsList(this,node);
            component.slider();

        };

        this.onPrevClients = function() {
            $('#clientsCarousel').trigger('prev.owl.carousel');
        };

        this.onNextClients = function() {
            $('#clientsCarousel').trigger('next.owl.carousel');
        };

        this.onPrevBenefits = function() {
            $('#benefitsCarousel').trigger('prev.owl.carousel');
        };

        this.onNextBenefits = function() {
            $('#benefitsCarousel').trigger('next.owl.carousel');
        };

        this.defineSelector = function () {
            return '#contactUs';
        };

        this.defineEmailType    = function () {

            return 'portals/' + this.getPortalName() + '/contact_form';
        };

        this.ctrlAboutVideo     = function(node) {


            var component           = new EmbedVideo(page,node);

            component.preview();

            //component.player();

            return true;

        };

        function EmbedVideo(page,node) {

            var data                    = {};
            var template                = node.html();
            var targetId                = node.attr('id');


            this.player                = function () {

                var videoJsPlayerhtml = '<video crossdomain crossorigin="anonymous" id="about_video" class="video-js vjs-default-skin video-static video-permanent-bar" controls preload="auto" width="100%">' +
                    '<source src="https://fileshare.knowledgecity.com/opencontent/introvideos/knowledgecity/en/About_Us_Open_Doors.mp4" type="video/mp4">' +
                    '<track crossorigin="" kind="captions" label="ar" srclang="ar" src="//fileshare.knowledgecity.com/opencontent/introvideos/knowledgecity/captions/About_Us_Open_Doors/About_Us_Open_Doors_ar.vtt">' +
                    '</video>';


                $('#' + targetId).html(videoJsPlayerhtml);

                var player;

                $('head').append( '<style> ::cue {opacity:0;} video::-webkit-media-text-track-container {opacity:0;} video::-webkit-media-text-track-background {opacity:0;} video::-webkit-media-text-track-display {opacity:0;} .vjs-text-track-display {display:none;} </style>' );

                $.when(this.defineData()).then(function () {

                    var captionsArray = {
                        lang: 'ar',
                        data: data.captions,
                        dir: 'rtl'
                    };

                    player = videojs(document.getElementById('about_video'), {
                        'autoplay': false,
                        'controls': true,
                        aspectRatio: '16:9',
                        playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

                    });

                    player.on('play', function(){

                        $('#main-about-video .vjs-captions-button .vjs-selected').removeClass('vjs-selected');
                        $('#main-about-video .vjs-captions-button').find(":contains('ar')").click();
                    });
                    player.on("timeupdate", function(){
                        var now = player.currentTime();
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
                    });

                    var displayAlt = 'block';

                    $('.vjs-control-bar').addClass('video-permanent-bar');

                    var outputBlock = document.createElement('div');
                    outputBlock.id = 'altcaption2';
                    outputBlock.className = 'altcaption';
                    outputBlock.style["display"] = displayAlt;
                    document.getElementById('about_video').appendChild(outputBlock);

                    $(document).ready(function(){
                        $('#main-about-video .video-js, #main-about-video .vjs-tech').removeClass('video-bar-caption');
                        $('#main-about-video .vjs-captions-button ul').on("click", function(event) {

                            var targetCaptionLang = event.target.firstChild.nodeValue;

                            if(targetCaptionLang == 'captions off'){

                                document.getElementById('altcaption2').style.display = 'none';


                                $('#main-about-video .video-js, #main-about-video .vjs-tech').addClass('video-only-bar');
                                $('#main-about-video .video-js, #main-about-video .vjs-tech').removeClass('video-bar-caption');


                            } else {

                                document.getElementById('altcaption2').style.display = 'block';
                                document.getElementById('altcaption2').style.direction = captionsArray.dir;

                                $('#main-about-video .video-js, #main-about-video .vjs-tech').removeClass('video-only-bar');
                                $('#main-about-video .video-js, #main-about-video .vjs-tech').addClass('video-bar-caption');

                            }


                        });

                        player.play()
                    })

                });

            };

            this.preview                = function() {

                var that = this;

                $.when(page.outContentPromise, page.loadStylesPromise).then(function () {
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

                const that              = this;

                return   $.get('https://fileshare.knowledgecity.com/opencontent/introvideos/knowledgecity/captions/About_Us_Open_Doors/About_Us_Open_Doors_ar.vtt',
                    function (captions) {

                        that.buildData(captions);

                    });

            };

            this.buildData              = function (captions) {

                data = {
                    captions: this.parseVTT(captions)
                }

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

        }

        this.ctrlCongrats     = function(node) {

            var component       = new Congrats(this, node);

            component.carousel();

            return true;
        };

        function ClientsList(page,node) {

            var data                    = {};
            var template                = node.html();
            var targetId                = node.attr('id'),
                deferreds               = [];


            this.slider                = function () {

                const that              = this;

                $.when(
                    this.defineData(), page.outMainPromise, page.loadStylesPromise
                ).then(
                    function(){

                        $.when.apply(null, deferreds).then(function(){

                            //that.sliderRender()

                        });


                    }



                );
            };

            this.defineData             = function () {

                var that = this;

                return $.get(page.config.pathTemplate + '/json/clients--v'+page.config.LocalStorageStamp+'.json',
                    function (clients) {

                        return that.buildData(clients);

                    });

            };

            this.buildData              = function (clients) {

                var that = this,
                    maxHeight = 50,
                    maxWidth  = 140;

                data  = {'clients': []};

                clients.forEach(function(client){

                    client.logo = page.config.pathTemplate + '/images/clients/logos/' + client.name + '-' + page.getLanguage() + '--v' + page.config.LocalStorageStamp + '.png';
                    client.name = client.company[page.getLanguage()];

                    deferreds.push(function(){

                        var deferred = $.Deferred();
                        var img = new Image();
                        img.onload = function() {

                            var oldHeight = img.height,
                                oldWidth = img.width,
                                ratio = maxHeight/oldHeight;

                            if (oldWidth*ratio > maxWidth) {
                                ratio = maxWidth/oldWidth;
                            }

                            client.width = oldWidth * ratio;
                            client.height = oldHeight * ratio;

                            data.clients.push(client);

                            deferred.resolve();
                        };
                        img.src = client.logo;
                        return deferred.promise();

                    }())

                });



            };

            this.sliderRender          = function () {

                page.renderTo(template, $.extend(data, page.getMainData()), '#' + targetId);

                this.setHandlers();

            };

            this.setHandlers            = function () {

                var carouselId  =   $('#clientsCarousel');

                carouselId.owlCarousel({
                    loop: true,
                    nav: false,
                    center: false,
                    dots: false,
                    slideBy: 7,
                    autoplay: true,
                    autoWidth: false,
                    responsiveRefreshRate: 50,

                    responsive:{
                        0:{
                            items:2
                        },
                        500:{
                            items:3
                        },
                        700:{
                            items:4
                        },
                        900:{
                            items:5
                        },
                        1000:{
                            items:7
                        }
                    }

                });

            };

        }

        function Congrats(page,node) {

            let data                    = {},
                template                = node.html(),
                targetId                = node.attr('id'),
                carousel                = node.data('carousel');

            this.carousel               = () => {

                $.when(this.defineData(), page.outMainPromise, page.loadStylesPromise).then(() => {
                    this.carouselRender();
                });

            };

            this.defineData             = function () {

                data = {
                    'congrats': [
                        {
                            "name": "Qasem Abdulmajid Ali Abu Almakarim",
                            "group": "Integration Services Section",
                            "event_date": "2017-01-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulelah  Abahussain",
                            "group": "Business Technology Division - Mgmt.",
                            "event_date": "2017-01-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Elyani",
                            "group": "Al Jubail Branch",
                            "event_date": "2017-01-16",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Waleed Al-Osaimi",
                            "group": "Al Murabba Branch - CB",
                            "event_date": "2017-01-16",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah Al-Hajri",
                            "group": "Zahrat Al Badeah Branch",
                            "event_date": "2017-01-16",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Riyadh  Abdullah Mohammed Al-Fahad",
                            "group": "Operations Division - Mgmt.",
                            "event_date": "2017-01-15",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Khaled Al-Haidari",
                            "group": "Al Falah Branch, Jeddah",
                            "event_date": "2017-01-15",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulaziz Al-Sayari",
                            "group": "Corporate Finance Dept.",
                            "event_date": "2017-01-15",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Rami Al-Zahrani",
                            "group": "Operations Division - Mgmt.",
                            "event_date": "2017-01-14",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Rayan Mohammed Sanad Al-Qurashi Al-Qurashi",
                            "group": "Al Sharae Branch, Makkah",
                            "event_date": "2017-01-13",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ali Mutair",
                            "group": "Al Sharae Branch, Makkah",
                            "event_date": "2017-01-13",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah Al-Thunaian",
                            "group": "Al Mubarrez Branch",
                            "event_date": "2017-01-13",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mahdi Al-Saud",
                            "group": "CB Customer Services - CR",
                            "event_date": "2017-01-12",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah Al-Sharikh",
                            "group": "Multinationals - Central Region",
                            "event_date": "2017-01-12",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Irshad Jamadar",
                            "group": "Business Technology Division - Mgmt.",
                            "event_date": "2017-01-12",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ibraheem Al-Geidib",
                            "group": "Al Dilam Branch",
                            "event_date": "2017-01-11",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Eyad Fakhhji",
                            "group": "Uhud Branch, Al Madinah",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Bashayer Al-Sabaan",
                            "group": "Tele-Sales Unit",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Kelany",
                            "group": "Al Oraija Branch",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Husain Al-Aswad",
                            "group": "Al Shifa Branch",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Basem Hakmi",
                            "group": "Al Shifa Branch",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Salah Alsiahi",
                            "group": "Al Shifa Branch",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "ٍSaad Al-Dossary",
                            "group": "Al Shifa Branch",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saeid Al-Malki",
                            "group": "Al Murabba Branch",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ghadah Al-Ajlan",
                            "group": "Product Mgmt. Section",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Dania  Fahad Kalil Eraqi",
                            "group": "Corporate Banking Division - Mgmt.",
                            "event_date": "2017-01-09",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ziyad Al-Barrak",
                            "group": "Cash Mgmt. Sales Section",
                            "event_date": "2017-01-08",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Nojod  Salman Saad Al-Abdan",
                            "group": "Corporate Banking Division - Mgmt.",
                            "event_date": "2017-01-08",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Rashood Al-Qwaizani",
                            "group": "Al Dilam Branch",
                            "event_date": "2017-01-08",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Fahad  Saud Abdulaziz Al-Harrah",
                            "group": "Legal Dept. - Head Office",
                            "event_date": "2017-01-08",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saad Al-Rabiah",
                            "group": "Al Rayyan Branch, Riyadh - CB",
                            "event_date": "2017-01-08",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Faisal Al-Juraywi",
                            "group": "Emerging Enterprises Unit - CR",
                            "event_date": "2017-01-07",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Deema Ahmed Suliman Al-Dawood aldawood",
                            "group": "Loan Processing Section",
                            "event_date": "2017-01-07",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Zaid Al-Dosary",
                            "group": "Qaryat Al Olaya Branch",
                            "event_date": "2017-01-05",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Thamer Bu Saleh",
                            "group": "Multinationals - Central Region",
                            "event_date": "2017-01-05",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Alyah Shamsan",
                            "group": "Corporate Finance Dept.",
                            "event_date": "2017-01-05",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-qurashi",
                            "group": "Financial Planning & Reporting Dept.",
                            "event_date": "2017-01-05",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mashhoor Al-Homied",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2017-01-05",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Hana Al-Mandeel",
                            "group": "Loan Processing Section",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Omran Moammar",
                            "group": "Al Thoqba Branch",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saeed Al- Zahrani",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "adnan Bashrahel",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "hasan dahistani",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Amro Abulela",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Jawaher Al-Modhe",
                            "group": "Emerging Enterprises Credit Review Section",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Sultan Al-Turkistani",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2017-01-04",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "ILham Al-Fouaim",
                            "group": "Compliance Dept.",
                            "event_date": "2017-01-03",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mustafa Siraj",
                            "group": "Khamis Mushait Branch - CB",
                            "event_date": "2017-01-02",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Sajjad Al-Mutawwa",
                            "group": "Al Qatif Branch",
                            "event_date": "2017-01-02",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ahmed Abdullah Monawer Al-Damiri aldamiri",
                            "group": "Sakaka Branch",
                            "event_date": "2017-01-02",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ebtihal Al-Baqshi",
                            "group": "Al Manizlah Branch, Al Hofuf - Ladies",
                            "event_date": "2016-12-31",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Omar Al-Ahwal",
                            "group": "Al Marwa Branch, Jeddah",
                            "event_date": "2016-12-31",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulsattar Sharif",
                            "group": "Regional Office - Central Region",
                            "event_date": "2016-12-31",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Sadiq Al-Sadiq",
                            "group": "Al Jubail Branch",
                            "event_date": "2016-12-31",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Faisal",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2016-12-30",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Nayef Alsaqri",
                            "group": "South Ring Road Branch, Riyadh",
                            "event_date": "2016-12-30",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Salah Al-Nahdi",
                            "group": "Sharourah Branch",
                            "event_date": "2016-12-30",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Khamis Al-Enazi",
                            "group": "Tabuk Branch",
                            "event_date": "2016-12-29",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ali Al-Amri",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2016-12-29",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Bander Al-Saywed",
                            "group": "Al Basateen Branch, Jeddah",
                            "event_date": "2016-12-29",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Otaibi",
                            "group": "Al Dawadmi Branch",
                            "event_date": "2016-12-29",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saad Al-Odidan",
                            "group": "Al Ghat Branch",
                            "event_date": "2016-12-29",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Hala Al Shammari",
                            "group": "Riyad Capital",
                            "event_date": "2016-12-29",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Faeze Al-Rbaei",
                            "group": "Quba Branch",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah  Al-Onazi",
                            "group": "Haql Branch",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Zaid Yahia Saad Al-Junaidi aljunaidi",
                            "group": "Sakaka Branch",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saleh Al-Huwaiti",
                            "group": "Tabuk Branch",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Hattan Shinkar",
                            "group": "Prince Fahd St. Branch, Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ali Al-Alnahi",
                            "group": "Al Tahliah St. Branch, Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Yaser Al-Ghamdi",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Hussain Shteiwi Al Salem",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulwahab Hendi",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Arwa Bakshs",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Asrar Hariri",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Samaher Khwsefan",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Shadi Ismail",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Turki Al-Sehaly",
                            "group": "Al Khafji Branch",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Rawan  Al-Amr",
                            "group": "Solutions Delivery Section - Portals & Applications",
                            "event_date": "2016-12-28",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulrahman Fahad Arif Al-Fagairi Al-Fagairi",
                            "group": "ATM, Cash & Clearing Unit - Tabuk",
                            "event_date": "2016-12-27",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Khadegah Al-Balhareth",
                            "group": "CB Customer Services - Loan Processing Section",
                            "event_date": "2016-12-27",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah Alusain Alhasan Khawaji Khawaji",
                            "group": "ATM, Cash & Clearing Unit - Jazan",
                            "event_date": "2016-12-26",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Bin Saleem",
                            "group": "Al Dilam Branch",
                            "event_date": "2016-12-26",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ali Mohammed Ali Al-Fawal alfawal",
                            "group": "ATM, Cash & Clearing Unit - Tabuk",
                            "event_date": "2016-12-26",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ehab Al-Bakri",
                            "group": "Product Mgmt. Section",
                            "event_date": "2016-12-26",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ahmad Al-Sakran",
                            "group": "Al Zulfi Branch",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saleh Al-Fanod",
                            "group": "Al Murabba Branch",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Manar Al-Saedan",
                            "group": "CB Customer Services - Loan Processing Section",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Obaidullah Al-Hazmi",
                            "group": "Al Ahsa St. Branch",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Nuwaysir",
                            "group": "Al Rayyan Branch, Riyadh",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saad Al-Somih",
                            "group": "Al Marwah Branch, Riyadh",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Atheer  Abdullah Hamad Al-Hussain",
                            "group": "Corporate Banking Division - Mgmt.",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ghaida Abdulaziz Turki  Al-Turki",
                            "group": "Trade Finance Section - Central Region",
                            "event_date": "2016-12-25",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Abdullah Matug Attar Attar ",
                            "group": "Otaibiya Branch",
                            "event_date": "2016-12-24",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Manal Al-Zahrani",
                            "group": "Credit Cards Products Unit",
                            "event_date": "2016-12-24",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Halaa Al-Amri",
                            "group": "Sales & Channel Mgmt. Dept. - Mgmt.",
                            "event_date": "2016-12-24",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Almaha Essa Saad Al-Essa AL ESSA",
                            "group": "Loan Processing Section",
                            "event_date": "2016-12-24",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mashael Al-Lemie",
                            "group": "CB Customer Services - Loan Processing Section",
                            "event_date": "2016-12-24",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mishal Al-Shari",
                            "group": "Khoras Branch",
                            "event_date": "2016-12-24",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Hassan Hamid Hassan Al-Barghani Al-Barghani",
                            "group": "Riyad Bank",
                            "event_date": "2016-12-23",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulrahman Al-Kurdi",
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-23",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Salem Balkair",
                            "group": "Regional Office - Central Region",
                            "event_date": "2016-12-23",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulrahman Al-Mutairi",
                            "group": "Al Hijaz Road Branch",
                            "event_date": "2016-12-23",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saleh Al-Shammari",
                            "group": "Al Mazrouiyah Branch, Dammam - CB",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Bander Dagriri",
                            "group": "Jeddah Main Branch - CB",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Muhammad Ali  Khokhar",
                            "group": "Corporate Finance Dept.",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Majed Al-Shehri",
                            "group": "Musaidia Branch - CB",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulelah Al-Dossary",
                            "group": "CB Customer Services - ER",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Fahad Omar Mohammed Abu Talib Abu Talib",
                            "group": "Trade Finance Section - Central Region",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ehab Bahmishan",
                            "group": "Jeddah Main Branch - CB",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Tarshun",
                            "group": "Al Tahliah St. Branch, Jeddah - CB",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mamdouh Al-Shehri",
                            "group": "Musaidia Branch - CB",
                            "event_date": "2016-12-22",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Fahad Bahsan",
                            "group": "Musaidia Branch - CB",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Hani Bakhs",
                            "group": "Musaidia Branch - CB",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Sarah Al-Molla",
                            "group": "CB Customer Services - Loan Processing Section",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Khaled Al-Qarni",
                            "group": "Musaidia Branch - CB",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammad AlSaadi",
                            "group": "CB Customer Services - ER",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulaziz Al-Qahtant",
                            "group": "CB Customer Services - ER",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "waleed Alsemaidaa",
                            "group": "Trade Finance Section - Central Region",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Ghonaim",
                            "group": "Trade Finance Section - Central Region",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abbas Alwasibee",
                            "group": "CB Customer Services - ER",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mana Al-Onazi",
                            "group": "The Corporate Office",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Yaseen Al-Sayed",
                            "group": "Musaidia Branch - CB",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Fahad  Abdullah Saleh Al-Qahtani",
                            "group": "Internal Audit Dept.",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Husam Al-Suliman",
                            "group": "Information Security Dept.",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Salman  Saleh Salem Al-Hadrami",
                            "group": "Operations Division - Mgmt.",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Afnan Mohammed Abdullah Al-Faadhel Al-Faadhel",
                            "group": "Information Security Dept.",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mubin Khan",
                            "group": "Information Security Dept.",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Danayh Manshi",
                            "group": "Private Banking Center - CR",
                            "event_date": "2016-12-21",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah Al-Rashed",
                            "group": "BI & Analytics Section",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ghufran Al-Olwani",
                            "group": "Yanbu Industrial Branch - CB",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ammar Matbolee",
                            "group": "Al Tahliah St. Branch, Jeddah - CB",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Talal Zahrani",
                            "group": "Jeddah Main Branch - CB",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Bandar Al-Hajri",
                            "group": "Al Murabba Branch",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Nora Sayed",
                            "group": "Solutions Delivery Section - Portals & Applications",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": null,
                            "group": "Private Banking Center - Jeddah",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed  Saleh Abdulqader Abujamil",
                            "group": "Operations Division - Mgmt.",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ahmed Gharwi",
                            "group": "Business Data Mgmt. Section",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Essa",
                            "group": "Credit Control Dept. - Mgmt.",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ibrahim Al-Hilal",
                            "group": "Regional Office - Eastern Region",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Amera Al-Ghamdi",
                            "group": "Credit Process Control Section",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Lina Al-Zouman",
                            "group": "BI & Analytics Section",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Faisal Al-Otaibi",
                            "group": "Al Rayyan Branch, Riyadh",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Ahmed",
                            "group": "CFR & Special Assets Mgmt. Section",
                            "event_date": "2016-12-20",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Shatha Al-Dohaim",
                            "group": "Executive Mgmt. - RC",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulhadi Al-Sharid",
                            "group": "Al Sadah Branch, Riyadh",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mousa Al-Rashidi",
                            "group": "Al Kharj Branch",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah Al-Obeidi",
                            "group": "Al Kharj Branch",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Anand Srivastav",
                            "group": "Information Security Dept.",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saad Al-Dawood",
                            "group": "Al Kharj Branch",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Jawad  Al-Doukhi",
                            "group": "Information Security Dept.",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Adil Belhouari",
                            "group": "BI & Analytics Section",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Amany  Khalid Younes Barakat",
                            "group": "Office of SEVP-CRO",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Laith Tarazi",
                            "group": "BT PMO",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Arjani",
                            "group": "Al Kharj Branch",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdulaziz Al-Omyri",
                            "group": "Al Kharj Branch",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdurhman Al-Hagbani",
                            "group": "Al Kharj Branch",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Marwan Salamah",
                            "group": "Cunsumer Finance Products Unit",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Abudujaln",
                            "group": "Al Kharj Branch",
                            "event_date": "2016-12-19",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Ramzi Al-Zain",
                            "group": "Emerging Enterprises Unit - ER",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saleh Al-Rayhan",
                            "group": "Al Raeed Branch",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Bader  Al-Atawi",
                            "group": "Halat Ammar Office",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Khalid Al-Nahdi",
                            "group": "Al Montazahat Branch",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Adil Aziz",
                            "group": "Information Security Dept.",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Rashed",
                            "group": "Auto Leasing Center - Qassim",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Salah",
                            "group": "Corporate Banking - Central Region",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Franco Daniel Dadua",
                            "group": "BI & Analytics Section",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Driss  Maachouk",
                            "group": "Al Sowaidi Branch",
                            "event_date": "2016-12-18",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Tareq Faran",
                            "group": "Business Process Mgmt Office BPM",
                            "event_date": "2016-12-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saad Al-Ghowainim",
                            "group": "Al Maged St. Branch, Al Hofuf",
                            "event_date": "2016-12-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mansour Al-Jutayli",
                            "group": "Emerging Enterprises Unit - CR",
                            "event_date": "2016-12-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Basakran",
                            "group": "Al Sadah Branch, Riyadh",
                            "event_date": "2016-12-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Waleed Al-Mutairi",
                            "group": "South Ring Road Branch, Riyadh",
                            "event_date": "2016-12-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Saddam Al-Mubarak",
                            "group": "Al Aziziah Branch, Riyadh",
                            "event_date": "2016-12-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Hamad Bin Selaih",
                            "group": "CB Customer Services - CR",
                            "event_date": "2016-12-17",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Shroog Fhaid Ali Al-Subeai ??????? ",
                            "group": "Branch Support Operations Section",
                            "event_date": "2016-12-16",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammad Al-Hussein",
                            "group": "Ehssa Mall Branch",
                            "event_date": "2016-12-16",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Amjad Mohammed Ibrahim Al-Oraini Al oraini",
                            "group": "Loan Processing Section",
                            "event_date": "2016-12-16",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Abdullah Ali Radah Al-Sharif al-sharif",
                            "group": "Riyad Bank",
                            "event_date": "2016-12-15",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Mohammed Al-Wadei",
                            "group": "Khamis Mushait Branch",
                            "event_date": "2016-12-15",
                            "event_type": "completed_mandatory"
                        },
                        {
                            "name": "Talal Alrabah",
                            "group": "Branch Support Operations Section",
                            "event_date": "2016-12-15",
                            "event_type": "completed_mandatory"
                        }
                    ]
                };

            };

            this.carouselRender          = function () {

                page.renderTo(template, $.extend(data, page.getMainData()), '#' + targetId);
                this.setHandlers();
            };

              this.setHandlers = function () {
                $('#' + carousel).owlCarousel({
                  loop: true,
                  nav: false,
                  center: false,
                  slideBy: 4,
                  autoplay: true,
                  autoWidth: false,
                  responsiveRefreshRate: 50,
                  dots: false,
                  margin: 10,
                  responsive: {
                    0: {items: 1},
                    768: {items: 2},
                    1024: {items: 3},
                    1280: {items: 4}
                  },
                  onInitialized: function () {
                    var maxHeight = 0;
                    $('[data-name]').each(function () {
                      if ($(this).height() > maxHeight) {
                        maxHeight = $(this).height();
                      }
                    });
                    $('[data-name]').height(maxHeight);
                  }
                });
                page.assignPageHandlers('#' + targetId, this);
              };

            this.onPrev = function() {
                $('#' + carousel).trigger('prev.owl.carousel');
            };

            this.onNext = function() {
                $('#' + carousel).trigger('next.owl.carousel');
            };

        }


    }

    Index.prototype               = Object.create(FormPage.prototype);
    Index.prototype.constructor   = Index;

    return Index;
});
