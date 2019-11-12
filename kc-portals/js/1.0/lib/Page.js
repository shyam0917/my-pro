;//noinspection JSAnnotator
define([
        'config!',
        'jquery',
        'history',
        'mustache',
        'lib/AppLocation',
        'lib/RemoteCall',
        'lib/CallGet',
        'lib/CallDelete',
        'lib/CallPost',
        'lib/CallPortal',
        'lib/ServicesIntegrator',
        'lib/User',
        'lib/UserCourses',
        'ui/DemoVideo',
        'ui/LoginForm',
        'ui/ModalWindow',
        'ui/PreviewModal',
        'ui/HowItWorksModal',
        'ui/RequestAppModal',
        'ui/AppDownload',
        'ui/SearchForm',
        'ui/player',
        'ui/FeedbackForm',
        'videoplayer',
        'ui/Dropdown',
        'tinCanApi',
        'scormApi'
    ],
    function(
        config,
        $,
        History,
        Mustache,
        AppLocation,
        RemoteCall,
        CallGet,
        CallDelete,
        CallPost,
        CallPortal,
        ServicesIntegrator,
        User,
        UserCourses,
        DemoVideo,
        LoginForm,
        ModalWindow,
        PreviewModal,
        HowItWorksModal,
        RequestAppModal,
        AppDownload,
        SearchForm,
        Player,
        FeedbackForm,
        videojs,
        TinCanApi,
        ScormApi
        ){

    function Page() {

        this.appLocation            = new AppLocation();

        this.backButtonPrevented    = false;
        if(typeof kcpack === 'object'){
            //see defineMainData()
        }
        // history
        var history                 = History.createHistory();
        /**
         * ServicesIntegrator
         * @type {ServicesIntegrator}
         */
        var service                 = new ServicesIntegrator(config);

        // current page object and location
        var page;

        var version                 = config['version'];
        var portalName              = config['portalName'];
        var portalId                = config['portalID'];
        var pathTemplate            = config['pathTemplate'];
        var mainTemplate            = config['mainTemplate'];
        var contentHtml;
        var mainHtml;
        var language                = config['default_lang'];
        /**
         * Main Data for Main template
         */
        var mainData;
        /**
         * Content data for Content template
         */
        var contentData;

        const mobileWidth           = 999;


        /**
         * target append for outTo
         * @type {string}
         */
        this.APPEND_TO_BODY         = '!append!';

        /**
         * Page config
         */
        this.config                 = config;

        /**
         * Page template engine
         */
        this.templater              = Mustache;

        /**
         * jQuery promise for define data
         */
        this.defineDataPromise      = $.Deferred();
        /**
         * jQuery promise for output content area
         */
        this.outMainPromise         = $.Deferred();
        /**
         * jQuery promise for output content area
         */
        this.outContentPromise      = $.Deferred();

        this.loadStylesPromise      = $.Deferred();

        /**
         * Current site path
         * @type {Array}
         */
        this.currentPath            = [];
        /**
         * User driver
         * @type {User}
         */
        this.user                   = new User(service, config['user'], config['portalID'], config['APIUrl']);


        /**
         * Object for control courses
         * @type {UserCourses}
         */
        this.userCourses            = null;

        //this.urlParts               = null;

        var openedMenu              = false;

        /**
         * Returns class name
         *
         * @returns {string}
         */
        this.getClassName           = function() {

            var funcNameRegex        = /function (.+)\(/;
            var results              = (funcNameRegex).exec((this).constructor.toString());

            return (results && results.length > 1) ? results[1] : '';
        };

        this.getLanguage            = function () {

            return language;
        };

        this.getLanguages           =   function() {

            return config['languages']

        };

        this.dispatcher             = function () {

            const that              = this;

            that.user.init();

            var parentWrapper       = typeof kcpack === 'object' ? '.kcpack' : document;

            $(parentWrapper).on('click', function (e) {

                var pNode           = e.target;

                var node            = e.target;

                //no handle img in IE
                if(e.target && e.target.nodeName == 'IMG') {
                    return true;
                }

                while(node && !node.href) {

                    node = node.parentNode;
                }

                var noHandle        = false;

                //no handle node with _blank, data-lessonid, data-reload, all URL with #, link to pdf
                if( pNode && $(pNode).data('lessonid') && $(pNode).data('lesson-type') != 'scorm'  ||
                    node && $(node).attr('target') && $(node).attr('target') == '_blank'||
                    node && $(node).data('lessonid') ||
                    node && $(node).data('reload') ||
                    node && node.href.search('#') > 0 ||
                    node && node.href.search('.pdf') > 0 ||
                    node && node.href.search('mailto') >= 0 ){

                    noHandle        = true;
                }

                if(node && !noHandle) {

                    e.preventDefault();

                    window.history.pushState({}, '', node.href);

                    that.onChangeLocation();

                    that.appLocation.cachePromise();
                }

            });

            window.onpopstate = function(e) {

                that.onChangeLocation();

                that.appLocation.cachePromise();
            };

            that.preProcessURL();
            that.onChangeLocation();
        };

        this.preProcessURL          = function() {
            //here we can intercept any query parameters or other
            var p={};location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(s,k,v){p[k]=v})
            //URL processing relating to 'inbound' users coming from other sites

            //check for ssoid
            var ssoid = (location.search.match(/ssoid=(.{36})/i) || [0,null])[1]
            if(ssoid)
                localStorage.setItem("ssoid", ssoid);

            //check for ssoid
            var authid = (location.search.match(/authid=(.{36})/i) || [0,null])[1]
            if(authid) {
                localStorage.setItem("authid", authid);
                localStorage.setItem("authlu", ""); //make sure to reset in case authid changed or lu/lp params removed
                localStorage.setItem("authlp", "");
                localStorage.setItem("authfw", "");
            }

            //check for link-based password for ssoid (eg libraries with default pin)
            if(p['authlp'])
                localStorage.setItem("authlp", decodeURIComponent(p.authlp));

            //check for link-based user for ssoid (eg link-based integrations)
            if(p['authlu'])
                localStorage.setItem("authlu", decodeURIComponent(p.authlu));

            //check for forward based external authetication (eg log in on 3rd party page and redirect back)
            if(p['authfw'])
                localStorage.setItem("authfw", decodeURIComponent(p.authfw));

        };

        this.isCountryAllowed      = function () {

            const that             = this;

            let promise = $.Deferred();

            if(typeof this.config.forceCountryAllowed !== 'undefined'){
                return promise.resolve(this.config.forceCountryAllowed);
            }

            var visitorLocalsettings = JSON.parse(localStorage.getItem("visitorLocalsettings"));

            if(deepInObject(visitorLocalsettings, 'ipInfo.country')){
                var isAllowed = that.isCountryAllowedAction(visitorLocalsettings)
                promise.resolve(isAllowed);
            } else {

                this.remoteCall(new CallGet('visitor/localsettings/',
                    {}, (r) => {
                        localStorage.setItem("visitorLocalsettings", JSON.stringify(r.response));
                        var isAllowed = that.isCountryAllowedAction(r.response)
                        promise.resolve(isAllowed);

                }).defineErrorHandler(function (query, status) {

                    promise.reject(that.E_SERVER, this);

                }));

            }
            return promise;
        };

        this.isCountryAllowedAction = function(visitorLocalsettings){
            var allowedCountries = this.config.allowedCountries;
            var isAllowed = false;
            var visitor_country = visitorLocalsettings.ipInfo.country;
            $.map(allowedCountries, ( country, index ) => {
                if(country == visitor_country) {
                    isAllowed = true;
                }
            });
            return isAllowed;
        }

        this.onChangeLocation      = function () {

           const that              = this;

           $.when(this.appLocation.cachePromise()).then(this.defineMainData()).then( cache => {

               if(config.portal.error) {
                   that.generatePageError();
                   return;
               }

               this.user.detectUser();

               if(this.user.isAuth() && this.user.isTna() && this.appLocation.urlParts.pageController !== 'myLearning' && this.appLocation.urlParts.pageController !== 'autoLogin') {
                    //if user should do TNA, needs to be at myLearning
                    this.appLocation.urlParts.pageController = 'myLearning';
                    this.updateUserView();
                    return;
               }

               if(typeof kcpack === 'object') {

                   this.appLocation.urlParts.pageController = 'courses';
               }

               
               if(this.appLocation.urlParts.pageController !== 'autoLogin' && config.isLoginRequired && !this.user.isAuth() ){

                    this.appLocation.urlParts.pageController = 'requiredLogin';
               }

               require([this.appLocation.urlParts.pageController, pathTemplate + '/template--v' + config.LocalStorageStamp + '.js'], function (module, template) {

                    if(typeof module == 'undefined') {
                        console.log('redirect404() in page.onChangeLocation');
                        that.redirect404();
                    }

                    that.onLoadModule(module, template);
                    window.scrollTo(0,0);

               }, function (error) {
                console.log('module: '+this.appLocation.urlParts.pageController)
                console.log('template: '+pathTemplate + '/template--v' + config.LocalStorageStamp + '.js')
                    console.log('error:')
                    console.log(error)
                    that.onErrorLoadModule(error);
               });
            });
        };

        //check and clear Local Storage,
        this.checkCEID              = function (data) {

            $.cookie.json           = true;

            var clearedLS           = $.cookie('clearedLS');
            var feedbackNoCEID      = $.cookie('feedbackNoCEID');

            if( data && data.sections && data.sections[0] && !data.sections[0].ceid ) {

                if(clearedLS && !feedbackNoCEID) {

                    this.remoteCall(new CallPost('help/feedback/', {
                                    first_name: 'Clear Local Storage',
                                    question: 'No ceid detected after refresh LocalStorage. ' +
                                    new Date() + ' ' +
                                    navigator.userAgent + ' ' +
                                    this.getPortalName()
                    }, function () {

                        $.cookie('feedbackNoCEID', true, {'expires': 365, 'path': '/'});

                    }));
                }

                if(!clearedLS && !feedbackNoCEID) {

                    $.cookie('clearedLS', true, {'expires': 365, 'path': '/'});

                    localStorage.clear();

                    this.redirectHome();
                 }
            }
        };

        this.onLoadModule           = function(module, template) {

            if(typeof(module) !== 'function') {

                return;
            }

            page                    = new module();

            // apply trait
            if(typeof template === 'function') {

                template(page);
            }

            if(typeof(page.init) !== 'function') {

                return;
            }

            page.init().done(function () {

                page.out().then(function(){

                });
            });
        };

        this.removeMessenger            = function() {

            $(".msnger-link").addClass("hide");

        }

        this.addMessenger               = function() {

            $(".msnger-link").removeClass("hide");

        }

        this.onErrorLoadModule          = function(error) {
            console.log('redirect404() in page.onErrorLoadModule');
            this.redirect404();
        };

        /**
         * Start method
         */
        this.init                   = function () {

            const that              = this;

            that.user.init();

            return this.appLocation.cachePromise().then(function () {

             that.lockPage();

             that.urlParts          = that.appLocation.urlParts;

             language               =  that.urlParts.pageLanguage;

            //this.definePath();

            var userReadyPromise    = $.Deferred();

             that.userCourses       = new UserCourses(that.user, service, portalName, that.getLanguage());
            /**
             * Link promises to the dependence
             */

                that.outMainPromise.done(function () {

                        that.renderContent();

                }).done(function () {
                    $('#loading-overlay').fadeOut(300);
                    that.outContentPromise.resolve();

                    if (typeof ga === 'function') {
                        ga('set', 'page', window.location.href.toString().split(window.location.hostname)[1]);
                        ga('send', 'pageview')
                    }
                });
            });
        };

        /**
         * Main output method
         *
         * @return {Promise}
         */
        this.out                    = function () {

            const that              = this;

            return $.when(this.defineData(), this.loadMainTemplate(), this.loadContentTemplate())
            .then(function () {

                that.defineDataPromise.resolve();

            }).then(function () {
                // all templates and data will be loaded

                        that.renderMain();


                    if (config['getClickyID']) {

                        require(['//static.getclicky.com/js'], function(){

                            try{ window.clicky.init(config['getClickyID']); } catch(e){console.log(e);}
                        }, function (err) {
                           console.log(err)
                        });

                    }
                    that.outMainPromise.resolve();
                    that.showVideoOnStartup();
            });
        };

            /*
            If the portal have a video to show in "how it works" at the header's
            main menu and the hash #learnHow is on the url, the popup should be
            displayed once the portal has been loaded.
            */

        this.showVideoOnStartup     = function () {

            if( that.config.portal.showHowWorksLink ) {
                $.when(this.outContentPromise, this.loadStylesPromise).done ( () => {
                    if( that.config.portal.showHowWorksLink && window.location.hash != "" &&
                        window.location.hash == '#learnHow' &&
                            $("#videoWindow.cloned").length == 0
                            )   {
                                 that.onShowDemoVideo('a.learn-how__link', window.event, true );
                                }
                        });
                    }
        };

        /**
         * Returns portal Name
         * @return {string}
         */
        this.getPortalName          = function () {

            return portalName;
        };

        this.getPortalId            = function(){
            return portalId;
        };

        this.getHistory             = function () {

            return history;
        };

        this.getContentData         = function () {

            return contentData;
        };

        this.setContentData         = function (data) {

            contentData             = data;

        };

        this.getContentHtml         = function () {

            return contentHtml;
        };

        this.setContentHtml     = function (template) {

            contentHtml             = template;
        };

        this.getMainHtml         = function () {

            return mainHtml;
        };

        this.setMainHtml            = function (template) {

            mainHtml                = template;
        };

        /**
         *
         * @return {*|{}}
         */
        this.getMui                 = function () {

            return typeof this.getMainData().mui !== 'undefined' ? this.getMainData().mui : {};
        };

        this.invalidateMain         = function () {

            window['isMainOut']     = false;
        };

        /**
         * The method update user information on the page
         */
        this.updateUserView         = function () {
            var user = this.user;
            this.getAccountConfig(user.getAccountId(), user).done(function (account) {
              var url = ( typeof account.redirect == 'undefined' || account.redirect == '' ) ? 'myLearning' : account.redirect == 'home' ? 'index' : account.redirect;
              if(that.user.needChangePass())
                url = 'myAccount';

              if(user.isTna()){ //mylearning runs tna so if user should do tna, they should start at mylearning
                url = 'myLearning';
              }
              
              that.invalidateMain();

              that.redirect( url );

            });

        };


        this.isMainOut              = function () {

            if(typeof window['isMainOut'] === 'undefined') {

                window['isMainOut'] = false;
            }

            return window['isMainOut'];
        };

        this.setMainOut             = function (state) {

            window['isMainOut']     = state;
        };

        this.loadMainTemplate       = function () {

            if(this.isMainOut()) {

                return $.when();
            }

            const that              = this;

            return this.loadTemplate(mainTemplate, function (html) {
                that.setMainHtml(html);
            }).fail(function () {
                console.error('Failed load main template: ' + mainTemplate);
                $('body').html('<h1>The site load error!</h1>');
            });
        };

        this.loadContentTemplate    = function () {

            const that              = this;

            return this.loadTemplate(this.defineTemplate(), function (html) {
                that.setContentHtml(html);
            });
        };

        /**
         *
         * @return {Promise}
         */
        this.defineMainData         = function () {

            const that          = this;

            if(typeof mainData !== 'undefined') {

                return $.when();
            }

            language                = this.appLocation.urlParts.pageLanguage;
            mainData                = {};

            //for testing SCORM ///////////////////////////////////////////

             // window.kcpack = {
             //   "accountId": "c84994b6-17b5-4dcf-b41b-fb82a9557fc1",
             //   "productGroupId": "fb9c89adcae2c6fe7635f6a011f0849b",
             //   "subscriptionCycle": "1 Year",
             //   "startLang": "en",
             //   "subscriptionType": "bcs",
             //   "autoLogin": "1",
             //   "autoLicense": "1",
             //   "autoRenew": "1",
             //   "contentPath": "http://kctest.kc-portals.localhost/",
             //   "apiHost": "https://api.knowledgecity.com",
             //   "scripts": ["{{VENDORS}}kc/kcpack/getportalbundle.js"],
             //   "courseId": "BUS1125",
             //   "title": "Employee Engagement",
             //   "id": "ef4cc25d-2329-47c7-bfb8-68bfdc6d6174"
             // }

            ////////////////////////////////////////////////////////////////


            if(typeof kcpack === 'object')
                mainData.kcpack = kcpack;

            // paths
            mainData.VIEW           = pathTemplate + '/';
            mainData.IMG            = pathTemplate + '/images/';
            mainData.IMG_LANG       = pathTemplate + '/images/' + language +  '/';
            mainData.IMG_STYLE      = pathTemplate + '/images/style/' + config['style'] +  '/';
            mainData.VENDORS        = config['CDNVendors'];
            mainData.CDN            = config['CDNContent'];
            mainData.CDN_PORTAL     = config['CDNPortal'] + 'opencontent/portals/' + config['portalID'];
            mainData.isLoginRequiredNew = config.portal['isLoginRequiredNew'];

            var googleAnalytics     = null;
            if( config['googleAnalyticsID'] ) {
                googleAnalytics = "<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');ga('create', '" + config['googleAnalyticsID'] + "', '"  + window.location.hostname + "'); </script>";
            }

            if ( ( typeof config.portal.iOSAappID  == 'undefined' || config.portal.iOSAappID  == '') && ( typeof config.portal.iOSAappEnterprise != 'undefined' && config.portal.iOSAappEnterprise == true ) ) {
                config.portal.iOSAappID = true;
            }
            // android non play store applications
            if ( ( typeof config.portal.AndroidAappID  == 'undefined' || config.portal.AndroidAappID  == '') && ( typeof config.portal.androidNotStore != 'undefined' && config.portal.androidNotStore == true ) ) {
                config.portal.AndroidAappID = true;
            }
            // this appRequestBlockOnTop value comes to rb template to show
            // request buttons of apps in the top menu if true, if false, should be
            // shown on footer (as default)
            config.portal.appRequestBlockOnTop = ( typeof config.portal.appRequestBlockOnTop == 'undefined' ) ? false : config.portal.appRequestBlockOnTop;
            mainData.site           = {

                "language":         language,
                url:                this.defineBaseUrl(),
                url_with_lang:      this.defineBaseUrlWithLang(),
                style:              config['style'] ? pathTemplate + '/css/style/' + config['style'] + '--v' +
                                    config['LocalStorageStamp'] + '.css' : `${mainData.CDN_PORTAL}/assets/css/style--v${config['portalStorageStamp']}.css`,
                libraryUrl:         this.generateNewUrl('library'),
                getClickyID:        config['getClickyID'],
                googleAnalytics:    googleAnalytics,
                showHowWorksLink :  config.portal.showHowWorksLink || false,
                arbitraryCode:      config['arbitraryCode'] || null,
                config:             config,
                appRequestBlockOnTop: config.portal.appRequestBlockOnTop,
                appRequestBlock:    ( config.portal.iOSAappID || config.portal.AndroidAappID ),
                links: {
                    privacy:        this.generateNewUrl('privacy'),
                    terms:          this.generateNewUrl('terms')
                },
                LocalStorageStamp:  config['LocalStorageStamp']
            };

            mainData.page           = {

                favicon:            mainData.IMG + 'favicon.ico',
                portalName:           config['portalName']
            };

            // rewrite default values
            if(typeof config.portal['design'] !== 'undefined') {
                if(
                    typeof config.portal['design']['langs'] !== 'undefined' &&
                    typeof config.portal['design']['langs']['logo-' + language] !== 'undefined' &&
                    config.portal['design']['langs']['logo-' + language] !== null
                    ) {

                    let logoName = config.portal['design']['langs']['logo-' + language].replace(/.*\/(.*)$/, '$1');
                    logoName = this.addRVTnumber(logoName);
                    mainData.site.logo = `${mainData.CDN_PORTAL}/assets/images/${logoName}`;

                }else if(
                    typeof config.portal['design']['logo'] !== 'undefined' &&
                    config.portal['design']['logo'] !== null
                    ) {

                    let logoName = config.portal['design']['logo'].replace(/.*\/(.*)$/, '$1');
                    logoName = this.addRVTnumber(logoName);
                    mainData.site.logo = `${mainData.CDN_PORTAL}/assets/images/${logoName}`;
                }

                if(
                    typeof config.portal['design']['favicon'] !== 'undefined' &&
                    config.portal['design']['favicon'] !== null
                    ) {

                    let faviconName = config.portal['design']['favicon'].replace(/.*\/(.*)$/, '$1');
                    faviconName = this.addRVTnumber(faviconName);
                    mainData.page.favicon =`${mainData.CDN_PORTAL}/assets/images/${faviconName}` ;
                }

                if(
                    typeof config.portal['design']['certificate'] !== 'undefined' &&
                    config.portal['design']['certificate'] !== null
                    ) {

                    let certificateName = config.portal['design']['certificate'].replace(/.*\/(.*)$/, '$1');
                    certificateName = this.addRVTnumber(certificateName);
                    mainData.page.certificate =`${mainData.CDN_PORTAL}/assets/images/${certificateName}`;

                } else {

                    mainData.page.certificate =`${mainData.IMG}/certificate.jpg`;

                }

            }

            mainData.isDesktop = $(window).width() > mobileWidth;

            return $.when(this.defineUser(), this.loadMui());
        };


        this.defineUser             = function () {//check if we can move new user and user init and usercourses in here
            // user info
            var userReadyPromise = $.Deferred();

            userReadyPromise.done(()=>{
                if(this.user.isAuth()) {
                    mainData.user       = {
                        'userId':               this.user.getUserId(),
                        'login':                this.user.getLogin(),
                        'name':                 this.user.getName(),
                        'isTest':               this.user.isTest(),
                        'isMessenger':          this.user.isMessenger(),
                        'myLearningUrl':        this.generateNewUrl('myLearning'),
                        //'logoutUrl':           this.generateNewUrl('logout'),
                        'myAccountUrl':         this.generateNewUrl('myAccount'),
                        'courseHistoryUrl':     this.generateNewUrl('courseHistory'),
                        'coursesForSelectUrl':  this.user.isCoursesConfirmation() ? this.generateNewUrl('coursesForSelect') : null,
                        'coursesForCloneUrl':   this.user.isCoursesConfirmation() ? this.generateNewUrl('coursesForClone') : null,
                        'myAdminToolsUrl':      that.user.getUserAccountAdmin() ? '/#' : false
                    };
                }
            });

            if(false){//in case need some external data on user or auth test at this point
                this.doSomething().then(function(){
                    userReadyPromise.resolve();
                });
            }else{
                userReadyPromise.resolve();
            }

            return userReadyPromise;
        };

        /**
         * This is method should be defined in the child class
         * for loading content area data.
         *
         * @return {Promise}
         */
        this.defineContent          = function () {

            var promise             = $.Deferred();

            promise.resolve();

            return promise;
        };

        /**
         * Loading all string localization for current lang from API
         */
        this.loadMui                 = function (groups, setMainMui) {

            if(typeof groups === 'undefined'){
                groups = 'txtLabels,topMenuItems,topMenuLinks,HeaderMenuLinks,pageTitle,page,mpitems,footerItems,footerTXT,companyInfo,header,pageContent,pageKeywords';
            }

            return this.remoteCall(new CallGet('mui/0' + portalName + '/0' + language + '/',
                {
                    // all strings
                    'code': 'all',
                    // format to nested arrays
                    'nested': true,
                    // exclude pages big content
                    'groups': groups,
                    '_': config['LocalStorageStamp']
                }, function (data) {

                    if(setMainMui !== false){

                        if(typeof data.response !== 'undefined') {

                            if(deepInObject(data, 'response.footer.copyright')) {
                                data.response.footer.copyright = that.changeFooterYear( data.response.footer.copyright );
                            }
                            mainData.mui  = data.response;
                        }  else {
                            mainData.mui  = {};
                        }

                    }
                }
            // this call marked as Cached and LocalCached
            ).asCached().asLocalCached());

        };

        this.changeFooterYear       = function ( legend ) {
            var year   = new Date().getFullYear();
            legend     = legend.replace( '2017', year );
            return legend;
        };

        this.getMainData            = function () {

            return typeof mainData !== 'undefined' ? mainData : {};
        };

        /**
         * Define template name
         *
         * @returns {string}
         */
        this.defineTemplate         = function () {

            if(typeof kcpack === 'object') {

                this.appLocation.urlParts.pageController = 'courses';
            }

            var template            = this.appLocation.urlParts.pageController;

            return template == 'myLearningKC' ? 'myLearning' : template;
        };

        /**
         * Define data for template
         *
         * @returns {Promise}
         */
        this.defineData             = function () {

            return $.when(this.defineMainData(), this.defineContent());
        };

        /*
        * Render Facebook Pixel ( just for knowledgecity.com )
        */

        this.renderFacebookPixel    = function () {
            if( config['portal']['portal_code'] === 'www' ) {
                if(this.appLocation.urlParts.all[1] == 'landingFacebook' ) {
                   $('head').append("<!-- Facebook Pixel Code --><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '1926496504263076');fbq('track', 'PageView');fbq('track', 'Purchase', {value: '0.99', currency: 'USD'});</script><noscript><img height='1' width='1'src='https://www.facebook.com/tr?id=1926496504263076&ev=PageView&noscript=1'/></noscript><!-- End Facebook Pixel Code -->");
                } else {
                   $('head').append("<!-- Facebook Pixel Code --><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '1926496504263076');fbq('track', 'PageView');</script><noscript><img height='1' width='1'src='https://www.facebook.com/tr?id=1926496504263076&ev=PageView&noscript=1'/></noscript><!-- End Facebook Pixel Code -->");
                }
            }
        };

        /**
         * Render main template
         */
        this.renderMain             = function () {

            var that = this;

            if(this.isMainOut()) {
                that.loadStylesPromise.resolve();

                $("[data-lang]").each(function(){

                    var lang = $(this).data('lang');

                    $(this).find('a').attr('href', that.switchLanguageUrl(lang));
                });

                return;
            }

            $('body').fadeTo(0,0);

            this.setMainOut(true);

            var template            = this.getMainHtml();

            // Replace head tag to <div id="html-head">
            template                = template.replace('<head>', '<div id="html-head">');
            template                = template.replace('</head>', '</div>');
            // and body to id="html-body"
            template                = template.replace(/<body(.*)>/, '<div id="html-body"$1>');
            template                = template.replace('</body>', '</body">');

            var node                = $($.parseHTML('<div>' + template + '</div>', null, false));

            this.handleControllers(node);

            var html                = this.templater.render(node.html(), mainData);

            html                    = $('<div>' + html + '</div>');

            // separate headers and body
            $('head').append(html.find('#html-head').html());


            $('link[rel="icon"]').attr('href', mainData.page.favicon);
            $('link[rel="shortcut icon"]').attr('href', mainData.page.favicon);

            if("kcpack" in this.getMainData() && $('#course_page').length > 0)
                $('#course_page').html(html.find('#html-body').html()).attr('class', html.find('#html-body').attr('class'));
            else
                $('body').html(html.find('#html-body').html()).attr('class', html.find('#html-body').attr('class'));

            $('link[href*="kcquiz"]').remove();


            var stylesLoaded = function(){

                var deferreds = [];

                var notLoaded = $('link[data-required="true"][href*=".css"]').not(".loaded");

                if (notLoaded.length) {

                    notLoaded.each(function(){

                        var def = new $.Deferred();

                        $(this).on('load', function(){

                            $(this).addClass('loaded');
                            def.resolve();

                        });

                        deferreds.push(

                            def.done()

                        );

                    });

                } else {
                    $('body').fadeTo(300,1,function(){$(this).css('background','').css('filter','').css('position','').css('min-height','')}).scrollTop(0);
                }
                return deferreds;

            };

            $.when.apply($, stylesLoaded()).then(function(){
                $('body').fadeTo(300,1,function(){$(this).css('background','').css('filter','').css('position','').css('min-height','')}).scrollTop(0);

                that.showApps( mainData.mui);
                that.showChat();
                that.ctrlDropDownList();
                that.ctrlScrollUp();
                that.checkFirstLogin();
                that.checkSSOLogin();

                that.loadStylesPromise.resolve();
                that.popstateListener();
                that.checkAlert();

            });

            that.assignPageHandlers();
            this.user.getProfile().then(function(data){

            });

        };
        this.markMenuPage           = function () {
            this.unmarkMenus();

            var tag = this.getMarkTag();
            this.markLink( tag );
        };

        this.getCleanPath           = function () {
            var originalPath = window.location.pathname.split('/');
            var path = [];
            $.each(originalPath, function( index, value ) {
                if( value != '' ) {
                    path.push(value);
                }
            });
            return path;
        };
        this.getMarkTag             = function () {

            var tag;
            var path = this.getCleanPath();
            if(path.length <= 1 ) {
                tag = 'a[href="/'+this.getLanguage()+'/"]';
            } else {
                // path.shift();
                var url = path.join('/');
                tag = 'a[href*="'+url+'"]';

            }
            return tag ;
        };
        this.unmarkMenus            = function () {
            $('body').find( 'a[data-tab!="action"]' ).removeClass( 'active' );
        };

        this.markLink               = function ( tag ) {
            $('body').find( tag ).each(function () {

                if( $( this ).closest( '.library-icon-wrapper' ).length == 0 ) {
                    $( this ).addClass( 'active' );
                }
            })
        };

        /**
         * Render content area
         */
        this.renderContent          = function () {

            var node                = $($.parseHTML('<div>' + this.getContentHtml() + '</div>'));

            this.handleControllers(node);

            var data                = $.extend(mainData, contentData);

            this.renderMetaData(contentData);
            this.renderFacebookPixel();
            this.addCanonical(data.canonical);

            try {
                this.outTo(this.templater.render(node.html(), data));
                this.assignPageHandlers(this.getContentSelector());

                if(this.getClassName() === 'Messenger')
                    $(".messenger-comment-container").addClass("hide");
                else{

                    if(that.user.isAuth() === true)
                        $(".messenger-comment-container").removeClass("hide");
                    else
                        $(".messenger-comment-container").addClass("hide");

                }


                if (
                    this.getClassName() === 'SignUp' ||
                    this.getClassName() === 'SignUpLms ' ||
                    this.getClassName() === 'SignUpContentCreation' ||
                    this.getClassName() === 'RequestADemo' ||
                    this.getClassName() === 'EmployeeTraining' ||
                    this.getClassName() === 'lms'
                ) {

                    $('[data-signup="false"]').addClass('hidden');
                    $('[data-signup="true"]').removeClass('hidden');
                    $('head').append('<META NAME="robots" CONTENT="noindex,nofollow">');

                }
                else {
                    $('[data-signup="true"]').addClass('hidden');
                    $('[data-signup="false"]').removeClass('hidden');
                    $('head').find('META[NAME="robots"][CONTENT="noindex,nofollow"]').remove();

                }

                var isMessenger = localStorage.getItem("Messsenger");

                if(isMessenger != "true")
                    that.removeMessenger();
                else
                    that.addMessenger();

            } catch (exception) {
                console.error(exception.toString());
            }

        };
        /**
         * Handle controllers definition for jQuery node
         *
         * @param node
         */
        this.handleControllers      = function (node) {

            const that              = this;

            node.find('[data-ctrl]').each(function () {
                that.executeController($(this).attr('data-ctrl'), $(this));
                $(this).removeAttr('data-ctrl');
                $(this).removeAttr('data-params');
            });

            $(window).resize(function() {

                var isDesktop   =   $(window).width() > mobileWidth;

                if(mainData.isDesktop != isDesktop) {

                    mainData.isDesktop = isDesktop;

                    var from = isDesktop ? 'mobile' : 'desktop',
                        to   = isDesktop ? 'desktop' : 'mobile';

                    that.replaceNodes(from, to);

                }

                if($(window).width()>480) {
                    that.closeLeftMobMenu();
                }

            });

        };

        this.replaceNodes       = function(from, to) {


            $("[data-" + from + "]").each(function(){

                var id = $(this).data(from);

                $("[data-" + from + "='" + id  +"']").find("[data-replace]").appendTo($("[data-" + to + "='" + id  +"']"))

            });

        };

        /**
         * Execute controller for node.
         *
         *
         * @param   {string}                controller
         * @param   {jQuery|HTMLElement}    node
         *
         * @returns {boolean}
         */
        this.executeController      = function (controller, node) {

            var params              = node.attr('data-params');

            if(typeof params === 'string') {

                try {
                    params              = JSON.parse(params);
                } catch (exception) {
                    params              = {};
                }
            }

            // if this controller is the method
            if(controller.substr(0, 1) !== '@') {

                controller          = 'ctrl' + controller;

                if(typeof(this[controller]) === 'function') {
                    this[controller](node, params);
                }

                return true;
            }

            // if this controller is the class name
            controller              = controller.substr(1);

            controller              = controller.split('.');

            var objectClass         = controller[0];
            var method              = 'out';

            if(controller.length === 2) {
                method              = controller[1];
            }

            /**
             * For asynchronous call, we must give html node identifier
             * to it after it was possible to substitute for these
             */
            var template            = node.html();
            var targetId            = node.attr('id');

            // If id not defined - define
            if(typeof targetId === 'undefined') {

                targetId            = 'id-' + Math.random().toString().substring(2);
                node.attr('id', targetId);
            }

            const that              = this;

            require([objectClass], function (constructor) {

                var object          = new constructor(that, template, targetId);

                if(typeof(object[method]) === 'function') {
                    object[method](params);
                }
            });
        };

        /**
         * Method show progress status for node
         * Method hide html-template data and replacing to progress
         *
         * @param node
         */
        this.showProgressStatus     = function (node) {
            node.html('loading progress...');
        };

        /**
         *
         * @param node
         */
        this.getTemplateFromNode    = function (node) {
            return node.html();
        };

        /**
         * Method bind handler to this object method according
         * template meta-data
         *
         * @param   {jQuery|string=}  prefix
         * @param   {Object=}         object
         * @param   {boolean=}        isUnbind
         */
        this.assignPageHandlers     = function (prefix, object, isUnbind) {

            prefix                  = typeof prefix === 'undefined' ? '' : prefix;

            var node                = typeof prefix === 'string' ?
                                        $(prefix + ' [data-handler]') :
                                        prefix.find('[data-handler]');

            const that              = this;

            if(typeof object === 'undefined' || object === null) {
                object              = this;
            }

            node.each(function () {

                var handler         = $(this).attr('data-handler');
                //console.log(handler);
                if(handler.substr(0, 2) !== 'on' || typeof(object[handler]) !== 'function') {

                    return;
                }

                var action          = $(this).attr('data-handler-action');


                if(typeof action === 'undefined' || action === '') {
                    action          = that.getTagDefaultAction($(this).prop('tagName'));
                }

                if(isUnbind === true) {
                    $(this).unbind(action);
                }

                $(this).unbind(action).bind(action, function (event) {
                    object[handler](this, event);
                });
            });

            that.closeLeftMobMenu();

            if ($(window).width() <= mobileWidth) {
                that.replaceNodes('desktop', 'mobile');
                $('div.header-item__row').removeClass('header-item__row');
            }

                $('.header-item__submenu').removeClass('header-item__submenu-m');
                $('.header-item:not(.header-item__submenu)').on('click', function(event){
                    $(this).children('.header-item__submenu').addClass('header-item__submenu-m');
                });
                $('.inner-page').on('click', function(event){
                    $(this).children('.header-item__submenu').removeClass('header-item__submenu-m');
                });
            this.markMenuPage();
        };

        /**
         * Method unbind handler to this object method according
         * template meta-data
         *
         * @param   {jQuery|string=}  prefix
         * @param   {Object=}         object
         */
        this.unbindPageHandlers     = function (prefix, object) {

            this.assignPageHandlers(prefix, object, true);
        };

        this.getTagDefaultAction    = function (tagName) {

            switch(tagName) {
                case 'SELECT':
                case 'INPUT':   return 'change';
                case 'FORM':    return 'submit';
                case 'A':
                default:        return 'click';
            }
        };

        /**
         * Returns version of class
         *
         * @returns {string}
         */
        this.getVersion             = function () {
            return version;
        };

        /**
         * Returns content area
         *
         * @returns {jQuery|HTMLElement}
         */
        this.getContentSelector     = function () {
            return $('#content');
        };

        /**
         *
         * @param       {string}    template
         * @returns     {string}
         */
        this.getTemplatePath        = function (template) {

            return pathTemplate + '/' + template +'--v' + config['LocalStorageStamp'] + '.mst';
        };

        /**
         * Load template
         *
         * @param   {string}        template
         * @param   {function=}     callback
         * @return  {Promise}
         */
        this.loadTemplate           = function (template, callback) {

            return $.get(this.getTemplatePath(template), callback);
        };

        /**
         * Rendering template
         *
         * @param       {string}            template
         * @param       {object}            data
         * @param       {string|jQuery=}    target
         * @param       {function=}         handler
         */
        this.renderTo               = function (template, data, target, handler) {

            var node                = $($.parseHTML('<div>' + template + '</div>'));
            this.outTo(this.templater.render(node.html(), data), target, handler);

        };

        /**
         *
         * @param   {string}        html
         * @param   {string=}       target
         * @param   {function=}     handler
         */
        this.outTo                  = function (html, target, handler) {


            // use case for append html to body
            if(target === this.APPEND_TO_BODY) {

                $('body').append(html);

                if(typeof handler === 'function') {
                    handler();
                }

                return;
            }

            if(typeof(target) === 'undefined') {
                target              = this.getContentSelector();
            } else if(typeof(target) === 'string') {
                target              = $(target);
            }

            target.html(html);

            if(typeof handler === 'function') {
                handler();
            }
        };

        /**
         * Apply template for node and data
         *
         * @param node
         * @param data
         */
        this.applyTemplateForNode   = function (node, data) {

            var template            = this.getTemplateFromNode(node);

            if(typeof template === 'undefined') {
                template            = node.html();
            }
            node.html(this.templater.render(template, data));
        };

        /**
         * access for service.query
         *
         * @param {RemoteCall|CallGet|CallPost|CallPortal} query
         *
         * @return {Promise}
         */
        this.remoteCall             = function(query) {

            return service.query(query);
        };

        this.defineBaseUrl          = function () {

            return window.location.protocol + '//' + window.location.hostname + config['basePath'];
        };


        this.generateNewUrl         = function (url) {

            if(url === 'switchLanguage') {

                var current_lang    = language;
                var new_lang        = current_lang;

                $.each(config['languages'], function (index, value) {

                    if(value !== current_lang) {
                        new_lang    = value;
                    }
                });

                return this.switchLanguageUrl(new_lang);
            }
            url =  url ? url : '';

            return config['basePath'] +  language + '/' + url;
        };


        this.generateSignUpNewUrl   = function (url) {
            if(url == 'learningLibrary') {
                return config['basePath'] +  language + '/signUp/';
            }
            url =  url ? url : '';
            url = 'signUp'+url.replace(/\b[a-z]/g, function(letter) {
                return letter.toUpperCase();
            });
            return config['basePath'] +  language + '/' + url;
        };

        this.addRVTnumber           = function (filename) {
            if(typeof filename == 'undefined') filename = '';

            let path                = filename.split('/');
            let baseName            = path.pop();
            let baseNameParts       = baseName.split('.');

            if(baseNameParts.length < 2){
                return filename;
            }

            let fileArray = filename.split('.');
            let fileExtension = fileArray.pop();
            fileArray[fileArray.length-1] = fileArray[fileArray.length-1] + this.rvtVal();

            filename = fileArray.join(".") + '.' + fileExtension;
            return filename;
        };

        this.rvtVal                 = function(){
            let applyRVT = true;
            if(applyRVT) return '--v'+config['portalStorageStamp'];
            else return '';
        }

        this.rewriteTitletoUrl         = function (title) {

            var urlText             = title.toString().trim().toLowerCase().replace(/['\`,?:#&*()-]+/g, '');

            return urlText.replace(/[\s\/]+/g, '-');

        };

        this.switchLanguageUrl     = function (lang) {

           var  options             = {includePage: true};
           var  newUrlParts         = {pageLanguage:lang};

           return  this.appLocation.buildURL(newUrlParts, options);
        };


        this.renderMetaData         = function (data) {

            var location        = this.appLocation.urlParts;
            var title           = that.generateMetaData('pageTitle', 'title');
            var description     = that.generateMetaData('pageContent', 'meta_description');

            document.title      = title;
            $('meta[name=description]').attr('content', description);
            $('meta[name=keywords]').attr('content', that.generateMetaData('pageKeywords', 'meta_keywords'));

            var twitterMeta     = {
                "twitter:card"                  : "app",
                "twitter:site"                  : "@KnowledgeCity",
                "twitter:description"           : description,
                "twitter:app:country"           : "US",

                "twitter:app:id:iphone"         : "1275634737",
                "twitter:app:name:iphone"       : "KnowledgeCity",
                "twitter:app:url:iphone"        : "https://itunes.apple.com/us/app/id1275634737",

                "twitter:app:id:ipad"           : "1275634737",
                "twitter:app:name:ipad"         : "KnowledgeCity",
                "twitter:app:url:ipad"          : "https://itunes.apple.com/us/app/id1275634737",

                "twitter:app:id:googleplay"     : "com.knowledgecity.us_site",
                "twitter:app:name:googleplay"   : "KnowledgeCity",
                "twitter:app:url:googleplay"    : "https://play.google.com/store/apps/details?id=com.knowledgecity.us_site",
            };

            if(location.pageController == 'courses' && typeof data !== 'undefined' && typeof data.course !== 'undefined') {

                twitterMeta['twitter:card']         = 'summary_large_image';
                twitterMeta['twitter:site']         = '@knowledgecity';
                twitterMeta['twitter:title']        = title;
                twitterMeta['twitter:description']  = description;
                twitterMeta['twitter:image']        = data.course.poster;

            }


            $.each(twitterMeta, function(key, value) {

                var metaTag = $('meta[name="'+key+'"]');

                if(metaTag.length == 0){
                    metaTag = $('<meta/>').attr('name', key);
                    metaTag.appendTo('head');
                }

                metaTag.attr('content', value);
            });

        };


        this.getUrlParameter        = function (name) {

            var sPageURL            = window.location.href;

            sPageURL                = sPageURL.split('?');

            if(typeof sPageURL[1] === 'undefined') {
                return null;
            }

            sPageURL                = sPageURL[1];

            var sURLVariables       = sPageURL.split('&');

            for (var i = 0; i < sURLVariables.length; i++)
            {
                var sParameterName = sURLVariables[i].split('=');

                if (sParameterName[0] == name)
                {
                    return sParameterName[1];
                }
            }

            return null;
        };

        /**
         * Returns current location path as array
         * @return {[]}
         */
        this.getCurrentLocation     = function () {

            var loc = history.getCurrentLocation().hash.substring(1).split('/');

            if(loc[0].substring(0, 2) === 'l-') {
                loc.shift();
            }

            if(typeof kcpack === 'object'){
                loc = ["courses", kcpack.courseId];// if kcpack it's course page regardless of url
            }

            return loc;
        };

        this.defineBaseUrlWithLang  = function () {

            return this.defineBaseUrl() + language + '/';
        };

        /**
         * Redirected to another page
         *
         * @param   {String}        location
         */
        this.redirect               = function (location) {

            //history.replace not working inside promise
            //history.replace(this.generateNewUrl(location));
            if ( typeof location != 'undefined' && location === this.getCurrentLocation()[0]) {

                this.reload();
                return;
            }

            var rLanguage           = this.config.languages.filter(function( lang ) {
                return lang == that.getLanguage();
            });

            language                = rLanguage.length ? language : 'en';
            // if(!location) location = '/' + language;

            window.history.pushState({}, '', this.generateNewUrl(location));
            that.onChangeLocation();

            // window.location         = this.generateNewUrl(location);

        };

        /**
         * Redirect to Home page
         */
        this.redirectHome           = function () {

            this.redirect();
        };

        /**
         * Redirected to 404 page
         */
        this.redirect404            = function () {
            console.log('404 redirect in page.redirect404');
            this.redirect('page404');
        };

        /**
         * Reload page
         *
         * @return {Page}
         */
        this.reload                 = function () {

            //this.onChangeLocation();

            location.reload();

            return this;
        };

        /**
         *
         * @param   {String}        message
         * @param   {boolean=}      isError
         * @param   {function}      on close
         */
        this.showDanger            = function (message, onConfirm) {

            var selector            = '#dangerWindow';
            var $alert              = $(selector);

            if($alert.length === 0) {

                console.error('Template error: #dangerWindow is not defined on the page!');
                alert(message);
                return;
            }

            $alert.removeClass('alert-danger').addClass('alert-success');

            $alert.find('[rel=text]').html(message);

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.6,
                isAlert:        true,
                isBlocking:     true,
                isConfirming:   true
            });

            return modalWindow.show().then(function() {
                $alert = $( selector+'.cloned' );

                $alert.find('[rel^=confirm]').unbind('click').bind('click', function () {
                    onConfirm().always(function(){
                        modalWindow.close();
                    });
                });
            });
        };


        this.showAlert              = function (message, isError, onBeforeOpen = function(){}, onOpen= function(){}, onBeforeClose= function(){}, onClose= function(){}) {

            var selector            = '#alertWindow';

            // normalize parameter to boolean
            isError                 = typeof isError === 'boolean' ? isError: false;

            var $alert              = $(selector);

            if($alert.length === 0) {

                console.error('Template error: #alertWindow is not defined on the page!');
                alert(message);
                return;
            }

            if(isError) {
                $alert.removeClass('alert-success').addClass('alert-danger');
                $('#mContainer').find('input').attr('disabled', 'true' );
            } else {
                $alert.removeClass('alert-danger').addClass('alert-success');
                $('#mContainer').find('input').attr('disabled', 'false' );
            }

            $alert.find('[rel=text]').html(message);

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        true,
                onBeforeOpen:   onBeforeOpen,
                onOpen:         onOpen,
                onBeforeClose:  onBeforeClose,
                onClose:        onClose
            });


            return modalWindow.show().then(function () {
                $alert = $( selector+'.cloned' );
                $alert.find('[rel^=close]').unbind('click').bind('click', function () {
                    modalWindow.close();
                });
                return modalWindow;
            });

        };

        this.showInvitation = (message) => {
            const selector = '#invitationWindow';
            var $alert = $(selector);

            if (!$alert.length) {
                console.error('Template error: #invitationWindow is not defined on the page!');
                alert(message);
                return;
            }

            $alert.find('[rel=text]').html(message);

            let modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        true,
            });


            return modalWindow.show().then( function() {

                $alert = $( selector + '.cloned' );

                $alert.find('[rel^=close]').unbind('click').bind('click', () => {

                    modalWindow.close();
                });

                $alert.find('[rel^=login]').unbind('click').bind('click', (event) => {

                    $( "#invitationWindow.cloned" ).attr( 'data-shown', 'false' );

                    that.onLoginForm(event.target, event);

                    $( "#invitationWindow.cloned" ).hide( "slow" );
                });

                $alert.find('[rel^=join]').unbind('click').bind('click', (event) => {

                    modalWindow.close();
                    that.onSignUp(event.target, event);
                });
            });
        };

        this.showConfirm            = function (message, onConfirm, buttonValue) {

            var selector            = '#confirmWindow';
            var $alert              = $(selector);

            if($alert.length === 0) {

                console.error('Template error: #confirmtWindow is not defined on the page!');
                alert(message);
                return;
            }

            $alert.removeClass('alert-danger').addClass('alert-success');

            if(message) {
                $alert.find('[rel=text]').html(message);
            }

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        false,
                isConfirm:      true,
            });

            return modalWindow.show().then( function() {

                $alert = $( selector+'.cloned' );

                $alert.find('[rel^=confirm]').unbind('click');

                $alert.find('[rel^=close]').unbind('click').bind('click', function () {
                    modalWindow.close();
                });

                if(typeof onConfirm == 'function') {
                    $alert.find('[rel^=confirm]').bind('click', function () {

                        onConfirm($alert).done(function(){
                            modalWindow.close();
                        });
                    });
                }

                if(buttonValue) {
                    $alert.find('[rel^=confirm]').val(buttonValue);
                }
            });
        };

        this.showGetAccess            = function (title, text, button, handler) {
            // the function is for clients to specify custom box when unlicensed user clicks a lesson
            var selector            = '#getAccessWindow';
            var $alert              = $(selector);

            if($alert.length === 0) {

                console.error('Template error: #getAccessWindow is not defined on the page!');
                alert(text);
                return;
            }

            $alert.removeClass('alert-danger').addClass('alert-success');

            // Determine the text to show

            // (k   ) for sites who can't (eg sites with 3rd party LMS software, they can specify directly in the kcpack
            // (box ) for sites who can edit their code, they can add a couple functions to handle the get access
            // (else) or, it can be specified directly to this function
            var k = this.getMainData()['kcpack'] || {};
            var p = {kcpackId:k['id'],title:k['title'],courseId:k['courseId']}
            //allow partners to hook in before get access dialog
            if(typeof kcpack_beforeGetAccess === "function"){
                var box = kcpack_beforeGetAccess(p)
                if(typeof box !=="object")
                    return; //something is wrong with their function
            }

            // use values from kcpack or default values
            var title   = title   || (box && box['title'])   || k['noLicenseTitle']   || "Get Access";
            var text    = text    || (box && box['text'])    || k['noLicenseText']    || "Contact your administrator to get access.";
            var button  = button  || (box && box['button'])  || k['noLicenseButton']  || "OK";
            var handler = handler || (box && box['handler']) || k['noLicenseHandler'] || function(p){};
            if(typeof handler === "string"){
                //if they have a string, instead of function, we replace their 'handler' with a handler function that
                //will insert the code they specified, as script, adding the parameter p that is nomrally passed to the handler
                var shandler='<script>(function(p){'+handler+'})('+JSON.stringify(p)+')</script>'
                handler = function(){$("body").append(shandler)}
            }

            $alert.find('[rel=text]').html('<p style="font-size:18px">'+title+'<p><p>'+text+'<p>');

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        false,
                isConfirm:      true,
            });

            return modalWindow.show().then( function () {

                $alert = $( selector+'.cloned' );

                $alert.find('[rel^=getAccess]').attr('value', button).unbind('click').bind('click', () => {
                    modalWindow.close();
                    handler(p);
                });
            });
        };

        this.ctrlMainMenu           = function (node) {

            var items               = [];
            var itemsKeys           = [
                'home', 'ourClients', 'certification', 'features', 'benefits', 'faq',  'aboutPortal', 'contactUs', 'testimonials', 'requestAccess', 'partners', 'pressRelease'
            ];
            var location            = this.getCurrentLocation();
            var menuItems           = mainData.mui['topMenuLinks'];
            const that              = this;

            if(typeof menuItems === 'undefined') {
                console.error('Mui error: Menu Items undefined (server return empty response)!');
                return;
            }

            if((localStorage.getItem('UserLocation')!='US' && localStorage.getItem('UserLocation')!='CA') && typeof menuItems['careers'] !== 'undefined')
                menuItems['careers'] = '';

            if( this.config.portal.portal_code === 'www' ) {
                menuItems['benefits']     = '';
                menuItems['features']     = '';
                menuItems['testimonials'] = '';
            }

            // Sorting the menu Items
            menuItems = that.customMenuItems( menuItems );

            $.each( menuItems, function (index, element){
            // $.each(itemsKeys, function (i, index) {

                if(typeof menuItems[index] === 'undefined' || !menuItems[index].length) {
                    return;
                }
                // var element         = menuItems[index];

                if( index === 'mylearning' || index === 'myaccount') {

                    if(that.user.isAuth() === false) {
                        return;
                    }

                    switch(index) {
                        case 'mylearning':  index = 'myLearning'; break;
                        case 'myaccount':   index = 'myAccount'; break;
                    }
                }

                if( index === 'requestAccess' && (isEmpty(that.config.isRequestAccess) || that.user.isAuth())) {
                    return;
                }

                if( index === 'home' ){
                    index = '';
                }

                if( index === 'pressRelease' || index === 'partners' || index === 'careers' ) {
                    return;
                }

                // check if external url
                var elementAr = element.split('\|');
                if(elementAr[0] == 'url'){
                    items.push({

                        isActive:       false,
                        language:       that.getLanguage(),
                        url:            elementAr[2],
                        name:           elementAr[1],
                        class:          index.toLowerCase(),
                        target:         '_blank',
                        reload:         1
                    });
                }else{
                    items.push({

                        isActive:       location[0] === index,
                        language:       that.getLanguage(),
                        url:            that.generateNewUrl(index),
                        name:           element,
                        class:          index.toLowerCase(),
                        target:         '_self',
                        reload:         0
                    });
                }
            });

            this.applyTemplateForNode(node, {
                'items': items,
                'languages': this.buildLanguagesMenu(),
                'search': menuItems['search'],
                'mobileMenuTitle' : isNotEmpty(mainData.mui['mobileMenu']) ? mainData.mui['mobileMenu']['menu'] : ''
            });
        };


        // Search for custom menu items and push
        // those items at the end of the object
        this.customMenuItems = function( menuItems ){

          // List of custom sections (menu items)
          var customItems = ["outsideTrainings"];
          var arrItems    = [];

          for( var prop in menuItems) {
             if( menuItems.hasOwnProperty(prop) ){
               let obj = {};
               obj[prop] = menuItems[prop];
               arrItems.push( obj );
             }
          }

          // Search for key that matches with the customItems array keys
          arrItems.sort( function(a, b){
            let keyA = Object.keys(a)[0], keyB = Object.keys(b)[0];
            if( customItems.includes(keyA) && !customItems.includes(keyB) ){ return 1 };
            if( !customItems.includes(keyA) && customItems.includes(keyB) ){ return -1 };
            return 0;
          });

          var obj = {};
          $.each( arrItems, function (index, element){
            let list = Object.assign(obj, element);
          });

          // Returning the object with the sorted items
          return obj;
        };


        this.ctrlHeaderMenu           = function (node) {

            var items               = [];
            var itemsKeys           = ['learningLibrary', 'contentCreation', 'lms'];
            var location            = this.getCurrentLocation();
            var menuItems           = mainData.mui['HeaderMenuLinks'];
            var carrersItem         = mainData.mui['topMenuLinks']['careers'];

            const that              = this;

            if(typeof menuItems === 'undefined') {
                console.error('Mui error: Menu Items undefined (server return empty response)!');
                return;
            }

            if((localStorage.getItem('UserLocation')!='US' && localStorage.getItem('UserLocation')!='CA') && typeof menuItems['careers'] !== 'undefined') {
                menuItems['careers'] = '';
                carrersItem = false;
            }
            $.each(menuItems, function (index, element){
            // $.each(itemsKeys, function (i, index) {

                if(typeof menuItems[index] === 'undefined' || !menuItems[index].length) {
                    return;
                }

                // check if external url
                var elementAr = element.split('\|');
                if(elementAr[0] == 'url'){
                    items.push({

                        isActive:       false,
                        language:       that.getLanguage(),
                        url:            elementAr[2],
                        name:           elementAr[1],
                        class:          index.toLowerCase(),
                        target:         '_blank',
                        reload:         1
                    });
                }else{
                    items.push({

                        isActive:       location[0] === index,
                        language:       that.getLanguage(),
                        url:            that.generateNewUrl(index),
                        signUpUrl:      that.generateSignUpNewUrl(index),
                        name:           element,
                        class:          index.toLowerCase(),
                        target:         '_self',
                        reload:         0
                    });
                }

            });
            this.applyTemplateForNode(node, {
                'itemsHeader'    : items,
                'languages'      : this.buildLanguagesMenu(),
                'mobileLearning' : mainData.mui['mobileMenu']['learning'],
                'aboutUs'        : mainData.mui['topMenuLinks']['aboutPortal'],
                'contactUs'      : mainData.mui['topMenuLinks']['contactUs'],
                'partners'       : mainData.mui['topMenuLinks']['partners'],
                'pressRelease'   : mainData.mui['topMenuLinks']['pressRelease'],
                'careers'       : carrersItem,
                'signUp'         : mainData.mui['header']['signUp'],
                'url_with_lang'  : this.defineBaseUrlWithLang()
            });
        };

        this.buildLanguagesMenu     = function () {

            var items               = [];
            var current             = this.getLanguage();
            var dropdown            = true;


            if(typeof config.portal['langs'] === 'undefined' || config.portal['langs'].length == 1) {
                return;
            }

            const that              = this;

                $.each(config.portal['langs'], function (index, lang) {

                    var code            = lang['lang'];

                    if(code === current) {
                        current         = typeof lang['native'] !== 'undefined' ? lang['native'] : code;
                        return true;
                    }

                    if (lang.active === 1) {

                        items.push({
                            'href':         that.switchLanguageUrl(code),
                            'title':        typeof lang['native'] !== 'undefined' ? lang['native'] : code,
                            'code':         code
                        });

                    }


                });


                if (items.length == 1) {
                    dropdown = false;
                };

            return {'current': current, 'items': items, 'dropdown' : dropdown};
        };

        this.onLoginForm            = function (node, event) {

            that.closeLeftMobMenu();

            event.preventDefault();

            if(!$("#loginPopUp").length){
                this.loginForm      = new LoginForm(this, node);
            }

            this.loginForm.show();
        };

        this.showLoginForm          = function (options) {

            if(!$("#loginPopUp").length){
                this.loginForm      = new LoginForm(this);
            }

            return this.loginForm.show(options);
        };

        this.showFirstLoginForm     = function (options) {

            this.showLoginForm(options);
        };

        this.onLogout               = function (node, event) {

            event.preventDefault();

            this.remoteCall(new CallDelete('auth', {
                token: this.user.getSessionId()
            }, response => {}));

            this.user.logout();

            this.invalidateMain();
            this.redirectHome();
        };

        this.onSearchForm           = function (node, event) {

            event.preventDefault();

            if( $( '#bars' ).hasClass( 'active' ) ) {
                $( '#bars' ).trigger( 'click' );
            }

            var searchForm           = new SearchForm(this, node);

            searchForm.show();

        };

        this.onImgLoadError         = function (node) {

            $(node).attr('src', this.getMainData().IMG + 'no-img.png').css({'height': $(node).width()/4*3});

        };

        this.initScrollUp           = function() {

            $(function() {
                $(window).scroll( function(){


                    $('.fadeInBlock').each( function(i){

                        var bottom_of_object = $(this).position().top + $(this).outerHeight();
                        var bottom_of_window = $(window).scrollTop() + $(window).height();
                        bottom_of_window = bottom_of_window + 200;

                        if( bottom_of_window > bottom_of_object ){

                            $(this).animate({'opacity':'1'},500);

                        }
                    });

                });
            });

        };

        this.closeLeftMobMenu = function () {
            if($("#usermenu").hasClass('visible')===true) {
                $("#usermenu").removeClass('visible');
                $("body").css("overflow", "auto");
            }
        }

        this.ctrlDropDownList = function () {

            var answerSelector = '.drop_m_sub';
            var answer = $(answerSelector);
            var question = $(".drop_m_title");

            if($(window).width()<480) {
                answer.hide();
            }

            $(document).on('click', '.drop_m_title', function () {
                var isActive = $(this).parents('.drop_m_block').hasClass('active');
                if (!isActive) {
                    $(this)
                        .parents('.drop_m_block')
                        .addClass('active')
                        .find('.drop_m_sub')
                        .slideDown(0);
                } else {
                    $(this)
                        .parents('.drop_m_block')
                        .removeClass('active')
                        .find('.drop_m_sub')
                        .slideUp(0);
                }
            });
        };

        this.ctrlScrollUp = function () {

            $(window).scroll(function () {
                if (!$('#courseVideoWrapper').hasClass('course-video')) {
                    if ($(window).scrollTop() > $(window).height() - 200) {
                        $('.scroll-up').show();
                    } else {
                        $('.scroll-up').hide();
                    }
                }
            });
            $(document).on('click', '.scroll-up--ctrl', function (e) {
                $('body,html').animate({
                    scrollTop: 0
                }, 400);
                return false;
            });
        };

        //this will help to partial render course list items inside library.mst
        this.ctrlItems            = function (node, arrayS) {
          var component           = new CategoriesList(this,node);
          component.items(node,arrayS);
        };


        this.ctrlSidebar            = function (node) {
            var component           = new CategoriesList(this,node);
            component.sidebar();
        };


        this.setLibtitleFromContent = function(libT, libS, libC) {

            this.libTitle       = libT;
            this.libSubTitle    = libS;
            this.libClass       = libC;
        };

        this.ctrlLibTitle           = function(node) {

            var that = this;

            var template                = node.html();
            var targetId                = node.attr('id');

            $.when(this.defineData(), this.loadTemplate('ui/libTitle', function (html) {
                template            = html;
            })
            ).then(function () {

                     var data = {
                         title: (that.libTitle ? that.libTitle : that.getMainData().mui.topMenuItems.library),
                         subtitle: that.libSubTitle,
                         class: that.libClass
                     };

                     that.renderTo(template, data, '#' + targetId);

            });

        };

        this.ctrlBreadCrumbs           = function(node, outData) {

            if(typeof kcpack === 'object') {
                return;
            }

            var template                = node.html();
            var targetId                = node.attr('id');

            $.when(this.loadTemplate('ui/breadCrumbs', function (html) {
                    template            = html;
                })
            ).then(function () {

                that.defineDataPromise.done(function () {

                    var data            = outData ? outData : contentData;

                    that.renderTo(template, data, '#' + targetId);
                });
            });
        };

        this.ctrlSwitchers          = function(node, outData) {

            var template                = node.html();
            var targetId                = node.attr('id');

            $.when(this.loadTemplate('ui/switchers', function (html) {
                    template            = html;
                })
            ).then(function () {

                that.defineDataPromise.done(function () {
                    var data            = {};

                    if(typeof contentData != 'undefined' ) {

                        data.switchers      = outData ? outData : contentData.switchers[targetId];
                        data.switcherLable  = outData ? outData : contentData.switcherLable[targetId];

                        that.renderTo(template, data, '#' + targetId);
                        that.assignPageHandlers('#' + targetId, that, true);
                    }
                });
            });
        };

        this.ctrlLibMenu            = function(node) {

            var component           = new LibraryList(this, node);

            if (component.menu) {
                component.menu();
            }


        };

        this.ctrlLibMobMenu            = function(node) {

            let component           = new LibraryList(this, node);

            if (component.menu) {
                component.menu();
            }
        };

        this.ctrlCoursesForCloneMenu    = function (node) {

            let component               = new CoursesForCloneMenu(this, node);

            if (component.menu) {
                component.menu();
            }
        };

        this.onMobMenu          = function(node,event) {
            $('#usermenu').toggleClass('visible',true);
            // $("body").css("overflow", "hidden");
            openedMenu = true;
        };

        this.onClickBars         = function ( node, event ) {
            if( $( '.search-icon.mobile .search__form' ).hasClass( 'active' ) ) {
                $( '.search-icon.mobile button.search__close' ).trigger( 'click' );
            }
            if( $('#usermenu').hasClass( 'active' ) ) {
                $('body').attr('style', '');
                $('.mobil-header').attr('style', '');
                $('#usermenu').find('.active').removeClass('active');
                $('#usermenu').removeClass('active');
                $('.mob-lng-wrapper').removeClass('active');

                $(node).removeClass('active');
            } else {
                $('body').css('overflow', 'hidden');
                if( $('#smartbanner').length > 0 && $('#smartbanner').hasClass( 'shown' ) ) {
                    var wh = window.innerHeight - $('#smartbanner').outerHeight();
                    $('.mobil-header').css('height', wh + 'px');
                    $('.course-page_header').css('margin-top:','0px');

                } else {
                    $('.mobil-header').css('height', '100%');
                    $('.course-page_header').css('margin-top:','32px');

                }
                $('.mobil-header').css('position', 'fixed');
                $('.mobil-header').css('z-index', '99');
                $('#usermenu').addClass('active');
                $('.mob-lng-wrapper').addClass('active');
                $(node).addClass('active');

                this.addScroll();
            }
            // $("body").css("overflow", "hidden");
            openedMenu = true;
        };

        this.onOpenMenu         = function ( node, event ) {
            if( $(node).closest('.mobile-parent').hasClass('active') ) {
                $('.mobile-parent').removeClass('active');
                $('#usermenu').attr('style', '');

            } else {
                $('.mobile-parent').removeClass('active');
                $(node).closest('.mobile-parent').toggleClass('active');
            }
            this.addScroll();
        };

        this.addScroll          = function () {
            var height = this.isHigher();
            if( height ) {
                $('#usermenu').css('overflow-y', 'scroll');
                $('#usermenu').css('height', height+'px');
            } else {

                $('#usermenu').css('overflow-y', '');
                $('#usermenu').css('height', '');
            }
        };

        this.isHigher      = function () {
            var wh = window.innerHeight;
            var mh = $('#usermenu').outerHeight() + $('#header').outerHeight();

            return mh < wh ? false : wh - $('#header').outerHeight();
        };

        this.onCloseMenu         = function ( node, event ) {
            $('.mobil-header').attr('style', '');
            $('#usermenu').attr('style', '');
            $('body').attr('style', '');
            $('.mobile-parent').removeClass('active');
            $('#usermenu').removeClass('active');
            $('#bars').removeClass('active');
            $('.mob-lng-wrapper').removeClass('active');
        };
        const that              = this;

        function LibraryList (page, node) {

            if ( !$(node).text() &&  !page.getMainData().mui.header) {
                console.log('404 redirect in page.LibraryList');
                that.redirect('page404');
                return;
            }

            var data                = {
                    libraryTitle:  that.user.isAuth() ? $(node).text() || page.getMainData().mui.header.library :
                        (isNotEmpty(page.getMainData().mui.mobileMenu) ? page.getMainData().mui.mobileMenu.allCourses : '')
                },
                template,
                id              = $(node).attr('id'),
                libDropdown;

            this.menu               = () => {

                $.when(page.defineCategoriesData(), page.loadTemplate('ui/libMenu', function (html) {
                    template            = html;
                }), page.outContentPromise).then((res1) => {
                    //clear Local Storage
                    that.checkCEID(res1);

                    //--- USSITE-589 On new US site items in the library menu are shown in wrong order
                    // so we change the sequence of menu categories by columns rather than rows
                   if(
                    that.config['pathTemplate'].indexOf('templates/ussite') >= 0 ||
                    that.config['pathTemplate'].indexOf('templates/kc') >= 0
                    ) {
                       res1.sections.forEach(section => {
                           section.categories_order_col = section.categories_0;
                           let arr_size = section.categories_order_col.length;
                           let k = 0, d = -1, second_row, array_alt_category = [];
                           for (let i = 0; i < arr_size; i++) {
                               if (i % 2 != 0) {
                                   array_alt_category[i] = section.categories_order_col[second_row];
                               } else {
                                   d++;
                                   array_alt_category[i] = section.categories_order_col[d];
                                   second_row = (Math.round((arr_size) / 2) + k);
                                   k++;
                               }
                           }
                           for (let i = 0; i < arr_size; i++) {
                               section.categories_order_col[i] = array_alt_category[i]
                           }
                       });
                   }
                    //------------------------------------------- END USSITE-589 --- ------------------

                    let maxLength = Math.max(...res1.sections.map(section => section.categories_0.length));

                    res1.sections.forEach(section => {

                        let emptyLength = maxLength - section.categories_0.length;

                        if (emptyLength) {
                            section.emptyblock = [];
                            for(let i = 0; i < emptyLength; i++)
                                section.emptyblock.push({});
                        }

                    });

                    $.extend(data, res1);

                    this.menuRender();
                });

            };

            this.menuRender          = function () {
                page.renderTo(template, $.extend(data, page.getMainData()), '#' + id);
                this.setHandlers();
            };

            this.setHandlers            = function () {

                libDropdown = $('#libDropdown');

                page.assignPageHandlers('#' + id, this);
                libDropdown.appendTo('#libMenuContent')

            };
            this.onOpenSubMenu                  = function ( node, event ) {
                page.onOpenMenu(node,event);
            };
            this.onCloseMenu                  = function ( node, event ) {
                page.onCloseMenu(node,event);
            };
            this.onOpenSubMenuLinks             = function ( node, event ) {
                $('.mobile-sub-menu').removeClass('active');
                $(node).closest('.mobile-sub-menu').toggleClass('active');
                page.addScroll();
            };

            this.onEnterLibrary              = function (node, event) {

                event.preventDefault();

                let s                   = $('#coursesForCloneMenu');

                if ($(s).is(":visible")) {
                    s.slideUp(function () {
                        $('#coursesForCloneMenuBtn a').removeClass('active');
                    });
                }

                if (!$(libDropdown).is(":visible")) {
                    libDropdown.slideDown();
                    $(node).addClass('active');
                } else {
                    libDropdown.slideUp(function(){
                        $(node).removeClass('active')
                    });

                }
            };

            this.onLeaveLibrary              = function (node, event) {

                libDropdown.slideUp(function(){
                    $('#libMenuBtn a').removeClass('active')
                });

            };

        }

        // start of CoursesForCloneMenu
        function CoursesForCloneMenu(page, node) {

            if ( !$(node).text() &&  !page.getMainData().mui.header) {
                console.log('404 redirect in page.CoursesForCloneMenu');
                that.redirect('page404');
                return;
            }

            var data                = {
                    library:  $(node).text()
                },
                template,
                id              = $(node).attr('id'),
                libDropdown;

            this.menu               = () => {

                $.when(page.defineCoursesForCloneMenu(), page.loadTemplate('ui/coursesForCloneMenu', function (html) {
                    template            = html;
                }), page.outContentPromise).then((res1) => {

                    //clear Local Storage
                    //that.checkCEID(res1);

                    let sections        = [];
                    let categories      = [];

                    if(res1.menu.length > 0) {

                        $('#CoursesForCloneMenu').show();

                        res1.menu.map((courseList) => {

                            // generate url
                            courseList.url         = page.generateNewUrl('coursesForClone/list/' + courseList.id + '/');

                            if(categories.length > 10) {
                                sections.push($.extend([], categories));
                                categories  = [];
                            }

                            categories.push(courseList);
                        });

                        if(categories.length <= 10) {
                            sections.push({'items': $.extend([], categories)});
                        }

                        res1.sections       = sections;

                    } else {
                        $('#CoursesForCloneMenu').hide();
                    }


                    $.extend(data, res1);

                    this.menuRender();
                });

            };

            this.menuRender          = function () {

                page.renderTo(template, $.extend(data, page.getMainData()), '#' + id);
                this.setHandlers();
            };

            this.setHandlers            = function () {

                libDropdown             = $('#coursesForCloneMenu');

                page.assignPageHandlers('#' + id, this);
                libDropdown.appendTo('#coursesForCloneMenuContent');
            };

            this.onEnterLibrary              = function (node, event) {

                event.preventDefault();

                let s                   = $('#libDropdown');

                if ($(s).is(":visible")) {
                    s.slideUp(function () {
                        $('#libMenuBtn a').removeClass('active');
                    });
                }

                if (!$(libDropdown).is(":visible")) {
                    libDropdown.slideDown();
                    $(node).addClass('active');
                } else {
                    libDropdown.slideUp(function(){
                        $(node).removeClass('active')
                    });

                }
            };

            this.onLeaveLibrary              = function (node, event) {

                libDropdown.slideUp(function(){
                    $('#coursesForCloneMenuBtn a').removeClass('active')
                });
            };
        }
        // end of CoursesForCloneMenu

        function CategoriesList(page,node) {
        //  debugger;

            let data            = {},
                template        = node.html(),
                targetId        = node.attr('id');

            this.sidebar                = () => {

                $.when(page.defineCategoriesData(), page.loadTemplate('ui/sidebar', (html) => {
                    template            = html;
                }), page.outContentPromise).then((res1) => {

                    $.extend(data, res1);
                    this.sidebarRender();
                });

            };

            this.items                = (node,sortedArray) => {
              //debugger;
              //console.log(sortedArray);
                $.when(page.defineCategoriesData(), page.loadTemplate('ui/libraryCourses', (html) => {
                    template            = html;
                }), page.outContentPromise).done((res1) => {

                    $.extend(data, res1);
                    this.itemRender(sortedArray);


                });

            };


            this.render                 = () => {

                page.renderTo(template, data, '#' + targetId);
                this.setHandlers();
            };

            this.sidebarRender          = (arg) => {
                var controller = page.urlParts.pageController;
                data.isLibrary = controller == 'library' ? true : false;
                page.renderTo(template, $.extend(data, page.getMainData()), '#' + targetId);
                this.setSidebarHandlers();
                this.setLibHeader(data.sections)
                //debugger;
            };


            this.itemRender          = (sortedArray) => {

                 if (sortedArray != null || typeof sortedArray != 'undefined' ) {
                   page.getMainData().courses = sortedArray;
                 }

                 //console.log("VIEW MODE "+window.localStorage.getItem("viewmode"));

                if (window.localStorage.getItem("viewmode") == "btn-library_flat"){
                    page.getMainData().flatView = true;
                    $(".view__btn--list").removeClass("active")
                    $(".view__btn--flat").addClass("active")

                }

                if (window.localStorage.getItem("viewmode") != "btn-library_flat"){
                    page.getMainData().flatView = false;
                    $(".view__btn--list").addClass("active")
                    $(".view__btn--flat").removeClass("active")
                }


                return  $.when( page.renderTo(template, $.extend(data, page.getMainData()), '#' + targetId)).then(function() {
/*
                if ($(window).width() > 768 && !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )) {
                  that.updateSizesLibrary();
                } //outContentPromise
*/
                $('#loading-overlay').fadeOut(300);


                });
              }


            this.setItemHandlers     = function()  {
                page.assignPageHandlers('#' + targetId, this);
            };

            this.setSidebarHandlers     = () => {
            //  debugger;
                page.assignPageHandlers('#' + targetId, this);
            };

            this.onToggleCategory       = (node, event) => {

              event.preventDefault();
              $(node).closest('[data-lvl="1"]').toggleClass('active');

            };


            this.setLibHeader =         (sections) => {

                let libTitle = '',
                    libSubTitle = '',
                    libClass = '';

                sections.forEach((section) => {

                    if (libTitle && libSubTitle) return;

                    if (section.active) {

                        libClass = section.class;
                        libTitle = section.name;

                    }

                    if (libSubTitle) return;

                    libSubTitle = this.setSubTitle(section);

                });

                page.libTitle = libTitle;
                page.libSubTitle = libSubTitle;
                page.libClass = libClass;

            };

            this.setSubTitle = (categories, lvl = 0) => {

                let subTitle = '';
                let currentId = page.currentPath[2];

                categories['categories_' + lvl].forEach((category) => {

                    if (subTitle) return;

                    if (category.id === currentId) {
                        subTitle = category.name;
                    } else {
                        if(category['categories_' + (lvl + 1)]) {
                            subTitle = this.setSubTitle(category, lvl + 1);
                        }
                    }

                });

                return subTitle;

            };
        }




        this.lockPage               = function() {

            $('#loading-overlay').fadeIn(300);

        };

        this.unlockPage             = function(){

            $('#loading-overlay').fadeOut(300);

        };

        this.formatSecondsToHrs    = function (seconds) {

            var h = seconds/3600 ^ 0,
                m = (seconds-h*3600)/60 ^ 0;

            if (this.getLanguage() == 'ar') {
                return this.formatArabicRuntime(h,m)
            }

            m = m < 10 ? '0' + m : m;
            return h + 'hrs. ' + m + 'min.';

        };

        this.formatArabicRuntime = function(hrs,mins) {

          var arabicRuntimeHrs = ['','ساعة واحدة','ساعتان','ثلاث  ساعات','أربع  ساعات','خمس  ساعات','ست  ساعات','سبع  ساعات','ثمان  ساعات','تسع  ساعات','عشر  ساعات','إحدى عشرة ساعة','اثنتا عشرة ساعة','ثلاث عشرة ساعة','أربع عشرة ساعة','خمس عشرة ساعة','ست عشرة ساعة','سبع عشرة ساعة','ثمان عشرة ساعة','تسع عشرة ساعة','عشرون  ساعة','إحدى وعشرون ساعة','إثنتا وعشرون ساعة','ثلاث وعشرون ساعة','أربع وعشرون ساعة','خمس وعشرون ساعة','ست وعشرون ساعة','سبع وعشرون ساعة','ثمان وعشرون ساعة','تسع وعشرون ساعة','ثلاثون  ساعة','إحدى وثلاثون ساعة','إثنتا وثلاثون ساعة','ثلاث وثلاثون ساعة','أربع وثلاثون ساعة','خمس وثلاثون ساعة','ست وثلاثون ساعة','سبع وثلاثون ساعة','ثمان وثلاثون ساعة','تسع وثلاثون ساعة','أربعون  ساعة','إحدى وأربعون ساعة','إثنتا وأربعون ساعة','ثلاث وأربعون ساعة','أربع وأربعون ساعة','خمس وأربعون ساعة','ست وأربعون ساعة','سبع وأربعون ساعة','ثمان وأربعون ساعة','تسع وأربعون ساعة','خمسون  ساعة','إحدى وخمسون ساعة','إثنتا وخمسون ساعة','ثلاث وخمسون ساعة','أربع وخمسون ساعة','خمس وخمسون ساعة','ست وخمسون ساعة','سبع وخمسون ساعة','ثمان وخمسون ساعة','تسع وخمسون ساعة','ستون  ساعة','إحدى وستون ساعة','اثنتا وستون ساعة','ثلاث وستون ساعة','أربع وستون ساعة','خمس وستون ساعة','ست وستون ساعة','سبع وستون ساعة','ثمان وستون ساعة','تسع وستون ساعة','سبعون  ساعة','إحدى وسبعون ساعة','اثنتا وسبعون ساعة','ثلاث وسبعون ساعة','أربع وسبعون ساعة','خمس وسبعون ساعة','ست وسبعون ساعة','سبع وسبعون ساعة','ثمان وسبعون ساعة','تسع وسبعون ساعة','ثمانون  ساعة','إحدى وثمانون ساعة','اثنتا وثمانون ساعة','ثلاث وثمانون ساعة','أربع وثمانون ساعة','خمس وثمانون ساعة','ست وثمانون ساعة','سبع وثمانون ساعة','ثمان وثمانون ساعة','تسع وثمانون ساعة','تسعون  ساعة','إحدى وتسعون ساعة','اثنتا وتسعون ساعة','ثلاث وتسعون ساعة','أربع وتسعون ساعة','خمس وتسعون ساعة','ست وتسعون ساعة','سبع وتسعون ساعة','ثمان وتسعون ساعة','تسع وتسعون ساعة'];

          var arabicRuntimeMins = ['','دقيقة واحدة ','دقيقتان ','ثلاث دقائق','أربع دقائق','خمس دقائق','ست دقائق','سبع دقائق','ثمان دقائق','تسع دقائق','عشر دقائق','إحدى عشرة دقيقة','اثنتا عشرة دقيقة','ثلاث عشرة دقيقة','أربع عشرة دقيقة','خمس عشرة دقيقة','ست عشرة دقيقة','سبع عشرة دقيقة','ثمان عشرة دقيقة','تسع عشرة دقيقة','عشرون دقيقة','إحدى وعشرون دقيقة','إثنتا وعشرون دقيقة','ثلاث وعشرون دقيقة','أربع وعشرون دقيقة','خمس وعشرون دقيقة','ست وعشرون دقيقة','سبع وعشرون دقيقة','ثمان وعشرون دقيقة','تسع وعشرون دقيقة','ثلاثون دقيقة','إحدى وثلاثون دقيقة','إثنتا وثلاثون دقيقة','ثلاث وثلاثون دقيقة','أربع وثلاثون دقيقة','خمس وثلاثون دقيقة','ست وثلاثون دقيقة','سبع وثلاثون دقيقة','ثمان وثلاثون دقيقة','تسع وثلاثون دقيقة','أربعون دقيقة','إحدى وأربعون دقيقة','إثنتا وأربعون دقيقة','ثلاث وأربعون دقيقة','أربع وأربعون دقيقة','خمس وأربعون دقيقة','ست وأربعون دقيقة','سبع وأربعون دقيقة','ثمان وأربعون دقيقة','تسع وأربعون دقيقة','خمسون دقيقة','إحدى وخمسون دقيقة','إثنتا وخمسون دقيقة','ثلاث وخمسون دقيقة','أربع وخمسون دقيقة','خمس وخمسون دقيقة','ست وخمسون دقيقة','سبع وخمسون دقيقة','ثمان وخمسون دقيقة','تسع وخمسون دقيقة','ستون دقيقة','إحدى وستون دقيقة','اثنتا وستون دقيقة','ثلاث وستون دقيقة','أربع وستون دقيقة','خمس وستون دقيقة','ست وستون دقيقة','سبع وستون دقيقة','ثمان وستون دقيقة','تسع وستون دقيقة','سبعون دقيقة','إحدى وسبعون دقيقة','اثنتا وسبعون دقيقة','ثلاث وسبعون دقيقة','أربع وسبعون دقيقة','خمس وسبعون دقيقة','ست وسبعون دقيقة','سبع وسبعون دقيقة','ثمان وسبعون دقيقة','تسع وسبعون دقيقة','ثمانون دقيقة','إحدى وثمانون دقيقة','اثنتا وثمانون دقيقة','ثلاث وثمانون دقيقة','أربع وثمانون دقيقة','خمس وثمانون دقيقة','ست وثمانون دقيقة','سبع وثمانون دقيقة','ثمان وثمانون دقيقة','تسع وثمانون دقيقة','تسعون دقيقة','إحدى وتسعون دقيقة','اثنتا وتسعون دقيقة','ثلاث وتسعون دقيقة','أربع وتسعون دقيقة','خمس وتسعون دقيقة','ست وتسعون دقيقة','سبع وتسعون دقيقة','ثمان وتسعون دقيقة','تسع وتسعون دقيقة'];


          if (hrs < 0 || hrs > 100 || mins < 0 || mins > 100) return "";
          if (hrs == 1 && mins == 1) return "ساعة ودقيقة واحدة";
          if (!hrs && !mins) return "";
          if(hrs && !mins) return arabicRuntimeHrs[hrs];
          if(!hrs && mins) return arabicRuntimeMins[mins];
          return arabicRuntimeHrs[hrs] + " و" + arabicRuntimeMins[mins];
        };

        $(document).on('click', function(event){

            if (openedMenu && !$(event.target).closest('#usermenu').length && !$(event.target).closest('#bars').length) {
                openedMenu = false;
               // $('#usermenu').removeClass('visible');
                that.closeLeftMobMenu();

            }
        }).on('click', '#leftMobMenuClose', function(event){
            that.closeLeftMobMenu();
        }).on('click', '.leftMobMenu-bottom a', function(event){
            that.closeLeftMobMenu();
        });

        this.formatSecondsToHrs    = function (seconds) {

            var h = seconds/3600 ^ 0,
                m = (seconds-h*3600)/60 ^ 0;

            if (this.getLanguage() == 'ar') {
                return this.formatArabicRuntime(h,m)
            }

            m = m < 10 ? '0' + m : m;
            return h + 'hrs. ' + m + 'min.';

        };

        this.formatArabicRuntime = function(hrs,mins) {

          var arabicRuntimeHrs = ['','ساعة واحدة','ساعتان','ثلاث  ساعات','أربع  ساعات','خمس  ساعات','ست  ساعات','سبع  ساعات','ثمان  ساعات','تسع  ساعات','عشر  ساعات','إحدى عشرة ساعة','اثنتا عشرة ساعة','ثلاث عشرة ساعة','أربع عشرة ساعة','خمس عشرة ساعة','ست عشرة ساعة','سبع عشرة ساعة','ثمان عشرة ساعة','تسع عشرة ساعة','عشرون  ساعة','إحدى وعشرون ساعة','إثنتا وعشرون ساعة','ثلاث وعشرون ساعة','أربع وعشرون ساعة','خمس وعشرون ساعة','ست وعشرون ساعة','سبع وعشرون ساعة','ثمان وعشرون ساعة','تسع وعشرون ساعة','ثلاثون  ساعة','إحدى وثلاثون ساعة','إثنتا وثلاثون ساعة','ثلاث وثلاثون ساعة','أربع وثلاثون ساعة','خمس وثلاثون ساعة','ست وثلاثون ساعة','سبع وثلاثون ساعة','ثمان وثلاثون ساعة','تسع وثلاثون ساعة','أربعون  ساعة','إحدى وأربعون ساعة','إثنتا وأربعون ساعة','ثلاث وأربعون ساعة','أربع وأربعون ساعة','خمس وأربعون ساعة','ست وأربعون ساعة','سبع وأربعون ساعة','ثمان وأربعون ساعة','تسع وأربعون ساعة','خمسون  ساعة','إحدى وخمسون ساعة','إثنتا وخمسون ساعة','ثلاث وخمسون ساعة','أربع وخمسون ساعة','خمس وخمسون ساعة','ست وخمسون ساعة','سبع وخمسون ساعة','ثمان وخمسون ساعة','تسع وخمسون ساعة','ستون  ساعة','إحدى وستون ساعة','اثنتا وستون ساعة','ثلاث وستون ساعة','أربع وستون ساعة','خمس وستون ساعة','ست وستون ساعة','سبع وستون ساعة','ثمان وستون ساعة','تسع وستون ساعة','سبعون  ساعة','إحدى وسبعون ساعة','اثنتا وسبعون ساعة','ثلاث وسبعون ساعة','أربع وسبعون ساعة','خمس وسبعون ساعة','ست وسبعون ساعة','سبع وسبعون ساعة','ثمان وسبعون ساعة','تسع وسبعون ساعة','ثمانون  ساعة','إحدى وثمانون ساعة','اثنتا وثمانون ساعة','ثلاث وثمانون ساعة','أربع وثمانون ساعة','خمس وثمانون ساعة','ست وثمانون ساعة','سبع وثمانون ساعة','ثمان وثمانون ساعة','تسع وثمانون ساعة','تسعون  ساعة','إحدى وتسعون ساعة','اثنتا وتسعون ساعة','ثلاث وتسعون ساعة','أربع وتسعون ساعة','خمس وتسعون ساعة','ست وتسعون ساعة','سبع وتسعون ساعة','ثمان وتسعون ساعة','تسع وتسعون ساعة'];

          var arabicRuntimeMins = ['','دقيقة واحدة ','دقيقتان ','ثلاث دقائق','أربع دقائق','خمس دقائق','ست دقائق','سبع دقائق','ثمان دقائق','تسع دقائق','عشر دقائق','إحدى عشرة دقيقة','اثنتا عشرة دقيقة','ثلاث عشرة دقيقة','أربع عشرة دقيقة','خمس عشرة دقيقة','ست عشرة دقيقة','سبع عشرة دقيقة','ثمان عشرة دقيقة','تسع عشرة دقيقة','عشرون دقيقة','إحدى وعشرون دقيقة','إثنتا وعشرون دقيقة','ثلاث وعشرون دقيقة','أربع وعشرون دقيقة','خمس وعشرون دقيقة','ست وعشرون دقيقة','سبع وعشرون دقيقة','ثمان وعشرون دقيقة','تسع وعشرون دقيقة','ثلاثون دقيقة','إحدى وثلاثون دقيقة','إثنتا وثلاثون دقيقة','ثلاث وثلاثون دقيقة','أربع وثلاثون دقيقة','خمس وثلاثون دقيقة','ست وثلاثون دقيقة','سبع وثلاثون دقيقة','ثمان وثلاثون دقيقة','تسع وثلاثون دقيقة','أربعون دقيقة','إحدى وأربعون دقيقة','إثنتا وأربعون دقيقة','ثلاث وأربعون دقيقة','أربع وأربعون دقيقة','خمس وأربعون دقيقة','ست وأربعون دقيقة','سبع وأربعون دقيقة','ثمان وأربعون دقيقة','تسع وأربعون دقيقة','خمسون دقيقة','إحدى وخمسون دقيقة','إثنتا وخمسون دقيقة','ثلاث وخمسون دقيقة','أربع وخمسون دقيقة','خمس وخمسون دقيقة','ست وخمسون دقيقة','سبع وخمسون دقيقة','ثمان وخمسون دقيقة','تسع وخمسون دقيقة','ستون دقيقة','إحدى وستون دقيقة','اثنتا وستون دقيقة','ثلاث وستون دقيقة','أربع وستون دقيقة','خمس وستون دقيقة','ست وستون دقيقة','سبع وستون دقيقة','ثمان وستون دقيقة','تسع وستون دقيقة','سبعون دقيقة','إحدى وسبعون دقيقة','اثنتا وسبعون دقيقة','ثلاث وسبعون دقيقة','أربع وسبعون دقيقة','خمس وسبعون دقيقة','ست وسبعون دقيقة','سبع وسبعون دقيقة','ثمان وسبعون دقيقة','تسع وسبعون دقيقة','ثمانون دقيقة','إحدى وثمانون دقيقة','اثنتا وثمانون دقيقة','ثلاث وثمانون دقيقة','أربع وثمانون دقيقة','خمس وثمانون دقيقة','ست وثمانون دقيقة','سبع وثمانون دقيقة','ثمان وثمانون دقيقة','تسع وثمانون دقيقة','تسعون دقيقة','إحدى وتسعون دقيقة','اثنتا وتسعون دقيقة','ثلاث وتسعون دقيقة','أربع وتسعون دقيقة','خمس وتسعون دقيقة','ست وتسعون دقيقة','سبع وتسعون دقيقة','ثمان وتسعون دقيقة','تسع وتسعون دقيقة'];


          if (hrs < 0 || hrs > 100 || mins < 0 || mins > 100) return "";
          if (hrs == 1 && mins == 1) return "ساعة ودقيقة واحدة";
          if (!hrs && !mins) return "";
          if(hrs && !mins) return arabicRuntimeHrs[hrs];
          if(!hrs && mins) return arabicRuntimeMins[mins];
          return arabicRuntimeHrs[hrs] + " و" + arabicRuntimeMins[mins];
        };

        this.getHashQuery = function(str) {

            var re = new RegExp(str + '/(.*?)(?:/|$)'),
                match = location.hash.match(re);

            if (match) return decodeURIComponent(match[1]);

            return null;

        };

        this.getAccountConfig                  = function (accountId, userData) {

            const self              = this;

            var promise             = $.Deferred();

            var options         = {
                id:accountId,
                token:userData.getSessionId(),
                api_token:userData.getSessionId()
            };

            this.remoteCall(new CallGet('accounts/' + accountId + '/settings/', options, function (response) {

                promise.resolve(response['response']);

            }).defineErrorHandler(function (query, status) {

                promise.reject(status);

            }));

            return promise;
        };


        //hiding placeholder for ie10

        this.onHidePlaceholder                 = function (node) {

            if(node.placeholder == node.value) {
                node.value = '';
            }

        }

        this.onOpenPreview = (node, event) => {

            event.preventDefault();

            let
                lesson              = $(node).data('lessonid'),
                course              = $(node).data('course-id'),
                type                = $(node).data('lesson-type'),
                urlFromAttr         = $(node).data('lesson-url'),
                newUrlParts         = {
                    contentCacheId:     course,
                    pageController:     'library',
                },
                link                = this.appLocation.buildURL(newUrlParts);


            if(!lesson || lesson.length == 0 || type != 'video' ) {
              return;
            }

            if (type === 'scorm') {
                window.history.pushState({}, '', $(node).attr('href'));
                that.onChangeLocation();
                return;
            }

            let previewModal           = new PreviewModal(this, node);
            previewModal.show(course, {id: lesson,  title: '', lesson_type : type}, link);

        };

        this.onSignUp   = (node, event) => {

            event.preventDefault();

            let type = $(node).data('type') || 'individual';

            if(type!='business') {
                this.redirect('signUp/type/' + type);
            } else {
                if(this.getLanguage()=='es') {
                    window.location = window.location.protocol + '//' + window.location.hostname + '/teamtraining/index-es.html';
                }else{
                    window.location = window.location.protocol + '//' + window.location.hostname + '/teamtraining/index.html';
                }
            }
        }

        this.scrollTo = function (selector, offset, speed) {
            offset = offset || 80;
            speed  = speed  || 500;
            $('html, body').animate({
                scrollTop: $(selector).offset().top - offset
            }, speed);
        };

        //Categories data for library and sidebar

        this.defineCategoriesData             =  (sortedArray) => {


            let prom = $.Deferred();

            if (typeof sortedArray == "undefined") {
              this.remoteCall(new CallGet('portal/static/json/sidebar/' + this.getLanguage() + this.rvtVal(), {}, (res) => {
              prom.resolve(this.buildCategoriesData(res));
              }).asCached().asLocalCached());
            }
            else {
              prom.resolve(this.buildCategoriesData(sortedArray));
            }


            return prom;

        };

        this.defineCoursesForCloneMenu        = () => {

            let prom                          = $.Deferred();

            let params                        = {
                'token':                this.user.getSessionId(),
                'lang':                 this.getLanguage(),
            };

            if(that.user.getUserId())
                this.remoteCall(new CallGet('portals/course_lists/for_cloning/', params, (res) => {
                    prom.resolve({'menu': res.response});
                }));

            return prom;
        };

        this.buildCategoriesData              = (list, filter) => {


            var iconArray = [];
            let sections = [];
            var categoryType = "";
            var iconRoute = pathTemplate+"/images/Icon_Transparent.png";
            var blankIconRoute = pathTemplate+"/images/Icon_Transparent.png";

            for (let key in list) {
                if(!list[key]['id']) continue;
                sections.push(list[key]);

            }

            sections = sections.map((group) => {

            //iconArray = jQuery.parseJSON(group.data.imgFiles);

            //not the correct or smartest way to get main category icons for ussite template;
            categoryType = group.json_filename;


            if (categoryType == "business")
                iconRoute = pathTemplate+"/images/Icon_Business.png"
            if (categoryType == "banking")
                iconRoute = pathTemplate+"/images/Icon_Financial.png"
            if (categoryType == "computer")
                iconRoute = pathTemplate+"/images/Icon_Computer.png"
            if (categoryType == "compliance")
                iconRoute = pathTemplate+"/images/Icon_Compliance.png"
            if (categoryType == "safety")
                iconRoute = pathTemplate+"/images/Icon_Safety.png"


                let section = {

                    id:             group.id,
                    name:           (typeof group.data !== 'undefined' ? group.data.title : ''),
                    url:            this.generateNewUrl('library/' + group.ceid +'/' + group.json_filename + '/'),
                    categories_0:   group.children.map((category) => this.buildCategoryData(category, group, 0, filter)),
                    class:          group.json_filename,
                    ceid:           group.ceid,
                    iconRoute:      iconRoute,
                    blankIconRoute: blankIconRoute
                }

                //debugger;

                if(!group.parent_ceid) {
                    that.appLocation.topCategories.push({id:group.ceid, json_filename:group.json_filename});
                }

                section.active = this.isActiveSection(section);

                return section;

            });

            // hide first section by STARGATE-794
            if (sections.every((section) => !section.active)) {
                //sections[0].active = true;
            }


            return {sections}



        };

        this.buildCategoryData = (category, group, lvl, filter) => {



            if (category.data) {

                let data = {

                    id: category.id,
                    active: category.id === this.currentPath[2],
                    name: category.data.title,
                    url: this.generateNewUrl('library/' +  category.ceid +'/' + group.json_filename + '/' + category.data.slug + '/'),
                    ceid:       category.ceid,
                    icon: category.data.imgFiles,
                    parent_ceid:       category.parent_ceid,
                    lessons:    ""

                };


                if (category.children) {

                    lvl++;
                    data['categories_' + lvl] = category.children.map((subcategory) => this.buildCategoryData(subcategory, group, lvl));

                }
                //debugger;

                return data;

            }

        };

        this.isActiveSection = (section, lvl = 0) => {
            if(typeof section == 'undefined') return false;

            let currentCEId   = this.appLocation.urlParts.contentCacheId;

            if (section.ceid ==  currentCEId) return true;

             if (!section['categories_' + lvl]) return false;

             return section['categories_' + lvl].some((category) => {

                 return this.isActiveSection(category, lvl + 1);

             });

        };

        // Embed video

        this.ctrlEmbedVideo =  (node) => {

            const component       = new Embed(this, node);

            component.preview()

        };

        function Embed(page, node) {

            let data                    = {},
                template                = node.html(),
                targetId                = node.attr('id'),
                playerId                = 'video';


            if(typeof node.attr('rel')!='undefined'){playerId=node.attr('rel');}

            //page.config.CDNPortal should be here
            const cdnPortal = 'https://fileshare.knowledgecity.com/';
            const videoSource = cdnPortal + 'opencontent/introvideos/knowledgecity/' + page.getLanguage() + '/' + node.data('filename') + '.mp4';
            const vttSource = cdnPortal + 'opencontent/introvideos/knowledgecity/captions/' + node.data('vtt') + '_' + page.getLanguage() + '.vtt';

            this.player                =  () => {

                $.when(
                    this.defineData()
                ).done(() => {

                }).always(() =>{

                    const videoJsPlayerhtml =
                        '<video crossdomain crossorigin="anonymous" id="'+ playerId +'" class="video-js vjs-default-skin video-static video-permanent-bar" controls preload="auto" width="100%">' +
                        '<source src="' + videoSource +'" type="video/mp4">' +
                        '</video>';


                    $('#' + targetId).html(videoJsPlayerhtml);

                    let player = videojs(document.getElementById(playerId), {
                        autoplay: false,
                        controls: true,
                        aspectRatio: '16:9',
                        playbackRates:   [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
                    });

                    player.play();

                });

            };

            this.preview                = () => {

                $.when(page.outContentPromise, page.loadStylesPromise).then(() => {
                    page.renderTo(template, page.getMainData(), '#' + targetId);
                    this.setHandlers();
                });

            };

            this.setHandlers            = () => {

                page.assignPageHandlers('#' + targetId, this);

            };

            this.onPlayVideo            = () => {

                this.player();

            };

            this.defineData             = () =>{

                return   $.get(vttSource,
                    (captions) => {
                        this.buildData(captions);
                });

            };

            this.buildData              = (captions) => {

                $.extend(data, {
                    captions: this.parseVTT(captions)
                });

            };

            this.parseVTT               = function(vttText){

                let vtt = vttText.split('WEBVTT'),
                    items = vtt[1].split('\n\r'),
                    vttFrases = [],
                    i = 0;


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

        };


        this.getPageMui = () => {

            const pageName = this.getClassName();

            let prom = $.Deferred();

            this.remoteCall(new CallGet('mui/0' + this.getPortalName() + '/0' + this.getLanguage() + '/',
                {
                    'code':     'all',
                    'nested':   true,
                    'groups':   `Pages-${pageName}`,
                    '_': config['LocalStorageStamp']
                }, (res) => {

                    if(typeof res.response !== 'undefined' && typeof res.response[pageName] !== 'undefined') {
                        prom.resolve(res.response[pageName]);
                    } else {
                        prom.resolve(res.response);
                    }
                }
            ).asCached().asLocalCached());

            return prom;
        };

        this.showApps                  = function (mui, userData) {

              var appDownload        = new AppDownload(service, mui, config, this);

              appDownload.show();
              if( this.checkMobileNav() && this.config.portal.portal_code == 'www' && typeof $.cookie('sb-closed') == 'undefined' && typeof $.cookie('sb-installed') == 'undefined' ) {
                  $('body').addClass('app-bar-padding');
                  $('header').addClass('bar-top');
                  $('#header').addClass('app-bar-margin');
                  $('.mobil-header').addClass('app-bar-margin');
                  $('.contentBody').addClass('app-bar-margin');
                  $('.inner-header.inner-header--lms').addClass('app-bar-margin');
              }

        };


        this.showChat                  = function () {

            const  that = this;

            var visitorLocalsettings = JSON.parse(localStorage.getItem("visitorLocalsettings"));

            if(deepInObject(visitorLocalsettings, 'ipInfo.country')){
                that.showChatAction(visitorLocalsettings.ipInfo.country)
            } else {

                $.getJSON(that.config['APIUrl'] + "visitor/localsettings/", function (myJson) {
                    try{
                        localStorage.setItem("visitorLocalsettings", JSON.stringify(myJson.response));
                        that.showChatAction(myJson.response.ipInfo.country)
                    } catch (e) {
                        console.log(e);
                    }
                });
            }

        };

        this.showChatAction             = function(myCountry){
            if (myCountry === 'US') {
                var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src='https://embed.tawk.to/595e9d266edc1c10b0344b0a/default';s1.charset='UTF-8';s1.setAttribute('crossorigin','*');s0.parentNode.insertBefore(s1,s0);
            }
        }

        this.checkMobileNav  = () => {
            return /iPad|iPhone|iPod/.test(navigator.userAgent) || /Android/i.test(navigator.userAgent);
        };
        //Request mobile app
        this.onRequestApp = (node, event) => {

            const  that = this;
            event.preventDefault();
            if(
                that.config.portal.iOSAappEnterprise  // if iOS app is published with Enterprise program
                && $(node).data('platform') == 'ios' // if platform is iOS
                ){
                    window.history.pushState({}, '', '/' + this.getLanguage() + '/mobileapp/ios');
                    that.onChangeLocation();
                // go to thelanding page /{lang}/mobileapp/ios
            }else if ( that.config.portal.androidNotStore && $(node).data('platform') == 'android' ){
                window.history.pushState({}, '', '/' + this.getLanguage() + '/mobileapp/android');
                that.onChangeLocation();
            }else{
                let requestAppModal = new RequestAppModal(this, node);
                requestAppModal.show()
            }

        };


        this.onResetProgress        = (courseID) => {

            let promise             = $.Deferred();

            let apiUrl              = 'courses/0' + courseID + '/quizzes/0' + that.getLanguage() +
                                      '/questions?_extend=multi&is_quizAttempt=1&studentID=' +
                                      that.user.getUserId() +'&token=' + that.user.getSessionId();

            this.remoteCall(new CallGet(apiUrl, {}, function (response) {

                promise.resolve(response['response']);

            }).defineErrorHandler(function (query, status, msg, response) {

                if(response['isAllowed'] === false) {
                    that.reload();
                }

                promise.reject(status);
            }));

            return promise;
        };

        // this.onResetProgress = (message, courseID) => {
        //
        //
        //     var that = this;
        //
        //     const onConfirm = function(){
        //
        //         var d = $.Deferred();
        //
        //         return $.ajax({
        //             url: that.config['APIUrl'] + "courses/0"
        //             + courseID
        //             + "/quizzes/0" + that.getLanguage()
        //             + "/questions?"
        //             + "_extend=multi&is_quizAttempt=1&studentID="
        //             + that.user.getUserId()
        //             + '&token=' + that.user.getSessionId(),
        //             dataType: "json"
        //         }).done(function (data) {
        //             d.resolve(data);
        //         }).fail(function (jqXHR, textStatus, errorThrown) {
        //             var response = jqXHR.responseJSON;
        //
        //             if(typeof response.response !== 'undefined') {
        //
        //                 response = response.response;
        //
        //                 if(response['isAllowed'] === false) {
        //
        //                     that.reload();
        //
        //                 }
        //
        //                 d.reject();
        //
        //                 return;
        //             }
        //
        //             d.reject();
        //         });
        //
        //
        //     };
        //
        //     that.showDanger(message, onConfirm);
        //
        // };


        this.onLoginToLMS   = function (n,e) {

            e.preventDefault();

            var accountID   = this.user.getAccountId();
            var apiUserID   = this.user.getApiUserId();

            var params            = {
                'token':            this.user.getSessionId(),
                'is_active':        1,
                'expire_date':      '+30 seconds',
                'api_user_id':      apiUserID
            };


            service.query(new CallPost('auth/auth_by_hash/account/' + accountID, params, function (res) {

                if(!res || !res.response || !res.response.hash) {
                    var msg     =   that.getMainData().mui.autoLoginFail || 'Authorization failed';
                    that.showAlert(msg, true);
                    return false;
                }

                window.location = '/admin/#!login|hash=' + res.response.hash + '&api_user_id=' + apiUserID;

            }).defineErrorHandler((query, status, errorThrown, res) => {

                console.error('Error:' + status + ', error: ' + errorThrown);

                if( status == 498 ){
                    that.user.logout();
                }

                that.showAlert( that.getMainData().mui.error.errorSaveLessonProgress, true).done(function (modalWindow) {
                    modalWindow.bindOnClose(function () {
                        that.redirectHome();
                    });
                });

            }));
        };

        // somebody moved this to Page instead of courses. It may be due to some things
        // like quiz launching from MyLearning rather than course page.  Probably this one function should be a module
        this.sendCourseEvent        = function (ev, data, accountSettings) {

            // check for debug mode
            if(window['kcpack'] && kcpack['debugurl']) {
                if(window.location.toString().indexOf(kcpack.debugurl)!==-1)
                    debugger;
                else
                    console.log("location", window.location.toString(), kcpack['debugurl'])
            }
            // this function is a good place for any external listener api's to handle course events
            // events are courseLaunched, courseStarted, lessonCompleted, allLessonsCompleted, quizCompleted
            // a course completion event can also be sent at various points.  Some LMS's have issues with it

            //default config
            var conf = {
                isUseCoursePassedEvent: true,
                isUseCourseFailedEvent: false,
                isCourseCompleteAfterLessons: false,
                isCourseCompleteAfterPassed: false,
                isCourseCompleteAfterFailed: false
            }

            // Articulate scorm export tool specifies 4 'modes' of reporting.
            // Here' are the equivalent settings for account settings

            //  - Passed/Incomplete
            //      isUseCoursePassedEvent: true,
            //      isUseCourseFailedEvent: false,
            //      isCourseCompleteAfterLessons: false,
            //      isCourseCompleteAfterPassed: false,
            //      isCourseCompleteAfterFailed: false

            //  - Passed/Failed
            //      isUseCoursePassedEvent: true,
            //      isUseCourseFailedEvent: true,
            //      isCourseCompleteAfterLessons: false,
            //      isCourseCompleteAfterPassed: false,
            //      isCourseCompleteAfterFailed: false

            //  - Completed/Incomplete
            //      isUseCoursePassedEvent: false,
            //      isUseCourseFailedEvent: false,
            //      isCourseCompleteAfterLessons: false,
            //      isCourseCompleteAfterPassed: true,
            //      isCourseCompleteAfterFailed: false

            //  - Completed/Failed
            //      isUseCoursePassedEvent: false,
            //      isUseCourseFailedEvent: true,
            //      isCourseCompleteAfterLessons: false,
            //      isCourseCompleteAfterPassed: true,
            //      isCourseCompleteAfterFailed: false

            if(typeof accountSettings === "object" && typeof accountSettings['courseEventConfig'] === "object") {
                $.extend(conf, accountSettings['courseEventConfig']);
            }

            //Tin Can / xAPI (this code maps our course events to Tin Can api) ////////////////////////////////
            if(tinCanApi.isReady){
                if(ev == "courseLaunched")
                    console.log("stateUserLaunchedCourse is not implemented");//tinCanApi.stateUserLaunchedCourse();

                if(ev == "courseStarted")
                    tinCanApi.stateUserStartedCourse();

                if(ev == "lessonCompleted")
                    tinCanApi.stateUserCompletedLesson(data.lessonId, data.lessonTitle);

                if(ev == "allLessonsCompleted" && conf.isCourseCompleteAfterLessons)
                    tinCanApi.stateUserCompletedCourse();

                if(ev == "quizCompleted") {
                    if(data['passed']){
                        if(conf.isUseCoursePassedEvent)
                            tinCanApi.stateUserPassedCourse(data['score'] / 100);
                        if(conf.isCourseCompleteAfterPassed)
                            tinCanApi.stateUserCompletedCourse();
                    } else {
                        if(conf.isUseCourseFailedEvent)
                            tinCanApi.stateUserFailedCourse(data['score'] / 100);
                        if(conf.isCourseCompleteAfterFailed)
                            tinCanApi.stateUserCompletedCourse();
                    }
                }

            }
            ////////////////////////////////////////////////////////////////////////////////////////////////////

            //SCORM (this code maps our course events to SCORM api) ////////////////////////////////////////////
            if(scormApi.isReady){

                if(ev == "courseLaunched") {
                    //default status. needs to be set or will show "complete" just by opening
                    var scormStatus = scormApi.LMSGetValue('cmi.core.lesson_status');
                    var shouldBeStatus = "incomplete";

                    if(data['totalProgress'] >= 100 && conf.isCourseCompleteAfterLessons) {
                        shouldBeStatus = "completed";
                    }

                    //if there's no quiz, but client wants courses to end 'passed'
                    if(data['totalProgress'] >= 100 && data['quiz']['hasQuiz'] == false) {
                        if(conf.isUseCoursePassedEvent && !conf.isCourseCompleteAfterPassed)
                            shouldBeStatus = "passed";
                        else
                            shouldBeStatus = "completed";
                    }


                    var dq = data['quiz'];
                    if(data['totalProgress'] >= 100 && dq['hasQuiz'] && dq['attemptsCount'] > 0) {
                        if( ( !dq['success'] || (dq['success'] && !dq['success']['is_passed']) ) && conf.isUseCourseFailedEvent)
                            shouldBeStatus = "failed";
                        if(dq['success'] && dq['success']['is_passed'] && conf.isUseCoursePassedEvent)
                            shouldBeStatus = "passed";
                        if(dq['success'] && conf.isCourseCompleteAfterPassed)
                            shouldBeStatus = "completed";
                    }

                    //if just launched and statuses don't match, set the client LMS status to kc status
                    if(scormStatus !== shouldBeStatus) {

                        // for some clients, we mark a course passed, then completed. so if "completed", do both again
                        if(shouldBeStatus === "completed"
                            && dq['hasQuiz'] && dq['success'] && dq['success']['is_passed']
                            && conf.isUseCoursePassedEvent)
                        {
                            scormApi.LMSSetValue("cmi.core.score.max", 100);
                            scormApi.LMSSetValue("cmi.core.score.raw", (dq['success'] && dq['success']['score']) || 100);
                            scormApi.LMSSetValue('cmi.core.lesson_status','passed');
                            scormApi.LMSCommit("");
                            //scormcloud will erase passed when completed just after passed
                            scormApi.LMSSetValue('cmi.core.lesson_status','completed');
                            scormApi.LMSCommit("");
                            shouldBeStatus = "passed";
                        }

                        if(shouldBeStatus === "passed" /*|| shouldBeStatus === "failed" (data doesn't have score for fail)*/ ) {
                            scormApi.LMSSetValue("cmi.core.score.max", 100);
                            scormApi.LMSSetValue("cmi.core.score.raw", (dq['success'] && dq['success']['score']) || 100);
                        }

                        //if not logged in, then don't 'undo' a completed/passed/failed status
                        if(!this.user.isAuth() && /passed|failed|completed/.test(scormStatus)) {
                            shouldBeStatus = scormStatus
                        }

                        scormApi.LMSSetValue('cmi.core.lesson_status', shouldBeStatus);
                        scormApi.LMSCommit("");
                    }

                    //if (!/passed|failed|completed/.test(scormApi.LMSGetValue('cmi.core.lesson_status')))
                    //    scormApi.LMSSetValue("cmi.core.lesson_status", "incomplete");
                }

                if(ev == "allLessonsCompleted" && conf.isCourseCompleteAfterLessons) {
                    scormApi.LMSSetValue('cmi.core.lesson_status','completed');
                    scormApi.LMSCommit("");
                }

                if(ev == "quizCompleted") {
                    //update scorm test percent and/or completion status
                    var newAttemptIndex = 1 * scormApi.LMSGetValue("cmi.interactions._count");
                    scormApi.LMSSetValue("cmi.interactions."+newAttemptIndex+".id", "int-"+newAttemptIndex);
                    scormApi.LMSCommit("");

                    //update scorm passed status (this code is also in quiz_results)
                    var alreadyPassed = (scormApi.LMSGetValue('cmi.core.lesson_status') == 'passed') ||
                                        (scormApi.LMSGetValue('cmi.core.lesson_status') == 'completed' && !conf.isCourseCompleteAfterLessons)
                    if(!alreadyPassed){
                        scormApi.LMSSetValue("cmi.core.score.max",100);
                        scormApi.LMSSetValue("cmi.core.score.raw", data['score']);
                        status = data['passed'] ? 'passed' : 'failed';
                        if(data['passed']){
                            if(conf.isUseCoursePassedEvent) {
                                scormApi.LMSSetValue("cmi.core.lesson_status", "passed");
                                scormApi.LMSCommit("");
                            }
                            if(conf.isCourseCompleteAfterPassed){
                                scormApi.LMSSetValue('cmi.core.lesson_status','completed');
                                scormApi.LMSCommit("");
                                //scormcloud will erase passed when completed just after passed
                                scormApi.LMSSetValue("cmi.core.lesson_status", "passed");
                                scormApi.LMSCommit("");
                            }
                        } else {
                            if(conf.isUseCourseFailedEvent){
                                scormApi.LMSSetValue("cmi.core.lesson_status", "failed");
                                scormApi.LMSCommit("");
                            }
                            if(conf.isCourseCompleteAfterFailed){
                                scormApi.LMSSetValue('cmi.core.lesson_status','completed');
                                scormApi.LMSCommit("");
                            }
                        }

                    }

                }

            }
        };

        this.generateMetaData         = function(group, type){

            var metaData            = '';

            if( mainData && typeof mainData.mui[group] != 'undefined' ) {

                var key             = group == 'pageTitle' ? 'dafaultTitle' :
                                      group == 'pageContent' ? 'defaultContent' : 'defaultKeywords';

                metaData            = mainData.mui[group][key] || mainData.mui.portalTitle || 'Learn Business Skills Online | KnowledgeCity';
            }

            var location            = this.appLocation.urlParts;

           switch (location.pageController) {
               case 'courses' :
                if(type == 'title' && typeof contentData != 'undefined' && typeof contentData.course != 'undefined' && contentData.course['meta_title'])
                    metaData         = contentData.course['meta_title'];
                else
                    metaData         = contentData && contentData.course[type] ? contentData.course[type] : metaData;

                metaData = metaData + ' | KnowledgeCity';

                  break;

               case 'library' :

                   if(contentData && contentData.metaData && typeof contentData.metaData[type] !== 'undefined') {

                       metaData     = contentData.metaData[type];
                   }
                   break;

               case 'index' :

                    //metaData;
                   break;

               case 'signUp':

                   if (typeof mainData.mui[group] != 'undefined') {
                        var singType = location.all[3] || false;
                       metaData         = mainData.mui[group]['singUp_' + singType]
                                        || mainData.mui[group][location.pageController]
                                        || metaData;
                   }

                   break;

               default:

                   if (typeof mainData.mui[group] != 'undefined') {

                       metaData     = mainData.mui[group][location.pageController] || metaData;
                   }
                   break;
           }

           return metaData;
        };


        this.checkFirstLogin         = function(){

            if(this.user.isFirstLogin()) {

                that.showFirstLoginForm({'isForcedFirst': true});
            }
        };

        this.addCanonical            = function(url){

            $('link[rel=\'canonical\']').remove();

            if(url) {
                $('head').append('<link rel="canonical" href="'+url+'" />');
            }
        };

        this.onRedirectHome         = function(){
           this.redirectHome();
        };

        this.checkAlert         = function(){

            if(localStorage.failAlertReason) {
                var mui     = this.getMainData().mui;
                this.showAlert(mui[localStorage.failAlertReason], true);
            }
            delete localStorage.failAlertReason;
        };



        this.checkSSOLogin           = function() {
            //if user has SSO id or SIP2 id and is logged out, attempt to open the login screen for SSO or SIP2 (library)

            // on some portals, ssoid is sent as url param (see this.preProcessURL), so pull from storage
            // and if found, check if we need to add settings
            var ssoid = localStorage.getItem("ssoid");
            if(ssoid && !this.config.login['ssoid'])
                this.config.login.ssoid = ssoid

            var authid = localStorage.getItem("authid");
            if(authid && !this.config.login['authid'])
                this.config.login.authid = authid

            // note that authlu and authlp are totally insecure and should only have been used for 'public information' cases.
            // authlu would almost never be set, except for a 3rd part integration that used an app id or something
            // authlp is actually used for libraries that have a default pin for everyone (or no pin)
            var authlu = localStorage.getItem("authlu");
            if(authlu)
                this.config.login.authlu = authlu;

            var authlp = localStorage.getItem("authlp");
            if(authlp)
                this.config.login.authlp = authlp;

            //specify an external forward based login, like active dir (eg oauth, but also any other)
            var authfw = localStorage.getItem("authfw");
            if(authfw)
                this.config.login.authfw = authfw;

            // if this user used sso in past, override default to be sso screen
            if(ssoid)
                this.config.login.default = 'ActiveDirectory'; //currently only kind of sso

            // if this user used sso in past, override default to be sso screen
            //if(authid)
            //    this.config.login.default = 'LibraryIdPin'; //for libraries

            //if not logged in, check if we should popup the login box
            if(!this.user.isAuth() && this.config['login'] && this.config.login['ssoid'] && this.config.login['ssoPopUp'])
                this.showLoginForm()

            if(!this.user.isAuth() && this.config['login'] && !this.config.login['ssoid'] && this.config.login['authid'] && this.config.login['ssoPopUp'])
                this.showLoginForm()
        }

        this.generatePageError          = function() {

            const that          = this;

            this.defineDataPromise.reject();
            //this.outMainPromise.reject();
            this.outContentPromise.reject();
            this.loadStylesPromise.reject();

            var node            = $('body');
            var template        = node.html();
            var targetId        = node.attr('id', 'body');
            var mainData        = this.getMainData();

            $('head').append('<link href="'+mainData.VIEW +'css/style.css" rel="stylesheet">');

            $.when(this.loadMui(), this.loadTemplate('ui/errorPage', function (html) {

                   template            = html;

            })).then(function () {

                    var courseError = {
                       title: "Houston, We've Got a Problem",
                       text: "If you see this page, something is not quite right. We've been notified about it and we'll fix it as soon as possible. In the mean time, try going back to the previous page or",
                       link: "contact us for help.",
                       logo: mainData.site.logo
                    };

                    var portalError = {
                        title: "Portal Unavailable",
                        text: "The requested page failed to load. Try to <a class='company-title' data-handler='onClearCookies'>reload the page</a>. If the problem persists, please contact us for Support.",
                        link: "contact us",
                        logo: mainData.site.logo
                    };

                    var data        = config.portal.error ? portalError : courseError;

                    that.renderTo(template, data, '#body');
                    that.renderMetaData({});
                    that.assignPageHandlers();
            });

            window.onpopstate = function(e) {

                that.reload();
            };

            return false;
        };

        this.onSendError            = function(node, e) {

            e.preventDefault();

            var form                = new FeedbackForm(this, false, false);

            form.show('errorPage');
        };

        this.onSwitch             = function(node, e) {

            e.preventDefault();

            var fieldset = $(node).closest('.fieldset');

            $(fieldset).find('label').each(function () {
                $(this).removeClass('is_selected');
                $(this).children('input').removeAttr('checked');
            });

            $(node).addClass('is_selected');
            $(node).children('input').attr('checked', true);

        };

        this.onClearCookies         = function(node, e) {

            e.preventDefault();

            var userCookies          = $.cookie();

            for(var cookie in userCookies) {

                $.removeCookie(cookie);
            }

            localStorage.clear();

            that.reload();
        };
        this.scrollToForm       = function () {

            if(this.urlParts.all.length == 3 ) {
                var node = this.urlParts.all[2];
                var header_height  = this.getMinusHeaderScroll();
                var node_top = $('#'+node).offset().top;
                node_top = node_top - header_height;
                this.scrollToNode(node_top);

            }

        };
        this.onScrollNode             = function (node, event) {
            var header_height  = this.getMinusHeaderScroll();
            var node_to = $(node).data('to');
            var lms_top = $(node_to).offset().top;
            lms_top     = lms_top - header_height;
            this.scrollToNode(lms_top);
        };
        this.scrollToNode           = function(node_height) {
            $('body,html').animate({
                    scrollTop: node_height
                }, 400);

        };
        this.getMinusHeaderScroll   = function() {
            // var th = $('div.topbar').height();
            var tp = $('#header').height();
            return tp;
        };
        this.formatAMPM             = function (dateStr, isDate) {

            if(isEmpty(dateStr)) {
                return null;
            }

            let formatTime          = function (time) {

                if(time < 10) {
                    return '0' + time.toString();
                }

                return time;
            };

            let date                = new Date(dateStr + ' UTC');

            let hours               = date.getHours();
            let minutes             = date.getMinutes();
            let ampm                = hours >= 12 ? 'PM' : 'AM';

            hours                   = hours % 12;
            hours                   = hours ? hours : 12; // the hour '0' should be '12'
            minutes                 = minutes < 10 ? '0' + minutes : minutes;

            if(isDate) {
                return formatTime(date.getFullYear()) + '-' + formatTime(date.getMonth() + 1)
                    + '-' + formatTime(date.getDate()) +
                    ' ' + hours + ':' + minutes + ' ' + ampm;
            }

            return                  hours + ':' + minutes + ' ' + ampm;
        };

        /**
         * Format date
         * @param dateStr
         * @returns {string}
         */
        this.formatDate             = function (dateStr) {

            let date                = new Date(dateStr);

            let monthNames          = [
                "January", "February", "March",
                "April", "May", "June", "July",
                "August", "September", "October",
                "November", "December"
            ];

            let day                 = date.getDate();
            let monthIndex          = date.getMonth();
            let year                = date.getFullYear();

            return day + ' ' + monthNames[monthIndex] + ' ' + year;
        };





        this.formatEvents           = function (data) {

            let isHidden        = '';

            // init events object
            let events          = {};

            let mui             = this.getMui();

            if(isNotEmpty(mui['pageContent']) && mui['pageContent']['event']) {
                mui             = mui['pageContent']['event'];
            }

            for(let i in data['events']) {

                if(!data['events'].hasOwnProperty(i)) {
                    continue;
                }

                if(isNotEmpty(data['events'][i]['dpn'])) {
                    let $html               = $('<div>');
                    $html.text(data['events'][i]['dpn']);
                    let description         = $html.html();
                    description             = description.replace(/([^>])\n+/g, '$1<br/>');
                    data['events'][i]['dpn'] = description;
                }

                let isRegister      = this.user.isAuth();

                // convert date of event to AM PM
                data['events'][i]['date_start_time'] = this.formatAMPM(data['events'][i]['date_start']);
                data['events'][i]['date_start_date'] = this.formatAMPM(data['events'][i]['date_start'], true);

                // reg date start end
                data['events'][i]['reg_date_start']  = this.formatAMPM(data['events'][i]['reg_date_start'], true);
                data['events'][i]['reg_date_end']    = this.formatAMPM(data['events'][i]['reg_date_end'], true);


                // create event name for list
                // format October 12, 2018 @ 6:00 AM - 8:30 AM Pacific
                let listName                = this.formatAMPM(data['events'][i]['date_start'], true);
                data['events'][i]['date_start']      = data['events'][i]['date_start_date'];

                // calc status of event
                let statusText      = '';
                if(isNotEmpty(data['events'][i]['is_available'])) {
                    data['events'][i]['event_status'] = 'available';
                } else if (isNotEmpty(data['events'][i]['is_review'])) {
                    data['events'][i]['event_status'] = 'review';
                    listName                += ' - ' + mui['review'];
                    statusText              = mui['review'];
                    isRegister              = false;

                } else if (isNotEmpty(data['events'][i]['is_approved'])) {
                    data['events'][i]['event_status'] = 'approved';
                    listName                += ' - ' + mui['approved'];
                    statusText              = mui['approved'];
                    isRegister              = false;
                } else if (isNotEmpty(data['events'][i]['is_rejected'])) {
                    data['events'][i]['event_status'] = 'rejected';
                    listName                += ' - ' + mui['rejected'];
                    statusText              = mui['rejected'];
                    isRegister              = false;
                }

                if(isNotEmpty(data['events'][i]['is_review']) || isNotEmpty(data['events'][i]['is_approved'])){

                    data['events'][i].printURL = that.generateNewUrl('printCourseListForm/' + data['events'][i].course_id
                        + '/event/' + data['events'][i].event_id);
                }

                data['events'][i]['event_status_text'] = statusText;
                data['events'][i]['list_name'] = listName;
                data['events'][i]['is_hidden'] = isHidden;

                isHidden                    = 'is_hidden';

                let left            = data['events'][i]['capacity'] - data['events'][i]['count_approved'];

                if(left <= 0) {
                    left            = 0;
                    isRegister      = false;
                }

                let text            = '';

                if(isEmpty(data['events'][i]['count_approved'])) {
                    text            = mui['seats'] ? mui['seats'] : '';
                } else {
                    text            = mui['seats_left'] ? mui['seats_left'] :'';
                }

                // calc event message by reg date
                let eventMessage    = '';

                if(isNotEmpty(data['events'][i]['is_reg_not_started'])) {
                    isRegister      = false;
                    // reg_start_at
                    eventMessage    = mui['reg_start_at'] ? mui['reg_start_at'] : '';
                    eventMessage    = eventMessage.replace(/\{\{date\}\}/, data['events'][i]['reg_date_start']);
                } else if (isNotEmpty(data['events'][i]['is_reg_closed'])) {
                    isRegister      = false;
                    // reg_closed_at
                    eventMessage    = mui['reg_closed_at'] ? mui['reg_closed_at'] : '';
                    eventMessage    = eventMessage.replace(/\{\{date\}\}/, data['events'][i]['reg_date_end']);
                } else if(isNotEmpty(data['events'][i]['reg_date_start'])) {
                    // reg_end_at
                    eventMessage    = mui['reg_end_at'] ? mui['reg_end_at'] : '';
                    eventMessage    = eventMessage.replace(/\{\{date\}\}/, data['events'][i]['reg_date_end']);
                }

                data['events'][i]['is_register'] = isRegister;
                data['events'][i]['event_message'] = eventMessage;

                data['events'][i]['left'] = text.replace(/\{\{count_approved\}\}/, left);
                data['events'][i]['left'] = data['events'][i]['left'].replace(/\{\{capacity\}\}/, data['events'][i]['capacity']);

                // convert reg date
                /*
                if(isEmpty(data['events'][i]['reg_date_start'])) {
                    data['events'][i]['reg_date_start'] = 'N/A';
                }

                if(isEmpty(data['events'][i]['reg_date_end'])) {
                    data['events'][i]['reg_date_end'] = 'N/A';
                }
                */

                /*
                if(isNotEmpty(data['events'][i]['capacity_min'])) {
                    data['events'][i]['left'] = data['events'][i]['left'] + ' ' + mui['seats_min'].replace(/\{\{capacity_min\}\}/, data['events'][i]['capacity_min']);
                }
                */

                let additional          = data['events'][i]['additional'];
                let additional_mui      = data['events'][i]['additional_mui'];

                // assign event to events
                events[data['events'][i]['event_id']] = data['events'][i];

                if(isEmpty(additional)) {
                    continue;
                }

                for(let i in additional) {

                    let item            = additional[i];

                    if(isObject(additional_mui) && isDefined(additional_mui[i])) {
                        item.value      = additional_mui[i];
                    }
                }

                let additionalNew       = [];

                for(let i in additional) {

                    let item            = additional[i];
                    additionalNew.push(item);
                }

                data['events'][i]['additional'] = additionalNew;
            }

            return events;
        };

        this.changeEventStatus      = function (status, $eventBtn, $eventStatus) {

            let mui                 = this.getMui();

            if(isNotEmpty(mui['pageContent']) && mui['pageContent']['event']) {
                mui                 = mui['pageContent']['event'];
            }

            if(!this.user.isAuth()) {
                $eventBtn.addClass('disabled');
                return;
            }

            switch (status) {
              case '':
                  $eventBtn.addClass('disabled');
                  $eventBtn.attr('disabled','disabled');
                  break;
              case 'disable':
                  $eventBtn.addClass('disabled');
                  $eventBtn.attr('disabled','disabled');
                  break;
              case 'available':
                  $eventBtn.removeClass('disabled');
                  $eventBtn.removeAttr('disabled');
                  $eventStatus.text(' ');
                  break;
              case 'review':
                  $eventStatus.text(mui['review']);
                  $eventBtn.addClass('disabled');
                  $eventBtn.attr('disabled','disabled');
                  break;
              case 'approved':
                  $eventStatus.text(mui['approved']);
                  $eventBtn.addClass('disabled');
                  $eventBtn.attr('disabled','disabled');
                  break;
              case 'rejected':
                  $eventStatus.text(mui['rejected']);
                  $eventBtn.addClass('disabled');
                  $eventBtn.attr('disabled','disabled');
                  break;
                default:
            }
        };

        this.changeEventMsg         = function (event, $eventMessage) {

            let mui             = this.getMui();

            if(isNotEmpty(mui['pageContent']) && mui['pageContent']['event']) {
                mui             = mui['pageContent']['event'];
            }

            // calc event message by reg date
            let eventMessage        = '';

            if(isNotEmpty(event['is_reg_not_started'])) {
                // reg_start_at
                eventMessage    = mui['reg_start_at'] ? mui['reg_start_at'] : '';
                eventMessage    = eventMessage.replace(/\{\{date\}\}/, event['reg_date_start']);
            } else if (isNotEmpty(event['is_reg_closed'])) {
                // reg_closed_at
                eventMessage    = mui['reg_closed_at'] ? mui['reg_closed_at'] : '';
                eventMessage    = eventMessage.replace(/\{\{date\}\}/, event['reg_date_end']);
            } else if(isNotEmpty(event['reg_date_start'])) {
                // reg_end_at
                eventMessage        = mui['reg_end_at'] ? mui['reg_end_at'] : '';
                eventMessage        = eventMessage.replace(/\{\{date\}\}/, event['reg_date_end']);
            }

            $eventMessage.text(eventMessage);

            return eventMessage;
        };

        // function to show a popup with demo video for newmena template.
        this.onShowDemoVideo        = function ( node, event ) {
            var demoVideo = new DemoVideo();
            var source = 'https://fileshare.knowledgecity.com/opencontent/howToDemo/'+this.getLanguage()+'/1-how-to.mp4';

            if( that.config.portal.howWorksCustomVideo ) {
                source = this.config.CDNJson+'opencontent/portals/'+this.getPortalId()+'/assets/videos/'+this.getLanguage()+'/learnhow.mp4';
            }

            demoVideo.showDemo({
                selector : '#videoWindow',
                source   : source
            }, this);
        };

        // function to detach/attach a listener for popstate and handle background
        // for android/ios applications landing pages on the site
        this.popstateListener      = function () {
          window.removeEventListener('popstate', that.changeAndroidBg);
          window.addEventListener('popstate', that.changeAndroidBg = function (e){
            that.changeLandingBg(e);
          });
        };

        // function to handle (remove) backgrounds on iOS or Android landing pages
        this.changeLandingBg       = function (event) {
            if( $('body').hasClass('ios-bg') && ( $('body').hasClass('android') || $('body').hasClass('ios') ) ) {
              var plt = $('body').data('plt');
              $('body').removeClass( 'ios-bg '+ plt );
              $('.header').css('display', 'block');
              $('.footer').css('display', 'block');
            }

        };
    }

    return Page;
});
