;define(['jquery', 'lib/Page', 'lib/CallGet'],
    function ($, Page, CallGet) {

        function mobileapp() {

            Page.call(this);

            const that              = this;

            this.getClassName       = function () {
              return "mobileApp";
            };

            this.defineContent      = function () {

                $.when(that.loadStylesPromise ).done(function(){
                  // that.popstateListener();
                  that.handleBodyPage();
                  that.backButtonPrevented = true;
                });
                return $.when( this.getContentMui() )
                .then( ( content ) => {
                    if(! content ) {

                        that.redirect404();
                    }
                    var data = that.handleContentData( content );

                    $.extend(data, {timeStamp: Date.now()});
                    that.setContentData(data);
                });
            };
            this.getContentMui             = function () {

                var prom            = $.Deferred();
                var lang            = this.getLanguage();
                var platform        = this.checkRequestedOS();
                if( platform ) {
                    this.remoteCall(new CallGet('mui/0www/0'+ lang +'/',
                        {   groups: 'mobileApp',
                            code: 'all',
                            nested: true,
                            '_': this.config.LocalStorageStamp
                        },
                        function(res) {

                            prom.resolve(res.response);
                         }).defineErrorHandler((res, status) => {
                            prom.reject();
                        }));
                } else {
                    prom.resolve(false);
                }
                return prom;

            };

            // checking which platform is requested
            this.checkRequestedOS          = function () {
              var platform = false;
              // specting the url to be
              // https://portal_code.knowledgecity.com/lng/mobileapp/android
              // https://portal_code.knowledgecity.com/lng/mobileapp/ios
              // to return which OS content will be shown. On this case length
              // needs to be higher than 3 because in android you can specify
              // which steps needs to be displayed, the url needs to be as follows
              // https://portal_code.knowledgecity.com/lng/mobileapp/android/nougat
              // https://portal_code.knowledgecity.com/lng/mobileapp/android/oreo
              if( this.urlParts.all['length'] >= 3 &&
                  ( this.urlParts.all[2].toLowerCase() === 'ios' ||
                    this.urlParts.all[2].toLowerCase() === 'android'
                  )
                ) {
                  platform = this.urlParts.all[2].toLowerCase();
              }
              return platform;
            }

            this.handleContentData         = function ( data ) {
                var platform = this.checkRequestedOS();
                var handledContent = {};

                handledContent['isAndroid']        = (platform == 'android');
                handledContent[ 'content']         = data.content;
                handledContent['mobile']           = data.mobile;
                var iOSSteps                       =  ( platform == 'android' && typeof data.step == 'undefined' ) ? {} : this.handleDownloadSteps(data.step);
                handledContent['steps']            = iOSSteps['steps'];
                handledContent['nougat']           = this.handleDownloadSteps(data.nougat.step);
                handledContent['oreo']             = this.handleDownloadSteps(data.oreo.step);
                handledContent['isIOS']            = this.checkBrowser();
                handledContent['isAndroidBrowser'] = this.checkAndroidBrowser();
                handledContent['portal_code']      = this.config.portal.portal_code;

                return handledContent;
            };

            this.handleDownloadSteps       = function ( stepArray ) {
              var handledSteps = {};
              var i = 0, index = 0;
              handledSteps['steps']    = [];
              handledSteps['steps'][i] = [];
              handledSteps['steps'][i]['step'] = [];
              var last = Object.keys(stepArray).length;
              $.map(stepArray, function( step, k ) {
                  if( (k-1)%3 == 0 && (k-1) > 0 ) {
                      i++;
                      handledSteps['steps'][i] = [];
                      handledSteps['steps'][i]['step'] = [];
                      index = 0;
                  }
                  handledSteps['steps'][i]['step'][index];
                  handledSteps['steps'][i]['step'][index] = step;

                  if( k != last ) {
                      handledSteps['steps'][i]['step'][index]['bg'] = k;
                  }
                  handledSteps['steps'][i]['step'][index]['last'] = last == k;
                  index++;
              });
              return handledSteps;
            };
            this.checkBrowser              = function () {
                var browser = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                return browser;
            };
            this.checkAndroidBrowser       = function () {
              return navigator.userAgent.match(/Android/i) == 'Android';
            };
            this.onChoiceDistribution      = function ( node, event ) {
              var distribution = $(node).data('distribution');
              $('.android-button-wrapper > div').removeClass('active');
              $('.android-button-wrapper').addClass('active');
              $(node).addClass('active');
              $('.android-distributions').addClass('hidden');
              $('.android-steps-wrapper').addClass('hidden');
              $('.android-steps-wrapper.'+distribution).removeClass('hidden');
              $('.ios-from-desktop').removeClass('hidden');
            };
            this.handleBodyPage            = function () {
              var plt = this.checkRequestedOS();

              // this condition is to check if the url is on this two options,
              // https://portal_code.knowledgecity.com/lng/mobileapp/android/nougat
              // https://portal_code.knowledgecity.com/lng/mobileapp/android/oreo
              // to use the last part of the url (oreo or nougat) as identifier
              // to click the button that shows the steps on each option

              if( plt == 'android' && this.urlParts.all['length'] == 4 ) {
                var distribution = this.urlParts.all[3].toLowerCase();

                if( distribution == 'nougat' || distribution == 'oreo') {
                  $("#"+distribution).trigger('click');
                }
              }
              $('body').addClass('ios-bg '+ plt );
              $('body').attr('data-plt', plt);
              $('.header').css('display', 'none');
              $('.footer').css('display', 'none');
            };
            function adjustBodyandHeaders () {
                console.log('go in');
                var plt = that.checkRequestedOS();
                $('body').removeClass('ios-bg '+ plt );
                $('.header').css('display', 'block');
                $('.footer').css('display', 'block');
            }

            this.handleBackButton        = function () {

                // window.onpopstate = function(e) {
                //
                //     that.reload();
                // };
            };
        }
        mobileapp.prototype = Object.create(Page.prototype);
        mobileapp.prototype.constructor = mobileapp;

        return mobileapp;

    });
