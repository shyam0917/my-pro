;define(['jquery', 'lib/Page', 'lib/SendForm', 'lib/CallGet', 'lib/CallPost', 'select2', 'ui/ModalWindow', 'ui/PreviewModal', 'owl', 'ui/player', 'videoplayer', 'validate'],
  function( $, Page, SendForm, CallGet, CallPost, select2, ModalWindow, PreviewModal, owlCarousel, Player, videojs ){

    // ['jquery', 'lib/Page', 'lib/CallGet', 'owl', 'ui/player', 'videoplayer', 'jquery.ccValidator', 'jquery.inputmask', 'select2'],
    // $, Page, CallGet, owlCarousel, Player, videojs

    function EmployeeTraining() {

        Page.call(this);

        const that            = this;
        var clientsData       = null;
        this.url              = '';
        this.blacklist 				= [];
        this.isThankPage      = false;
        this.companySizeLabel = '';
        this.id;
        this.data;
        this.content;
        this.mui;

        this.getClassName                     = function () {
            return 'EmployeeTraining';
        };

        this.defineContent                    = function () {

          // After rendering the page
          $.when( this.outContentPromise ).done(() => {
            that.renderClientsCarousel();
            that.setHeaderContent();
            that.setScripts();
            that.setOfflineConversionTracking();
          });

          // Getting the mui content/ main page data
          return $.when( this.getMui(), this.getPageMui(), this.getCoursesContent() ).then( function ( mui, pageMui ) {

              var data = that.content;

              // Adding the page MUI elements to the main MUI data
              $.extend( mui, pageMui );
              that.mui = mui;

              return $.when(
                that.getHeaderCourse(),
                that.getFeaturedCourses(),
                that.getClients(),
                that.handleBenefits(),
                that.getBlackList()
              ).then( ( headerCourse, courses, clients, benefits, bl ) => {

                // Adding additional values for the data object
                $.extend( data, courses );
                $.extend( data, {
                  "mui"                : mui,
                  "headerCourse"       : headerCourse,
                  "benefits"           : benefits,
                  "clients"            : clients,
                  "isThankyouPage"     : that.isThankPage,
                  "template"           : that.config.pathTemplate,
                  "isEmployeeTraining" : true
                });

                that.mui.portalTitle = that.mui.pageTitle;

                // Additional values for the setScripts function
                this.blacklist        = bl;
                this.companySizeLabel = mui.companySize;

                // If there's additional content for the 'landing-content-wrapper' block
                if( typeof data.additionalContentFlag != "undefined" ){
                  var aC = that.handleAdditionalContent( data.additionalContentOrder );
                  $.extend( data, aC );
                }

                // Rendering the page
                that.setContentData( data );
              });
          });
        };

        this.getMainUrl                       = function () {
          var arr_url = window.location.href.split('/');
          var pos = arr_url.indexOf(this.basePath);
          arr_url = $.grep(arr_url, function (value) {
           if( value.lastIndexOf("thankyou.html") >= 0 ) {
             that.isThankPage = true;
             return false
           }
           return value != "";
          })
          arr_url = arr_url.slice(pos);
          var arr_get = arr_url.join('/').toLowerCase().split('?');
          this.url = arr_get[0];

          return this.url;
        };

        // Returns the main Landing page data
        this.getCoursesContent                = function () {
          var prom  = $.Deferred();
          var url   = this.getMainUrl();
          $.get( this.config.pathTemplate + '/json/employee-training-'+this.getLanguage()+'--v'+this.config.LocalStorageStamp+'.json', content => {
              if( typeof content === 'string' ){ content = $.parseJSON( content ); }
              this.content = content;
              prom.resolve( content );
          }).fail(() => {
              prom.resolve({});
          });
          return prom;
        }

        // Returns the email servers blacklist
        this.getBlackList                     = function () {
					var prom = $.Deferred();
					$.get( this.config.pathTemplate +'/json/emailcompanyblacklist--v'+this.config.LocalStorageStamp+'.json', blacklist => {
						that.blacklist = blacklist;
            prom.resolve( blacklist );
          }).fail(() => {
            prom.resolve({});
          });
          return prom;
				};

        // Returns the main course that would be placed at the top of the page
        this.getHeaderCourse                  = function () {
          var prom = $.Deferred();
          var courses = {};
          if(typeof this.content.isHeaderCourse != 'undefined' && this.content.isHeaderCourse != false ) {
            var response = that.content.headerCourse;
            if( typeof response == 'string' ) response = $.parseJSON(res);
            courses = response.courses.map( function ( course ) {
              var featCourse = {
                  title: course.course_title,
                  url: that.generateNewUrl('library/' + course.course_id + '/' + that.rewriteTitletoUrl(course.course_title)),
                  course_id: course.course_id,
                  lesson_id: course.firstLesson_guid,
                  preview: {
                      path:       'https://cdn0.knowledgecity.com/opencontent/courses/previews/',
                      src:        course['course_id'] + '/1280.jpg',
                  },
                  runtime: that.formatSecondsToHrs(course.trt),
                  lesson_type: course.introType || 'video'
              }
              var retcourse = '<div class="preview-item">'+
                  '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" target="_blank" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" class="preview-item__href" data-handler="onOpenPreview">'+
                              '<picture class="course-video__preview-img">';
              //The img path is fixed atm
              retcourse += '<img src="'+that.config.pathTemplate+'/images/employee-training/CoursePreview.jpg" alt=""/>'+
                              '</picture>'+
                  '</a>'+
                '</div>';
              return retcourse;
            });
            prom.resolve( courses );
          } else {
            prom.resolve( courses );
          }
          return prom;
        };

        // Returns all featured courses that should be promoted in the landing page
        this.getFeaturedCourses               = function () {
          var prom = $.Deferred();
          var featuredCourses = {};

          if( typeof this.content.featuredCourses != 'undefined' ) {
            var response = this.content.featuredCourses;
            if( typeof response == 'string' ) response = $.parseJSON(res);
            if( typeof this.content.isMultipleCategories && this.content.isMultipleCategories == true ) {
              featuredCourses = this.getMultipleCategoriesCourses( response );
            } else {
              featuredCourses = this.getSingleCategoryCourses( response );
            }
          }

          prom.resolve(featuredCourses);
          return prom;
        };

        // Build single categories list
        this.getSingleCategoryCourses         = function ( response ) {
          var featuredCourses = {};
          featuredCourses['courses'] = response.courses.map( function ( course ) {
            var featCourse = {
                title:course.course_title,
                url: that.generateNewUrl('library/' + course.course_id + '/' + that.rewriteTitletoUrl(course.course_title)),
                course_id: course.course_id,
                lesson_id: course.firstLesson_guid,
                preview: {
                    path:       'https://cdn0.knowledgecity.com/opencontent/courses/previews/',
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
                runtime: that.formatSecondsToHrs(course.trt),
                lesson_type: course.introType || 'video'
            }
            var retcourse = '';
            if( that.content.typeFeatured == 'featured-course') {
              retcourse = that.buildFeaturedCourse( featCourse );
            }
            if( that.content.typeFeatured == 'preview-item') {

              retcourse = that.buildprevewItem( featCourse );
            }

            return retcourse;
          });
          return featuredCourses;
        };

        // Build multipleCategories featured-Courses (tabs)
        this.getMultipleCategoriesCourses     = function ( multiple_categories ) {

          var multiple = {};
          multiple['tabs'] = [];
          multiple['courses'] = [];

          var regex = /\s+/gi; //  whitespace chars + Delimiters: (g)lobal case-(i)nsensitive

          multiple_categories.map( function( tab ) {

              multiple['tabs'][tab.order] = '<button class="tablinks';
              if(tab.order == 0 )  {
                multiple['tabs'][tab.order] += ' active'
              }

              // Checks the tab key value. If wordCount > 1:
              //  - Removes whitespaces at the start/end of the string
              //  - Replaces whitespaces with underscores to generate a valid id value
              let tabId = tab.tab;
              let wordCount = tabId.trim().replace(regex, ' ').split(' ').length;
              if( wordCount > 1 ){ tabId = tabId.trim().replace(regex, '_'); }

              multiple['tabs'][tab.order] += '" data-library="'+tabId+'">'+tab.label+'</button>';
              var crs = tab.courses.map( function ( course ) {
                var featCourse = {
                    title:course.course_title,
                    url: that.generateNewUrl('library/' + course.course_id + '/' + that.rewriteTitletoUrl(course.course_title)),
                    course_id: course.course_id,
                    lesson_id: course.firstLesson_guid,
                    preview: {
                        path:       'https://cdn0.knowledgecity.com/opencontent/courses/previews/',
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
                    runtime: that.formatSecondsToHrs(course.trt),
                    lesson_type: course.introType || 'video'
                }

                var retcourse = '';
                if( that.content.typeFeatured == 'featured-course') {
                  retcourse = that.buildFeaturedCourse( featCourse );
                }
                if( that.content.typeFeatured == 'preview-item') {

                  retcourse = that.buildprevewItem( featCourse );
                }
                return retcourse;
              });
              var multicourses = crs.join("");
              multiple['courses'][tab.order] = '<div id="'+tabId+'" class="tabcontent inner-tab__business" style="display: ';
              if( tab.order == 0 ) {
                multiple['courses'][tab.order] += 'block;';
              } else {
                multiple['courses'][tab.order] += 'none;';
              }
              multiple['courses'][tab.order] += '"><div class="inner-tab_copy">'+multicourses+'</div></div>';
            });
            return multiple;
        };

        // Builds the HTML for Featured courses
        this.buildFeaturedCourse              = function ( featCourse ) {
          retcourse = '<div class="featured-course">'+
              '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" target="_blank" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" class="featured-course__link" data-handler="onOpenPreview">'+
                          '<picture class="course-video__preview-img">';
          $.each(featCourse.preview.sources, function () {

            retcourse += '<source media="(max-width: '+this.maxWidth+'px)"'+
                'srcset="'+featCourse.preview.path+this.src+', '+featCourse.preview.path+this.src2x+' 2x">';
          });
          retcourse += '<img src="'+featCourse.preview.path+featCourse.preview.src+'"'+
                                 'srcset="'+featCourse.preview.path+featCourse.preview.src+', '+featCourse.preview.path+featCourse.preview.src2x+' 2x" alt="">'+
                        '</picture>'+
            '</a>'+
            '<div class="featured-course__footer">'+
              '<a class="featured-course__title" href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" >'+
              '<b>'+that.mui.courseFooter.course+'</b>: '+featCourse.title+'<br>'+
              '<span class="featured-course__runtime"><b>'+ that.mui.courseFooter.runtime +'</b>: '+ featCourse.runtime +'</span></a>'+
            '</div>'+
          '</div>';
          return retcourse;
        };

        // Builds the HTML for Featured Courses with preview image desgin
        this.buildprevewItem                  = function ( featCourse ) {
          var retcourse  = '<div class="preview-item">'+
              '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" target="_blank" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" class="preview-item__href">'+
                          '<picture class="course-video__preview-img">';
          $.each( featCourse.preview.sources, function () {
            retcourse += '<source media="(max-width: '+this.maxWidth+'px)"'+
                'srcset="'+featCourse.preview.path+this.src+', '+featCourse.preview.path+this.src2x+' 2x">';
          });
          retcourse += '<img src="'+featCourse.preview.path+featCourse.preview.src+'"'+
                                   'srcset="'+featCourse.preview.path+featCourse.preview.src+', '+featCourse.preview.path+featCourse.preview.src2x+' 2x" alt="">'+
                          '</picture>'+
              '</a>'+
              '<div class="preview-item__footer">'+
                '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" >'+featCourse.title+'</a>'+
              '</div>'+
            '</div>';
            return retcourse
        };

        // Returns the data for the Benefits section
        this.handleBenefits                   = function () {
          var prom      = $.Deferred();
          var benefits  = [];
          benefits = $.map( that.mui.benefits, function( benefit, index ) {
            $.extend( benefit[0], {'template' : that.config.pathTemplate} );
            return benefit;
          });
          prom.resolve( benefits );
          return prom;
        };

        // Appends additional data within the head tag
        this.setHeaderContent                 = function () {
            headerProm = $.Deferred();
            $("head").append('<link rel="stylesheet" href="/js/vendor/select2/select2.min.css" />');
            $("head").append( this.setMetaData() );
            $("head").append( this.setAnalyticsCode() );
            return headerProm.resolve({});
        };

        // Return the <meta> tags
        this.setMetaData                      = function () {
          var meta = '';
          if ( typeof this.content.meta != "undefined" ) {
            $.each( this.content.meta, function ( name, content ) {
              meta += '<meta name="'+name+'" content="'+content+'">';
            });
          }
          return meta;
        };

        // Returns the Google Analytics scripts
        this.setAnalyticsCode                 = function () {
          var scripts = '';
          if( this.isThankPage && typeof this.content.conversionCode != 'undefined' ) {
            scripts += '<script async src="https://www.googletagmanager.com/gtag/js?id='+this.content.conversionCode+'"></script>' +
            "<script> window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '"+this.content.conversionCode+"'); </script>";
          }
          if( typeof this.content.analyticsCode != 'undefined' ) {
            scripts += '<script async src="https://www.googletagmanager.com/gtag/js?id='+this.content.analyticsCode+'"></script>'+
            "<script> window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '"+this.content.analyticsCode+"');</script>";
          }
          if( this.isThankPage && typeof this.content.conversionTag != 'undefined' ) {
            scripts += "<script> gtag('event', 'conversion', {'send_to': '"+this.content.conversionCode+"/"+this.content.conversionTag+"'}); </script>";
          }
          if( typeof this.content.isFacebookPixel != 'undefined' && this.content.isFacebookPixel == true ) {
            scripts += "<!-- Facebook Pixel Code --><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';"+
            "n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '1926496504263076');fbq('track', 'PageView');"+
            '</script><noscript><img height="1" width="1"src="https://www.facebook.com/tr?id=1926496504263076&ev=PageView&noscript=1"/></noscript><!-- End Facebook Pixel Code -->';
          }
          if( this.isThankPage && typeof this.content.bingCode != 'undefined' ){
            scripts += '<script defer>(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"'+ this.content.bingCode +'"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},'+
            'n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},'+
            'i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");</script>';
          }
          if( typeof this.content.gtagCode != 'undefined' ){
            scripts += '<script defer src="https://www.googletagmanager.com/gtag/js?id='+this.content.gtagCode+'"></script><script>window.dataLayer = window.dataLayer || []; '+
            "function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '"+this.content.gtagCode+"');</script>";
          }
          return scripts;
        };

        // Returns additional content for the landing-content-wrapper block.
        // Adds specific css classes to order the flow of the content/images.
        this.handleAdditionalContent          = function ( order ) {
          var info          = [];
          var aContent      = [];
          var cOrder        = ( order != undefined ) ? order: 'even'; //default
          var oFlag         = ( cOrder == 'even' ) ? 'beforeContent': 'afterContent';

          // The 'oFlag' changes the order of the elements depending if they should be
          // appended Before or After the default .landing-content-wrapper original content
          if( oFlag == 'beforeContent'){ info['beforeContent'] = true; } else { info['afterContent'] = true; }

          // Adding the .css classes to each additional block
          var totalAC = ( that.mui.additionalContent ).length;
          aContent = $.map( that.mui.additionalContent, function( content, index ) {

            // For each of the elements, adds the specific css class to match the background color and content alignment
            var o = '';
            if( oFlag == 'beforeContent' ){
              // When there's two or more elements, the order should be reversed to match the original content order
              o = ( totalAC % 2 == 0 ) ? ( ( index % 2 == 0 ) ? 'odd' : 'even' ) : ( ( index % 2 == 0 ) ? 'even' : 'odd' );
            } else {
              o = ( index % 2 == 0 ) ? 'odd' : 'even';
            }

            // This flag changes the logo position ( before or after the .description block )
            if( o == 'even' ){
              content['isEven'] = true; content['alignOrder'] = o; content['bgClass'] = '';
            } else {
              content['isOdd'] = true; content['alignOrder'] = o; content['bgClass'] = 'gray-bg';
            }

            content['alignOrder'] = o;

            return content;
          });

          info['additionalContent'] = aContent;

          return info;
        };

        // Setting handlers for Form validations, page scrolling and more
        this.setScripts                       = function () {
          var promScripts = $.Deferred();

          $('body').ready( function () {

            that.setFeaturedCourses();

            // Select2
            $('#number_employees').select2({ placeholder: this.companySizeLabel });
            $('#number_employees').on('select2:select', function (e) { $(this).valid(); });

            // Scroll back
            $('.scroll.btn, .scroll').on('click', function(){

              var target = 0;
              if ( $( 'form#landing-form  input[name="name_f"]' ).length > 0 ) {
                target = $('form#landing-form input[name="name_f"]').offset().top - 30;
              }
              $('html, body').animate({
                  scrollTop: target
              }, 800);
              if( $( 'form#landing-form input[name=name]' ).length > 0 ) {
                $( 'form#landing-form input[name=name]' ).focus();
              }
              $( 'form#landing-form input[name="name_f"]' ).focus();
            });

            // Course Tabs
            if( typeof that.content.isMultipleCategories != 'undefined' && that.content.isMultipleCategories  == true ) {
              $('button.tablinks').on('click', function() {
                if( !$(this).hasClass('active') ) {
                  $('button.tablinks').removeClass('active');
                  $(this).addClass('active')
                  var cnt = $(this).data('library');
                  $('.tabcontent').css('display', 'none');
                  $('#'+cnt).css('display', 'block');
                }
              });
            }

            // Form validation
            // Replacing the default validation messages
            $.validator.messages.required   = that.mui.formErrorMessages.required;
            $.validator.messages.email      = that.mui.formErrorMessages.email;

            // Adding custom validation methods
            $.validator.addMethod("accepted_email", function( value, input ) {
              var email = value.toLowerCase();
              var domain = email.split("@");
              var isBlackListed = that.blacklist.filter( function(bl) {
                  if(bl == "@"+domain[1]){
                    return bl;
                  }
              });
                return ( isBlackListed.length > 0 ) ? false : true;
            }, that.mui.formErrorMessages.businessEmail );

            $.validator.addMethod("validate_domain", function( value, input ) {
              var email = value.toLowerCase();
              var domain = email.split("@");
              if(domain.length == 2 ) {
                var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                var is_it = re.test(String(email));
                return is_it;
              } else {
                return false;
              }
            }, that.mui.formErrorMessages.email );

            $.validator.addMethod("numeric", function(value, element) {
                return this.optional(element) || /^\d{10}$/.test(value);
            }, that.mui.formErrorMessages.numeric );

            $.validator.addMethod("alphanumericwith_spaces", function(value, element) {
                return this.optional(element) || /^[a-z\u0600-\u06FF\d\s.&]+$/i.test(value);
            }, that.mui.formErrorMessages.alphanumericWithSpaces );

            // Form
            $('form#landing-form').validate({
              onkeyup: false,
              normalizer: function( value ) {
                return $.trim( value );
              },
              rules: {
                email: {
                  required: true,
                  onkeyup: false,
                  email: true,
                  accepted_email : true,
                  validate_domain: true
                },
                name_f: {
                  required: true,
                  alphanumericwith_spaces: true,
                },
                name_l: {
                  required: true,
                  alphanumericwith_spaces: true,
                },
                company: {
                  required: true,
                  alphanumericwith_spaces: true,
                },
                phone: {
                  required: true,
                  alphanumericwith_spaces: true
                }
              },
              errorPlacement: function (error, element) {
                  error.appendTo( $(element).parent() );
              },
              showErrors: function(map, list) {
                  this.defaultShowErrors();  // calls the default function
              },
              validClass: 'valid',
              success: function ( label ) {
                  label.addClass('valid');
              },
              submitHandler: function ( form, event ) {

                event.preventDefault();
                var data  = {};
                data['type'] = 'portals/mena/employeeTraining';
                data['content'] = {};

                $('form#landing-form input[type="text"], form#landing-form input[type="email"], form#landing-form textarea').each(function () {
                  var index = $(this).attr('name');
                  data['content'][index] = $(this).val();
                });

                data['content'][$('#number_employees').attr('name')] = $('#number_employees').select2().val();
                data['content']['landing_page'] = window.location.href;
                data['content']['email_title'] = that.content.emailTitle;
                if( typeof that.content.source != 'undefined' && that.content.source != '' ) {
                  data['content']['source'] = that.content.source;
                }

                // Offline conversion tracking code
                var urlP  = '';
                var gclid = ( $('#gclid_field').length > 0 ) ? $('#gclid_field').val() : '';
                if( gclid ) {
                  urlP = window.location.href.split('?')[1]; // url params
                  data['content']['gclid'] = gclid;
                }

                var url = that.config['APIUrl'] + 'message/email';
                $.post( url, data, function ( resp ){
                  if(resp.response == true ) {
                    // Obtaining the main url and searching for slashes
                    var m_url  = [location.protocol, '//', location.host, location.pathname].join('');
                    var c_url  = m_url.substr( m_url.length -1 ) != '/' ? m_url+'/' : '';
                    // Building the conversion page url
                    var conversion_page = typeof that.content.conversionPage !== "undefined" ? c_url+that.content.conversionPage : c_url+'thankyou.html' ;
                    if( urlP ){
                      // If theres a conversion code
                      conversion_page = conversion_page+'?'+urlP;
                    }
                    // Redirecting to the conversion page
                    window.location.href = conversion_page;
                  };
                });
                return false;
              }
            });

            promScripts.resolve({});

          });
          return promScripts;
        };

        // Configuration for the Featured courses carousel
        this.setFeaturedCourses               = function ( courses ) {

          if( typeof this.content.activateCarousel != 'undefined' && this.content.activateCarousel == true ) {
              $('#featuredCourses').owlCarousel({
                loop: true,
                nav: false,
                center: false,
                slideBy: 'page',
                autoplay: true,
                autoWidth: false,
                responsiveRefreshRate: 50,
                responsive:{
                  300:{
                      items:1
                  },
                  600:{
                      items:2
                  },
                  1200:{
                      items:3
                  },
                  1500:{
                      items:4
                  }
                },
              });

              $('.landing-featured-courses .owl-controls__prev').on('click', function () {
                $('#featuredCourses').trigger('prev.owl.carousel');
              });

              $('.landing-featured-courses .owl-controls__next').on('click', function () {
                $('#featuredCourses').trigger('next.owl.carousel');
              });
            }
        };

        // Returns the data that would be used on building the clients owlCarousel
        this.getClients                       = function () {
          let prom = $.Deferred();
          $.get(this.config.pathTemplate + '/json/clients--v'+this.config.LocalStorageStamp+'.json', clients => {
              if( typeof clients === 'string' ){ clients = $.parseJSON( clients ); }
              var c = this.handleClientsData( clients );
              prom.resolve( c );
            }).fail(() => {
                prom.resolve({});
            });
          return prom;
        };

        // Returns additional info for the Clients data
        this.handleClientsData                = function ( clients ) {
          return clients.map( client => {
            let data = {
                logo: `${ this.getMainData().IMG}clients/logos/${client.name}${!client.company || typeof client.company === 'undefined' ? '' : '-' + this.getLanguage()}--v${this.config.LocalStorageStamp}.png`,
            };
            if( client.company ){
                data.name   = client.company[this.getLanguage()];
                data.height = 50;
            }
            if( client.title ){
                data.title = typeof client.title === 'string' ? client.title : client.title[this.getLanguage()]
            }
            return data;
          });
        };

        // Configuration for the Clients carousel
        this.renderClientsCarousel            = function () {
          const target = '#clientsCarousel';
          $(target).owlCarousel({
              loop: true,
              margin: 20,
              speed: 1500,
              dots: true,
              slideBy: 'page',
              responsive: {
                  0:{
                      items: 1
                  },
                  320:{
                      items: 2
                  },
                  650: {
                      items: 3
                  },
                  780: {
                      items: 4
                  },
                  900: {
                      items: 5
                  },
                  1150 : {
                      items: 6
                  }
              }
          });

          $('.main-clients .owl-controls__prev').on('click', function () {
            $('#clientsCarousel').trigger('prev.owl.carousel');
          });

          $('.main-clients .owl-controls__next').on('click', function () {
            $('#clientsCarousel').trigger('next.owl.carousel');
          });

        };

        // Google Offline conversion Tracking functions
        this.getParam                         = function ( p ) {
          var match = RegExp('[?&]' + p + '=([^&]*)').exec(window.location.search);
          return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        }

        this.getExpiryRecord                  = function ( value ) {
          var expiryPeriod = 90 * 24 * 60 * 60 * 1000; // 90 day expiry in milliseconds
          var expiryDate = new Date().getTime() + expiryPeriod;
          return { value: value, expiryDate: expiryDate };
        }

        this.addGclid                         = function () {

          var gclidParam = that.getParam('gclid');
          var gclidFormFields = ['gclid_field']; // all possible gclid form field ids here
          var gclidRecord = null;
          var currGclidFormField;

          var gclsrcParam = that.getParam('gclsrc');
          var isGclsrcValid = !gclsrcParam || gclsrcParam.indexOf('aw') !== -1;

          gclidFormFields.forEach(function (field) {
            if (document.getElementById(field)) {
              currGclidFormField = document.getElementById(field);
            }
          });

          if (gclidParam && isGclsrcValid) {
            gclidRecord = that.getExpiryRecord(gclidParam);
            localStorage.setItem('gclid', JSON.stringify(gclidRecord));
          }

          var gclid = gclidRecord || JSON.parse(localStorage.getItem('gclid'));
          var isGclidValid = gclid && new Date().getTime() < gclid.expiryDate;

          if (currGclidFormField && isGclidValid) {
            currGclidFormField.value = gclid.value;
          }

        }

        this.setOfflineConversionTracking     = function (){
          var prom = $.Deferred();
          that.addGclid();
          prom.resolve({});
          return prom;
        };

        this.onOpenPreview                    = (node, event) => {
             console.log(node + "NODDE");
            event.preventDefault();

            let
                lesson              = $(node).data('lessonid'),
                course              = $(node).data('course-id'),
                type                = $(node).data('lesson-type'),
                newUrlParts         = {
                    contentCacheId:     course,
                    pageController:     'library',
                },
                link                = this.appLocation.buildURL(newUrlParts);

            if(!lesson || lesson.length == 0 || type != 'video' ) {
                return true;
            }

            if (type === 'scorm') {
                window.history.pushState({}, '', $(node).attr('href'));
                that.onChangeLocation();
                return;
            }

            /*
            For the AR version of this landing page, the AR captions should be displayed at the start of the video,
            and the default video language should be set to English.
            Based on the current functionallity of the player.js configuration:
            If the video and the page shares the same language, the captions shouldn't be displayed by default.
            If the video language is different than the page language, the captions would start by default using the current page language.
            */
            var altCaptionConfig = {};
            if( this.getLanguage() === "ar" ){ altCaptionConfig = {'lang': 'en', 'defaultCaptionLang': 'ar'}; }

            let previewModal           = new PreviewModal(this, node);
            previewModal.show(course, {id: lesson,  title: '', lesson_type : type}, link, altCaptionConfig );

        };

    }

    EmployeeTraining.prototype                = Object.create(Page.prototype);
    EmployeeTraining.prototype.constructor    = EmployeeTraining;

    return EmployeeTraining;
});
