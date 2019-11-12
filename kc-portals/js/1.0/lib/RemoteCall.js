;define(function(){

    /**
     * Remote call structure
     *
     * @param   {string}            resource
     * @param   {object}            parameters
     * @param   {function}          dataHandler
     * @param   {{}=}               options
     * @constructor
     */
    function RemoteCall(resource, parameters, dataHandler, options) {

        if(typeof options === 'undefined') {
            options                 = {'method': 'get'};
        }

        this.resource               = resource;
        this.parameters             = parameters;
        this.dataHandler            = dataHandler;
        this.errorHandler           = null;
        this.method                 = options.method;
        this.options                = options;

        this.getResource            = function () {
            return this.resource;
        };

        this.getParameters          = function () {
            return this.parameters;
        };

        this.getDataHandler         = function () {
            return this.dataHandler;
        };

        /**
         * @param {Function|*} newHandler
         * @return {Function|*}
         */
        this.setDataHandler         = function (newHandler) {

            var old                 = this.dataHandler;

            this.dataHandler        = newHandler;

            return old;
        };

        this.getErrorHandler        = function () {
            return this.errorHandler;
        };

        /**
         * @param {Function|*} newHandler
         * @return {Function|*}
         */
        this.setErrorHandler        = function (newHandler) {

            var old                 = this.errorHandler;

            this.errorHandler       = newHandler;

            return old;
        };

        /**
         *
         * @param handler
         * @return {RemoteCall}
         */
        this.defineErrorHandler     = function (handler) {

            this.setErrorHandler(handler);

            return this;
        };

        this.getMethod              = function () {
            return this.method;
        };

        this.getOptions             = function () {
            return this.options;
        };

        this.getOption              = function (option) {

            if(typeof this.options[option] === 'undefined') {
                return null;
            }

            return this.options[option];
        };

        this.asCached               = function () {

            this.options[this.CACHE] = true;

            return this;
        };

        this.asLocalCached          = function () {

            this.options[this.LOCAL_CACHE] = true;

            return this;
        };

        /**
         * Starting PHP XDebug session
         * @return {RemoteCall}
         */
        this.asPhpXDebug            = function () {

            this.options[this.XDEBUG] = true;

            return this;
        };

        /**
         * If query is cached
         *
         * @return {boolean}
         */
        this.isCached               = function () {

            return this.getOption(this.CACHE) === true;
        };

        /**
         * If query is local cache
         *
         * @return {boolean}
         */
        this.isCachedLocal          = function () {

            return this.getOption(this.LOCAL_CACHE) === true;
        };

        this.toString               = function () {

            return JSON.stringify({

                "resource":         this.getResource(),
                "parameters":       this.getParameters(),
                "method":           this.getMethod(),
                "options":          this.getOptions()
            });
        };

    }

    /**
     * Option cache
     * @type {string}
     */
    RemoteCall.prototype.CACHE          = 'cache';
    /**
     * Option local cache
     * @type {string}
     */
    RemoteCall.prototype.LOCAL_CACHE    = 'localCache';

    /**
     * Start PHP XDebug option
     * @type {string}
     */
    RemoteCall.prototype.XDEBUG         = 'XDebug';

    return RemoteCall;
});
