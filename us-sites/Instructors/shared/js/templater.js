
function Templater() {
  // slider variables
  var that         = this;
  var position     = -1;
  var to           =  0;
  this.blacklist   = [];
  this.tmpl        = '';
  this.url         = '';
  this.id;
  this.data;
  this.content;
  this.mui;
  this.isThankPage = false;
  this.lang        = 'en';
  this.basePath    = 'Instructors';
  this.previewImage = '';


// 2nd call
  this.getRedirectUsers = function () {

    var redirectPromise = $.Deferred();
    $.get(config.APIUrl+'visitor/localsettings/', function ( resp ) {
      if( resp.response != false ) {
        var info          = resp.response;
        var countries     = config.allowedCountries;
        var country_code  = info.ipInfo.country_code;
        if( countries.indexOf( country_code ) == -1 ){ window.location.replace("https://www.knowledgecity.com"); }
        redirectPromise.resolve({});
      } else {
        window.location.replace("https://www.knowledgecity.com");
      }
    });

    return redirectPromise;
  }

// 3rd call
  this.getContent = function () {
    var contentPromise = $.Deferred();
    var url = this.getMainUrl();
    var data = { url: url };
    $.get(config.APIUrl+'landing/', data, function ( response ) {
      if(response.response != false ) {
        var landingPage = response.response;
        that.tmpl       = landingPage.template;
        that.content    = landingPage.content;
        that.mui        = landingPage.mui;
        that.id         = landingPage.id;
        contentPromise.resolve({});
      } else {
        return false;
      }
    }).fail( function ( a ) {

    });
    return contentPromise;
  }

// 5th call = last call
  // function to handle all content and template for the landing page.
  this.runTemplate        = function ( html ) {

    return $.when(
            this.GetFeaturedCourses(),
            )
    .done( function ( courses  ){ 

      return $.when(  that.setHeaderContent()).done( function (  ) { 

        var data = that.content;
         $.extend( data, courses );
         $.extend( data, {
          "isThankyouPage"    : that.isThankPage,
          "mui"               : that.mui,
          "template"          : '/'+that.basePath+'/'+that.tmpl+'/',
          "landingPath"       : config['CDNPortal']+'opencontent/landingpage/'+that.id+'/'
        });


        return $.when(that.renderTemplate( data, html )).done(function () {
        });
      });
    });
  };

  this.setupScripts = function () {
    var promScripts = $.Deferred();
    $('body').ready( function () {

      $('#mainContent').fadeIn(400, function () {

        that.setFeaturedCourses();

        if(that.tmpl == 'onltraining') {

          $('.hero-slider').owlCarousel({
            loop:true,
            autoplay:true,
            autoplayTimeout:3000,
            autoplayHoverPause:true,
            items:1
          });
        }

        $.validator.addMethod( 'accepted_email', function( value, input ) {
          var email = value.toLowerCase();
          var domain = email.split("@");
          var isBlackListed = that.blacklist.filter( function(bl) {
              if(bl == "@"+domain[1]){
                return bl;
              }
          });
            return ( isBlackListed.length > 0 ) ? false : true;
        },
        "Please use your Business Email");

        $.validator.addMethod( 'validate_domain', function( value, input ) {
          var email = value.toLowerCase();
          var domain = email.split("@");
          if(domain.length == 2 ) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            var is_it = re.test(String(email));
            return is_it;
          } else {
            return false;
          }
        },
        "Please enter a valid email address");

        $.validator.addMethod("numeric", function(value, element) {
            return true;//this.optional(element) || /^[0-9]*$/.test(value);       //^\d{10}$
        }, "The phone number must be numeric");

        $.validator.addMethod("alphanumericwith_spaces", function(value, element) {
            return this.optional(element) || /^[a-z\d\s.&]+$/i.test(value);
        }, "Please, use letters, numbers, and spaces only");

        $('#number_employees').select2({
          placeholder: 'Company Size*',
        });

        $('.clients-slider').owlCarousel({
          loop: true,
          nav: false,
          center: false,
          slideBy: 'page',
          autoplay: true,
          autoWidth: false,
          responsiveRefreshRate: 50,
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

        $('.clients-wrapper .owl-nav__prev').on('click', function () {
          $('.clients-slider').trigger('prev.owl.carousel');
        });
        $('.clients-wrapper .owl-nav__next').on('click', function () {
          $('.clients-slider').trigger('next.owl.carousel');
        });

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

        $( 'form#landing-form' ).validate({
          onkeyup: false,
          normalizer: function( value ) {
            return $.trim( value );
          },
          rules: {
            email: {
              required: true,
              onkeyup: false,
              accepted_email : true,
              email: true,
              validate_domain: true
            },
            name_f: {
              required: true,
              alphanumericwith_spaces: true,
            },
            company: {
              required: true,
              alphanumericwith_spaces: true,
            },
            phone: {
              required: true,
              // maxlength: 10,
              numeric: true
            }
          },
          errorPlacement: function (error, element) {
              error.appendTo( $(element).parent() );
          },
          showErrors: function(map, list) {

              this.defaultShowErrors();           // calls the default function
                                                  // after which we can add our changes
          },
          validClass: 'valid',
          success: function ( label ) {
              label.addClass('valid');
          },
          submitHandler: function ( form, event ) {

            event.preventDefault();
            var data  = {};
            data['type'] = 'portals/www/marketing';
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

            var url = config['APIUrl'] + 'message/email';
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

        $('#number_employees').on('select2:select', function (e) {
          $(this).valid();
        });
        $('.featured-course a, .preview-item a').on('click', function (e) {
          e.preventDefault();
          var tg = e.currentTarget;
          var md = new PreviewModal();
          md.show( $(tg).data('course-id'), $(tg).data('lessonid'));
        });

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

        that.runTestimonials();
        promScripts.resolve({});
      });
    });
    return promScripts;
  };

  // Function to get additional content for the landing-content-wrapper block
  // Adds specific css classes to order the flow of the content/images
  this.handleAdditionalContent = function( order ) {
    var info          = [];
    var aContent      = [];
    var cOrder        = ( order != undefined ) ? order: 'even'; //default
    var oFlag         = ( cOrder == 'even' ) ? 'beforeContent': 'afterContent';

    // The 'oFlag' changes the order of the elements depending if they should be
    // appended Before or After the default .landing-content-wrapper original content
    if( oFlag == 'beforeContent'){ info['beforeContent'] = true; } else { info['afterContent'] = true; }

    // Adding the .css classes to each additional block
    var totalAC = (this.mui.additionalContent).length;
    aContent = $.map( this.mui.additionalContent, function( content, index ) {

      // For each of the elements, adds the specific css class to match the background color and content alignment
      var o = '';
      if( oFlag == 'beforeContent' ){
        // When there's two or more elements, the order should be reversed to match the original content order
        o = ( totalAC % 2 == 0 ) ? ( ( index % 2 == 0 ) ? 'odd' : 'even' ) : ( ( index % 2 == 0 ) ? 'even' : 'odd' );
      } else {
        o = ( index % 2 == 0 ) ? 'odd' : 'even';
      }

      // This flag arranges the logo order ( before or after the .description text )
      if( o == 'even' ){
        content['isEven'] = true; content['alignOrder'] = o;
      } else {
        content['isOdd'] = true; content['alignOrder'] = o; content['bgClass'] = 'gray-bg';
      }

      content['alignOrder'] = o;

      return content;
    });

    info['additionalContent'] = aContent;

    return info;
  };

  this.handleBenefits = function() {
    var benProm       = $.Deferred();

    var benefits =[]
    benefits = $.map(this.mui.benefits, function( benefit, index ) {
      return benefit;
    });

    benProm.resolve(benefits);
    return benProm;
  };

  // function to get the proper landing page url to get the content
  this.getMainUrl     = function () {

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
// 1st call 
  this.getConfig      = function () {
    var configProm = $.Deferred();
    var configFilename = '/js/overrideConfig.json';
    $.get( configFilename, function( resp_config ) {

      var resp = ( typeof resp_config == 'string' ) ? $.parseJSON(resp_config) : resp_config;
      $.extend(config, resp);
      configProm.resolve(config);
    });
    return configProm;
  }

  // function to get and create the clients list from www.knowledgecity.com
  this.getClients = function() {
    var clientsProm = $.Deferred();
    $.get('https://staticcontent.knowledgecity.com/templates/ussite/1.0/json/clients--v'+config.LocalStorageStamp+'.json', function (res) {
      var response = res;
      if( typeof response == 'string' ) response = $.parseJSON(res);

      // Libraries - Sorting items by orderFlag
      var url = that.getMainUrl();
      if( url === 'libraries' ){
        response.sort( function(a, b){
            if(a.orderFlag && !b.orderFlag){ return -1; }
            if(!a.orderFlag && b.orderFlag){ return 1; }
            return 0;
        });
      }

      var clts = {};
      clts['clients'] = response.map( function (client) {
        let data = '<div class="index-client">'+
                      '<img class="index-client__img" src="https://staticcontent.knowledgecity.com/templates/ussite/1.0/images/clients/logos/'+client.name+'--v'+config.LocalStorageStamp+'.png">'+
                   '</div>';
        return { 'client' : data };
      });
      clientsProm.resolve(clts);
    });
    return clientsProm;
  }

  // 4th call
  this.getTemplate        = function () {


   //this.tmpl= "instructor";
    var templateProm      = $.Deferred();
    $.when( this.getHTML( '/'+this.basePath+'/'+this.tmpl+'/index.mst' ) ).done( function ( html ) {

      templateProm.resolve( html );
    });
    return templateProm;
  };

  // function to insert the head tag for each landing page
  this.setHeaderContent         = function () {
      headerProm = $.Deferred();
      $("head title").html( this.content.title );
      $("head").append(this.setMetaData());
      $("head").append(this.setStyles());
      $("head").append(this.setAnalyticsCode());
      return headerProm.resolve({});
  };

  /**
   * Get HTML asynchronously
   * @param  {String}   url      The URL to get HTML from
  */
  this.getHTML = function ( url ) {

    var htmlProm = $.Deferred();
  	$.get(url, function(html){
      htmlProm.resolve(html);
    });
    return htmlProm;
  };

  // this function returns all featured courses that should be promoted in the
  // landing page
  this.GetFeaturedCourses = function () {
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

  // function to create single categories list
  this.getSingleCategoryCourses = function ( response ) {
    var featuredCourses = {};
    featuredCourses['courses'] = response.courses.map( function ( course ) {
      var featCourse = {
          title:course.course_title,
          url: 'https://www.knowledgecity.com/en/library/' + course.course_id + '/' + that.generateUrl(course.course_title),
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

  //function to build multipleCategories featured-Coursses
  this.getMultipleCategoriesCourses  = function ( multipple_categories ) {

    var multiple = {};
    multiple['tabs'] = [];
    multiple['courses'] = [];

    var regex = /\s+/gi; //  whitespace chars + Delimiters: (g)lobal case-(i)nsensitive

    multipple_categories.map( function( tab ) {

        multiple['tabs'][tab.order] = '<button class="tablinks';
        if(tab.order == 0 )  {
          multiple['tabs'][tab.order] += ' active'
        }

        // Checks the tab key value. If word count > 1:
        //  - Removes whitespaces at start/end of the string
        //  - Replaces whitespaces with underscores to generate a valid id value
        let tabId = tab.tab;
        let wordCount = tabId.trim().replace(regex, ' ').split(' ').length;
        if( wordCount > 1 ){ tabId = tabId.trim().replace(regex, '_'); }

        multiple['tabs'][tab.order] += '" data-library="'+tabId+'">'+tab.tab+'</button>';
        var crs = tab.courses.map( function ( course ) {
          var featCourse = {
              title:course.course_title,
              url: 'https://www.knowledgecity.com/en/library/' + course.course_id + '/' + that.generateUrl(course.title),
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

  //build HMTML for featured courses
  this.buildFeaturedCourse  = function ( featCourse ) {
    retcourse = '<div class="featured-course">'+
        '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" target="_blank" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" class="featured-course__link">'+
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
        '<a class="featured-course__title" href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" >'+featCourse.title+'</a>'+
        '<span class="featured-course__runtime">'+ featCourse.runtime +'</span>'+
      '</div>'+
    '</div>';
    return retcourse;
  };

  // build HTML for featured courses with preview image desgin
  this.buildprevewItem = function ( featCourse ) {

    // debugger;
    // console.log(featCourse);
    // console.log(featCourse.preview.sources);
    // retcourse += '<source media="(max-width: '+this.maxWidth+'px)" srcset="'+featCourse.preview.path+this.src+'">';
    // retcourse += '<img src="'+featCourse.preview.path+featCourse.preview.src+'" srcset="'+featCourse.preview.path+featCourse.preview.src+'" alt="">'+
    //           '</picture>'+

    var retcourse  = '<div class="preview-item">'+
        '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" target="_blank" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" class="preview-item__href">'+
                    '<picture class="course-video__preview-img">';
    $.each(featCourse.preview.sources, function () {
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

  // function to get the preview course instead of the image besides the form
  this.getHeaderCourse = function() {
    var prom = $.Deferred();
    var courses = {};
    if(typeof this.content.isHeaderCourse != 'undefined' && this.content.isHeaderCourse != false ) {
      var response = that.content.headerCourse;
      if( typeof response == 'string' ) response = $.parseJSON(res);

      courses = response.courses.map( function ( course ) {
        var featCourse = {
            title:course.course_title,
            url: 'https://www.knowledgecity.com/en/library/' + course.course_id + '/' + that.generateUrl(course.course_title),
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
            '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" target="_blank" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" class="preview-item__href">'+
                        '<picture class="course-video__preview-img">';

        retcourse += '<img src="'+that.previewImage+'" alt=""/>'+
                        '</picture>'+
            '</a>'+
            // '<div class="preview-item__footer">'+
            // 	 '<a href="'+featCourse.url+'" data-course-id="'+featCourse.course_id+'" data-lessonid="'+featCourse.lesson_id+'" data-lesson-type="'+featCourse.lesson_type+'" >'+featCourse.title+'</a>'+
            // '</div>'+
          '</div>';

          return retcourse;
      });
      prom.resolve( courses );
    } else {
      prom.resolve(courses);
    }
    return prom;
  };

  this.getCustomPreviewImage   = function () {
    var customImageProm = $.Deferred();

    this.previewImage = "/"+this.basePath+"/"+this.tmpl+'/images/CoursePreview.JPG';
    if( typeof this.content.headerCourseImage != 'undefined' && this.content.headerCourseImage != "" ){
        $.ajax({
          url: config['CDNPortal']+'opencontent/landingpage/'+this.id+'/assets/images/'+this.content.headerCourseImage,
          type: 'HEAD',
          error: function ( ) {
            customImageProm.resolve({image: that.previewImage});
          },
          success: function () {
            that.previewImage = config['CDNPortal']+'opencontent/landingpage/'+that.id+'/assets/images/'+that.content.headerCourseImage;
              customImageProm.resolve({image: that.previewImage});
          }
        });
    } else {
      customImageProm.resolve({image: that.previewImage});
    }
    return customImageProm;
  };

  // returns the email servers blacklist
  this.getBlackList = function() {
    return $.ajax({"url": '/'+this.basePath+"/shared/json/emailcompanyblacklist.json", cache:false, dataType:"json"});
  };

  this.generateUrl = function( title ) {
    return title.replace(/\ /g, '-').toLowerCase();
  };

  this.formatSecondsToHrs = function(seconds) {
    var h = seconds/3600 ^ 0,
        m = (seconds-h*3600)/60 ^ 0;

    m = m < 10 ? '0' + m : m;
    return h + 'hrs. ' + m + 'min.';
  };

  this.runTestimonials = function() {
    if( to != 0 ) {
        clearTimeout(to);
    }
    to = setInterval( function () {

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
        that.runTestimonials();
    }, 30000 );
    $( '.dot.slideshow-dot' ).off( 'click' ).on( 'click', function () {
        $( '.dot-wrapper' ).find( '.dot.slideshow-dot' ).removeClass( 'activo' );
        $(this).addClass( 'activo' );
        that.runTestimonials();
    });
  };

  // function to render the html template with the content of the landing page
  // and insert it on body tag.
  this.renderTemplate       = function ( data, html ) {
    var renderProm   = $.Deferred();
    var renderedHTML = Mustache.render(html, data );
    $('#mainContent').html(renderedHTML);
    $('.preload').fadeOut(400, function () {
      $('.preload').remove();
      $('body style').remove();
      $('body').removeAttr('style');
      that.setupScripts();
    });
    renderProm.resolve({});
    return renderProm;
  };

  // function to adjust featured courses to each landing pages
  this.setFeaturedCourses   = function ( courses ) {

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

  // function to return testimonials from www.knowledgecity.com
  this.getTestimonials      = function () {
    var testimonialProm     = $.Deferred();
    $.get("https://staticcontent.knowledgecity.com/templates/ussite/1.0/json/en-testimonials--v"+config.LocalStorageStamp+".json", function ( testimonials ) {

      var testim = {};
      testim['testimonials'] = testimonials.map( function( testimonial ) {
          testimonial.image = testimonial.image.split('.').join('--v'+config.LocalStorageStamp+'.');
          var test = '<div class="full-slide-wrapper"><div class="dot slideshow-dot fade ';
          if(typeof testimonial.class !="undefined" ) {
            test += testimonial.class;
          }
          test += '" style="background-image:url(https://staticcontent.knowledgecity.com/templates/ussite/1.0/images/clients/testimonials/'+testimonial.image+')"></div>'+
            '<div class="slide-wrapper fade">'+
              '<div class="slide-content-wrapper">'+
                '<div class="slide-text">'+
                  '"'+testimonial.text+'"'+
                '</div>'+
                '<div class="slide-owner-wrapper">'+
                  '<div class="slide-owner">'+testimonial.name+'</div>'+
                  '<div class="slide-owner-info">'+testimonial.title;
                  if(typeof testimonial.company !="undefined") {
                    test+= ' | '+ testimonial.company;
                  }
            test+= '</div>'+
                '</div>'+
              '</div>'+
            '</div>'+
          '</div>';
          return { 'testimonial' :test };
      });

      testimonialProm.resolve(testim);
    });
    return testimonialProm;
  };

  // function to return analytics scripts to insert on the head tag
  this.setAnalyticsCode     = function () {
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

  // function to return meta tags to insert on the head tag
  this.setMetaData          = function () {
    var meta = '';
    if ( typeof this.content.meta != "undefined" ) {
      $.each(this.content.meta, function ( name, content ) {
        meta += '<meta name="'+name+'" content="'+content+'">';
      });
    }
    return meta;
  };

  // function to return css scripts to insert on the head tag
  this.setStyles          = function() {
    var styles = '';
    if (this.tmpl == 'corptraining') {
      styles += '<link rel="stylesheet"  type="text/css" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"'+
      'integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous" />';
    }
    styles += '<link rel="stylesheet" type="text/css" href="/'+this.basePath+'/'+this.tmpl+'/css/style.min.css" />'+
                 '<link rel="stylesheet" type="text/css" href="/'+this.basePath+'/'+this.tmpl+'/css/responsive.min.css" />';
    return styles;
  };

  // Offline conversion Tracking
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

  this.setOfflineConversionTracking     = function () {
    var prom = $.Deferred();
    that.addGclid();
    prom.resolve({});
    return prom;
  };

  $( '.featured-course__link' ).click( function( e ) {
    e.preventDefault();
    return false;
    //do some other stuff here
});


}
