;define(['jquery', 'lib/CallGet', 'config!', 'smartbanner'], function ($, CallGet, config, Smartbanner) {

    /**
     * @constructor
     */
    function AppDownload(remoteService, mui, config, parentObject) {

        /**
         * @type {RemoteService}
         */
        var service                     = remoteService;

        this.installSelector            = '.installAppPanel';
        this.closeSelector              = '.closeAppPanel';
        this.appPanel                   = '.appPanel';

        const _self = this;

        this.show = function () {

            var appFlag = false;

            if(typeof config.portal.iOSAappID != 'undefined' && config.portal.iOSAappID != '') {
                $('head').append('<meta name="apple-itunes-app" content="app-id=' + config.portal.iOSAappID  + '" />');
                appFlag = true;
            }

            if(typeof config.portal.AndroidAappID != 'undefined' && config.portal.AndroidAappID != '') {
                $('head').append('<meta name="google-play-app" content="app-id=' + config.portal.AndroidAappID + '" />');
                appFlag = true;
            }

            if( typeof config.portal.appTitle != 'undefined' && config.portal.appTitle != '' && typeof config.portal.design != 'undefined' &&
                typeof config.portal.design.appLogo != 'undefined'
            ) {
              $(function () {
                  let filePath = config.portal.design.appLogo.replace(/.*\/(.*)$/, '$1');
                  filePath = parentObject.addRVTnumber(filePath);
                  let template = config.portal.template;
                  let icon_image = template == 'ussite' ? config.pathTemplate + '/images/KC-logo-circle-only--v'+config.portalStorageStamp+'.png' : `${config.CDNPortal}opencontent/portals/${config.portalID}/assets/images/app/mobile/${filePath}`;
                  $.smartbanner({
                      daysHidden: 1,
                      daysReminder: 90,
                      title: config.portal.appTitle,
                      icon:   icon_image,
                      onInstall: function() {
                          $('body').removeClass('app-bar-padding');
                          $('header').css({'margin-top':'0px'});
                          $('.contentBody').removeClass('app-bar-margin');
                          $('.mobil-header').removeClass('app-bar-margin');
                          $('.inner-header.inner-header--lms').removeClass('app-bar-margin');
                          if( template == 'ussite' ){
                              $('header').removeClass('bar-top');
                              $('#contentBody').css({'margin-top':'0px'});
                          }
                      },
                      onClose: function() {
                          $('body').removeClass('app-bar-padding');
                          $('header').css({'margin-top':'0px'});
                          $('.contentBody').removeClass('app-bar-margin');
                          $('.mobil-header').removeClass('app-bar-margin');
                          $('.inner-header.inner-header--lms').removeClass('app-bar-margin');
                          if( template == 'ussite' ){
                              $('header').removeClass('bar-top');
                              $('.contentBody').css({'margin-top':'0px'});
                              if( $('#usermenu').hasClass('active') ) {
                                  $('.mobil-header').css('height', '100%');
                              }
                          }
                      }
                    });

                  // if($('header').css('position') == 'fixed') {
                  //     $('header').css({'margin-top':'80px'});
                  // }
              });

              // var iOS                     = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
              // var installed               = $.cookie('installed');
              // var closed                  = $.cookie('closed');
              // var installAppWord          = typeof mui['appInstall'] != 'undefined' ? mui['appInstall'] : 'Install';
              // var installAppSentence      = typeof mui['appInstallLong'] != 'undefined' ? mui['appInstallLong'] : 'Click here to install the app';
              // if(iOS &&!installed && !closed) {
              //     $('#appPanel').removeClass('hidden');
              //     $(this.installSelector).text(installAppWord);
              //     $('.appText').find('span').text(installAppSentence);
              //     _self.setHandlers();
              // }

            }


        };

        /**
         * The method setup additional handlers
         */
        this.setHandlers = function () {

            var offClick = [
                this.closeSelector, this.installSelector
            ];

            $(offClick).each(function (index, element) {
                $(document).off('click change', element);
            });

            $(document).on('click', this.closeSelector, function (event) {
                _self.hide(event);
            });

            $(document).on('click', this.appPanel, function (event) {
                _self.getAppLink(event);
            });
        };

        /**
         * Hide form
         */
        this.hide = function (event) {
            if(event) {
                event.stopPropagation();
            }

            $('#appPanel').addClass('hidden');

            _self.setCookieValue('closed', true, 1);
        };

        /**
         * Get App link
         */
        this.getAppLink = function () {

            var promise                 = $.Deferred();

            var userData                = $.cookie('LocalUserData');

            var data                   = typeof userData != 'undefined' ?  {api_token:userData['sessionId']} : {};

            var portalGUID              = config['portalID'];

            service.query(new CallGet('portals/' + portalGUID + '/appurl/', data, function (res) {

                if (res.code == '200' && typeof res.response.code != 'undefined') {

                    _self.hide(false);

                    _self.setCookieValue('installed', true, 0);

                    promise.resolve();

                    window.location = "https://buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/freeProductCodeWizard?code=" + res.response.code;
                    //window.location = "http://api.loc/v2/?code=" + res.response.code;

                } else {

                    console.error('Error');
                    promise.reject(self.E_SERVER);
                    _self.hide();
                }


            }).defineErrorHandler(function (query, status, errorThrown) {

                console.error('Error');
                promise.reject(self.E_SERVER);

            }));

        };

        this.setCookieValue = function (key, value, range) {

           $.cookie.json    = true;

            var date        = 2147483647;

            if(range == 1) {

                date                    = new Date();
                var minutes             = 30;

                if(typeof config['localExpires'] !== 'undefined') {
                    minutes             = config['localExpires'];
                }

                date.setTime(date.getTime() + (minutes * 60 * 1000));
            }

            $.cookie(key, value, {'expires': date});

        };


    }

    return AppDownload;
});
