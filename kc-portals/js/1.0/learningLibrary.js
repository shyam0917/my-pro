;define(['lib/FormPage', 'lib/CallGet', 'ui/ModalWindow', 'ui/PreviewModal', 'owl'], function(FormPage, CallGet, ModalWindow, PreviewModal){

    function learningLibrary() {

        FormPage.call(this);

        const that                  = this;
        
        this.position               = -1;
        this.to                     = 0;
        var needed_libraries;

        this.getClassName           = function () {
            return 'learningLibrary';
        };

        this.defineContent          = function () {

            $.when (this.outContentPromise, this.loadStylesPromise).done(() => {
                this.renderClientsCarousel();
                this.changeHeroCarousel(); 
                // this.setHandlers();
            });

            return $.when( 
                this.getPageMui(),
                this.getCoursesPreviewsData(),
                this.getClientsData(),
                this.defineCategoriesData(),
                this.getCustomLibraries()
            ).then( (mui, courses, clients, libraries) => {
                $.extend( mui, courses );
                $.extend( mui, {'clients': clients} );
                let list_libraries = this.handleLibraries(libraries.sections, mui.library);
                $.extend( mui, list_libraries );
                let data = mui;
                this.setContentData(data);  
            });
        };

        this.defineSelector     = function () {

            return '#contactUs';
        };
        this.getCustomLibraries        = function () {
            return $.get(this.config.pathTemplate + '/json/libraries--v'+this.config.LocalStorageStamp+'.json', libs => {
                needed_libraries = libs
                return libs;
            }).fail(() => {
                return false;
            });
        };
        this.handleLibraries           = function ( libraries, names ) {

            if( typeof libraries == 'undefined' ) return false;

            var list_libraries = [];
            libraries.map( (library) => {
                if(typeof needed_libraries[library.class] != 'undefined') {
                    var sectionTitle = (library.class == 'banking') ? "tabfinanceTitle" : 'tab'+library.class+'Title';
                    var list = (library.class == 'banking') ? 'list_finance' : 'list_'+library.class;
                    list_libraries[list]  =  this.getListCategories(library.categories_0, library.class, names[library.class]);
                    list_libraries[sectionTitle]  =  library.name;
                }
            });
            return list_libraries;
        };
        this.getListCategories         = function ( categories, name_class, names ) {
            var listCategories = [];
            var pos = 0;
            categories.map( ( category ) => {

                let library = deepInObject(needed_libraries, [name_class, category.ceid].join('.'));

                if(library){
                    let categoryName = deepInObject(names, library.class);

                    listCategories[library.position] = {
                        name : categoryName,
                        url : category.url,
                        class: library.class
                    };
                    pos++;

                }
            });
            return listCategories;
        };
        this.getCoursesPreviewsData    = function () {

            let prom = $.Deferred();

            $.get(this.config.pathTemplate + '/json/'+this.getLanguage()+'-learninglibrary--v'+this.config.LocalStorageStamp+'.json',
                res => {    
                    prom.resolve(that.handleCoursesPreviewsData(res));
                }).fail(() => {
                    prom.resolve({});
                });
                // .asCached().asLocalCached());


            return prom;

        };

        this.handleCoursesPreviewsData  = function (previews) {

            return {
                    complianceCourses : this.buildCoursesPreview(previews.compliance),
                    businessCourses   : this.buildCoursesPreview(previews.business),
                    computerCourses   : this.buildCoursesPreview(previews.computer),
                    financeCourses    : this.buildCoursesPreview(previews.finance),
                    safetyCourses     : this.buildCoursesPreview(previews.safety)
                }

        };


        this.buildCoursesPreview = function (preview) {

            if(!preview || !preview.length) return false;

            return preview.map(course => {

                return {
                    title:course.course_title,
                    url: this.generateNewUrl('library/' + course.course_id + '/' + this.rewriteTitletoUrl(course.course_title)),
                    course_id: course.course_id,
                    lesson_id: course.firstLesson_guid,
                    preview: {
                        path:       this.config.CDNContent + 'previews/',
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

        this.defineEmailType    = function () {

            return 'portals/' + this.getPortalName() + '/contact_us';
        };

        this.setHandlers                = function () {
            $('#defaultOpen').trigger('click');
        };

        this.onChangeHeroContent        = function ( node, event ) {
            $('.hero-slider-wrapper').removeClass('active');
            var wrapper = $(node).data('wrapper');
            var prev =  $('.inner-hero--learningLibrary').data('actual');
            if(typeof prev != 'undefined' && prev != '')
            $('.inner-hero--learningLibrary').toggleClass(prev);

            $('.inner-hero--learningLibrary').addClass(wrapper);
            $('.inner-hero--learningLibrary').data('actual', wrapper );

            $('#hero-'+wrapper).toggleClass('active');
            $('.header-selector').removeClass('active');
            $(node).toggleClass('active');
            this.position = $(node).index();
            $('ul.dot-wrapper li').removeClass('active');
            $('ul.dot-wrapper').children().eq(this.position).addClass('active');
            
        };
        this.onDotClick                 = function (node, event) {
            if( this.to != 0 ) {
                window.clearTimeout(this.to);
            }
            this.position = $(node).parent().index();
            $('.ll-hero-library-images').children().eq(this.position).trigger('click');
            $('ul.dot-wrapper li').removeClass('active');
            $(node).parent().addClass('active')
            this.to = setTimeout(function () {
                that.changeHeroCarousel();
            }, 15000);
        }
        this.changeHeroCarousel         = function () {
            if( this.to != 0 ) {
                clearTimeout(this.to);
            }
            this.to = setTimeout(function () {
                var current = that.position;
                if ( current < 0 ) {
                    var last =  $('.inner-hero--learningLibrary').data('actual');
                    if( typeof last != 'undefined' && last != '' ) {
                        that.resetHeaderCarousel();
                    } else {
                        that.position ++;
                        $('.ll-hero-library-images').children().eq(that.position).trigger('click');
                        
                    }
                } else {
                    that.position ++;
                    if( that.position < $('.ll-hero-library-images').children().length ) {
                        $('.ll-hero-library-images').children().eq(that.position).trigger('click');
                    } else {
                        that.position = -1;
                    }
                }
                that.changeHeroCarousel();
            }, 15000);
        };

        this.resetHeaderCarousel        = function () {
            var last =  $('.inner-hero--learningLibrary').data('actual');
            $('.inner-hero--learningLibrary').removeClass(last);
            $('a[data-wrapper="'+last+'"]').removeClass('active');
            $('#hero-'+last).removeClass('active');
            $('#start').addClass('active');
            $('.inner-hero--learningLibrary').data('actual', '');
            $('ul.dot-wrapper li').removeClass('active');
        };

        this.getClientsData             = function () {
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

        this.handleClientsData          = function (clients) {

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
        this.renderClientsCarousel = () => {

            const target = '#clientsCarousel';
        
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
                    1000 : {
                        items: 6
                    }
                }
            });
        };

        this.onPrevClients = function() {
            $('#clientsCarousel').trigger('prev.owl.carousel');
        };

        this.onNextClients = function() {
            $('#clientsCarousel').trigger('next.owl.carousel');
        };

        this.onOpenTab       = function (node, event) {
            // Declare all variables

            var i, tabcontent, tablinks;
            var  libCategory = $(node).data('library')
            // Get all elements with class="tabcontent" and hide them
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }

            // Get all elements with class="tablinks" and remove the class "active"
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }

            // Show the current tab, and add an "active" class to the button that opened the tab
            document.getElementById(libCategory).style.display = "block";
            event.currentTarget.className += " active";

        }

    }
    learningLibrary.prototype               = Object.create(FormPage.prototype);
    learningLibrary.prototype.constructor   = learningLibrary;

    return learningLibrary;
});