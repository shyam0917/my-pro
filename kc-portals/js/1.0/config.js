;define([], function(){

    // default config core
    var config                      = {

        version:                    "1.0",
        // Default portal Name
        portalName:                 "",
        // Portal Guid
        portalID:                   "",
        // Define Portal Name By Domain?
        isDefinePortalName:         true,

        languages:                  ["en", "ar"],
        default_lang:               "ar",


        // Path
        basePath:                   "/",
        basePathTemplate:           "/templates/",
        mainTemplate:               "main",

        // default config core
        LocalStorageStamp:          0,

        // CDNs

        // Url for icons and images
        CDNContent:                 "https://cdn0.knowledgecity.com/opencontent/courses/",
        // Url for vendors libs
        CDNVendors:                 "https://cdn0.knowledgecity.com/vendors/",
        // Url for JSON contents
        CDNJson:                    "https://cdn0.knowledgecity.com/",
        // Url for API
        APIUrl:                     "https://api.knowledgecity.com/v2/",
        // Url for API v1
        APIUrlv1:                   "https://api.knowledgecity.com/",
        // quizSite Urls
        quizSite:                   "https://kcquiz.knowledgecity.com/",

        CDNPortal:                  "https://cdn0.knowledgecity.com/",

        staticContentHost:          "https://www.knowledgecity.com",

        user: {
            // check interval user online presence in seconds
            onlineCheckInterval: 60 * 5,
            // time in minutes before local data expires (cookies)
            localExpires:        30
        },

        getClickyID:                null,
        googleAnalyticsID:          null,
        arbitraryCode:              null,

        login:                      {options: ["UsernamePassword"], default:"UsernamePassword"},
        openLessons:                "3",

        libraryCategoriesCEIDs:     [],

        allowedCountries:           ["US","CA"],
        dateFormats: {
            date           : "YYYY-MM-DD, HH:mm:ss",
            time           : "HH:mm:ss",
            datetime       : "YY-MM-DD, HH:mm:ss",
            prettydate     : "LL",
            prettydatetime : "LLL",
            prettyfulldate : "LL, HH:mm:ss"
        }

        // Key for jwplayer
        //jwplayerKey:                "BEEAwFNvHLocmZPNaW8r8HvwmigxpsF9q/MbrxO4dg0="
    };

//if(typeof kcpack==='object' && kcpack['id']==="1ac32669-cbdb-4ac5-8c3a-71a3c70d7a2b" && location.href.split('/')[2]=="cloud.scorm.com" && location.href.split('/')[3]=='sandbox')
//{
//    if(confirm("continue in debug more?"))
//        debugger;

//    console.log('testscorm');
//    try{console.die()}catch(e){};
//}
    // path to template
    config.pathTemplate             = ( (config.staticContentHost /*&& !(typeof kcpack == "object")*/) ? config.staticContentHost : '') + config.basePathTemplate + config.portalName + '/' + config.version;


    /**
     * Define portal name by domain
     *
     * @return {string}
     */
    function definePortalNameByDomain() {

        var domain                     = window.location.hostname.split('.');
        if(domain[1]=="ngrok")
            return "www"

        if(domain[0] == 'www' && !(
            domain[1] == 'knowledgecity' ||
            domain[1] == 'kcstage' ||
            domain[1] == 'kcdev' ||
            domain[1] == 'kcexp' ||
            domain[1] == 'kc-portals'
            ))
            return domain[1];

        if (domain[0]) {
            return domain[0];
        } else {
            return config.portalName;
        }
    }

    /**
     *
     * @param {jQuery}          $
     * @param {function}        LocalStorage
     * @param {function}        onLoad
     */
    function loadPortalConfig($, LocalStorage, onLoad) {

        // Check local storage
        var localStorage            = new LocalStorage();
        const configKey             = 'config';

        var savedConfig             = localStorage.getLocalStorageItem(configKey);

        // reset local storage if stamp not equal
        if(1 ||
        (savedConfig !== null
        && typeof config['LocalStorageStamp'] !== 'undefined'
        && config['LocalStorageStamp'] !== savedConfig['LocalStorageStamp'])
        ) {//force portal config to always be requested from API

            savedConfig             = null;
            //localStorage.clear();
            //localStorage.removeKey('config')
            //we decided to just go with fresh config each time.
        }

        // save LocalStorageStamp to localStorage
        if(config['LocalStorageStamp']){
            // check if saved storage stamp is not equal to storage stamp from config then reload the page
            var savedStorageStamp = localStorage.getLocalStorageItem('LocalStorageStamp');
            if(savedStorageStamp && savedStorageStamp != config['LocalStorageStamp']) {
                console.log('LocalStorageStamp reload');
                localStorage.clear();
                location.reload();
            }
            localStorage.setLocalStorageItem('LocalStorageStamp', config['LocalStorageStamp']);
        }else{
            var savedStorageStamp = localStorage.getLocalStorageItem('LocalStorageStamp');
            if(savedStorageStamp)
                config['LocalStorageStamp'] = savedStorageStamp;
            else
                config['LocalStorageStamp'] = Date.now();
            localStorage.setLocalStorageItem('LocalStorageStamp', config['LocalStorageStamp']);
        }

        if(savedConfig !== null) {

            onLoad(savedConfig);
            return;
        }

        if(config.isDefinePortalName) {

            config.portalName       = definePortalNameByDomain();
        }

        var time                    = new Date();
        var url                     = config.APIUrl + 'portals/0' + config.portalName
                                    // extended config and timestamp
                                    + '/?_extend=config,catceid'

        //req has the same API as require().
        $.get(url, function (data) {

            if(typeof data.response !== 'undefined') {

                config['portal']    = data.response;

                config.langs        = data.response['langs'];

                // normalize config data
                config.languages    = $.map(data.response['langs'], function (value) {


                    if(value['is_default'] === 1) {
                        config.default_lang = value['lang'];
                    }


                    if (value['active'] === 1) {
                        return [value['lang']];
                    }
                });

                config.portalName   = config.portal['portal_code'];
                config.portalID     = config.portal['id'];
                config.portalTitle  = config.portal['portal_name'];
                config.style        = config.portal['style'] || false;
                config.getClickyID  = config.portal['getclickyid'] ? config.portal['getclickyid'] : null;
                config.googleAnalyticsID  = config.portal['googleAnalyticsID'] ? config.portal['googleAnalyticsID'] : null;
                config.login        = config.portal['login'] ? config.portal['login'] : {options: ["UsernamePassword"], default:"UsernamePassword"};
                config.arbitraryCode = config.portal['arbitraryCode'] || null;
                config.openLessons  = config.portal['openLessons'] || config.openLessons;
                config.isRequestAccess  = config.portal['isRequestAccess'];
                //config.isCoursesConfirmation  = config.portal['isCoursesConfirmation'];
                config.isLoginRequired  = config.portal['isLoginRequired'];
                // replace isLoginRequiredNew to isRequestAccess
                config.isLoginRequiredNew  = config.portal['isRequestAccess'];
                config.portal['isLoginRequiredNew'] = config.isLoginRequiredNew;
                config.isShoweBooks  = config.portal['isShoweBooks'];
                config.isShowCongrats = config.portal['isShowCongrats'];
                config.openCertificates = config.portal['openCertificates'];
                config.portalStorageStamp = config.portal['portalStorageStamp'] || config.LocalStorageStamp;
                if(typeof config.staticFilesCDN !== 'undefined') config.basePathTemplate = config.staticFilesCDN+config.basePathTemplate;

                // redirect to portal URL
                if( typeof config.allowPortalRedirect2Domain != 'undefined' &&
                    config.allowPortalRedirect2Domain &&
                    typeof config.portal['portal_domain'] != 'undefined' &&
                    config.portal['portal_domain'] &&
                    config.portal['portal_domain'] != location.hostname) {
                    location.href = "http://" + config.portal['portal_domain'] + location.pathname + location.search + location.hash;
                    return;
                }

                // rewrite config if defined!
                if(typeof config['template'] !== 'undefined') {
                    config.portal['template'] = config['template'];
                }
                // define template version
                if(typeof config.portal['version'] !== 'undefined') {
                     config['version'] = config.portal['version'];
                }

                if(typeof config.portal['template'] !== 'undefined') {
                    config.pathTemplate  = (config.staticContentHost ? config.staticContentHost : '') + config.basePathTemplate + config.portal['template'] + '/' + config.version;
                }

                if(config.portalName=='libraries') {
                    config['APIUrl'] = 'https://api1.knowledgecity.com/v2/';
                }

                if(config.disableRVTForScripts === true){
                    window.localStorage.setItem('LocalStorageStamp', '-');
                }
            }

            localStorage.setLocalStorageItem(configKey, config);

            //if(typeof kcpack==='object')
            //    console.log('debug5', JSON.stringify(config));

            onLoad(config);

        }).fail(function (jqXHR) {

            //show error page if portal not exist
            config.portal               = {
                error:1
            };
            config.default_lang         = 'en';
            config.onlineCheckInterval  = 100;
            config.pathTemplate         = (config.staticContentHost ? config.staticContentHost : '') + config.basePathTemplate + 'error' + '/' + config.version;

            onLoad(config);
        });
    }

    // require js API method load (read: http://requirejs.org/docs/download.html#plugins)
    return {
        load: function (name, req, onLoad, reqConfig) {

            if (reqConfig['isBuild'] === true) {
                //Indicate that the optimizer should not wait
                //for this resource any more and complete optimization.
                //This resource will be resolved dynamically during
                //run time in the web browser.
                onLoad();
            }

            require(['jquery', 'lib/LocalStorage'], function ($, LocalStorage) {
                // path to template
                var configPath = config.basePath;

                if(typeof kcpack === 'object') {
                    configPath = kcpack.contentPath;

                    config.isDefinePortalName = false;
                    config.portalName=kcpack.contentPath.match(/\/\/([a-z]*)\./i)[1];
                    if(!("portal" in config))
                            config.portal = {};

                    if(config.portalName=='www') {
                        config['template'] = 'ussite';
                        config.portal['template'] = 'ussite';
                    }
                    if("template" in kcpack) {
                        config['template'] = 'ussite';
                        config.portal['template'] = 'ussite';
                    }

                    config.pathTemplate = (config.staticContentHost ? config.staticContentHost : '') + config.basePathTemplate + config.portal['template'] + '/' + config.version;
                    config.startLang    = kcpack.startLang;

                }



                // overrideConfig
                if(typeof overrideConfig == 'undefined'){
                    $.get(configPath + 'js/overrideConfig--v'+ Date.now() +'.json', function (overrideConfig) {

                        if (typeof  overrideConfig === 'string') {
                            overrideConfig =  $.parseJSON(overrideConfig);
                        }

                        config              = $.extend(config, overrideConfig);

                        if(typeof kcpack === 'object')
                            console.log('debug3', JSON.stringify(config));

                    }).always(function () {

                        loadPortalConfig($, LocalStorage, onLoad);
                    });
                }else{
                    if (typeof  overrideConfig === 'string') {
                        overrideConfig =  $.parseJSON(overrideConfig);
                    }

                    config              = $.extend(config, overrideConfig);

                    if(typeof kcpack === 'object')
                        console.log('debug3', JSON.stringify(config));

                    loadPortalConfig($, LocalStorage, onLoad);
                }
            });
        }
    }
}());
