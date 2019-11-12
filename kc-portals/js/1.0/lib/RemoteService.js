;define(['config!', 'jquery', 'lib/RemoteCall'], function (config, $, RemoteCall) {


    function RemoteService(url) {

        var baseUrl                 = url;

        this.getBaseUrl             = function (alter) {
            if(alter && baseUrl == "https://api.knowledgecity.com/v2/"){
                return "https://api2.knowledgecity.com/v2/";
            }
            else return baseUrl;
        };

        this.setBaseUrl             = function (url) {

            var old                 = baseUrl;

            baseUrl                  = url;

            return old;
        };

        /**
         *
         * @param {RemoteCall} query
         * @return {Promise}
         */
        this.query                  = function (query) {

            if(query instanceof RemoteCall === false) {
                throw new TypeError("query is not an instance of RemoteCall ( " + typeof(query) + " )");
            }

            const self              = this;

            var url                 = this.generateUrl(query);
            var parameters          = query.getParameters();

            /*
            if(url.match(/(sidebar)|(courselist)|(navigation)/)) {
                var regexp          = new RegExp(config.CDNPortal, 'i');
                url                 = url.replace(regexp, '//kc-api/');
                url                 = url.replace(/--v[0-9]+/i, '');
            }
             */

            /*
            if(url.match(/(sidebar)|(courselist)|(navigation)/)) {
                var regexp          = new RegExp(config.CDNPortal, 'i');
                url                 = url.replace(regexp, '//kc-api/');
                url                 = url.replace(/--v[0-9]+/i, '');
            }
            */

            /*
            if(query.getOption(query.XDEBUG) === true) {
                if(parameters instanceof FormData) {
                    parameters.append('XDEBUG_SESSION_START', 'PHPSTORM');
                } else {
                    parameters      = $.extend(parameters, {'XDEBUG_SESSION_START': 'PHPSTORM'});
                }
            }
            */

            // parameters = $.extend(parameters, {'_': config.LocalStorageStamp})

            var options             = {
                data:               parameters,
                method:             query.getMethod(),
                success:            function (data, textStatus, jqXHR) {

                    var handler     = query.getDataHandler();

                    if(typeof handler === 'function') {
                        handler(data, query, textStatus);
                    }
                },
                error:              function (jqXHR, textStatus, errorThrown) {

                    let handler     = query.getErrorHandler();

                    if(typeof handler === 'function') {
                        handler(query, jqXHR.status, errorThrown, jqXHR.responseJSON ? jqXHR.responseJSON.response : jqXHR);

                    } else {

                        self.ajaxErrorHandler(query, jqXHR, textStatus, errorThrown);
                    }
                }
            };

            if(query.isCached()) {
                options.cache       = true;
            }

            if(query.getOption(query.PROCESS_DATA) !== null) {
                options.processData = query.getOption(query.PROCESS_DATA);
            }

            if(query.getOption(query.CONTENT_TYPE) !== null) {
                options.contentType = query.getOption(query.CONTENT_TYPE);
            }

            return $.ajax(url, options);
        };

        /**
         *
         * @param {RemoteCall} query
         */
        this.generateUrl            = function (query) {

            var alterBaseUrl = false;
            
            return this.getBaseUrl(alterBaseUrl) + query.getResource();

        };

        /**
         * @param   {RemoteCall}    query
         * @param   {jQuery}        jqXHR
         * @param   {String}        textStatus
         * @param   {String}        errorThrown
         */
        this.ajaxErrorHandler       = function (query, jqXHR, textStatus, errorThrown) {

            // console.group("RemoteService");
            // console.error("Request error: " + errorThrown + "(status = " + textStatus + ")");
            // console.log("Resource info: " + query.toString());
        }

    }

    return RemoteService;

});