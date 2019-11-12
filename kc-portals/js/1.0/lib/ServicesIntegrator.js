;define(['lib/LocalStorage', 'lib/RemoteService', 'lib/CDN', 'lib/RemoteCall'],
    function (LocalStorage, RemoteService, CDN, RemoteCall) {

    /**
     * Integrator service
     *
     * This service combines several services in order to hide the query distribution within themselves
     *
     * @param {{}} config
     * @constructor
     */
    function ServicesIntegrator(config) {

        var CDNDriver               = new CDN(config.CDNJson, config.portalID);
        var APIDriver               = new RemoteService(config.APIUrl);

        RemoteService.call(this, '');
        // mixed class
        LocalStorage.call(this);

        this.query                  = function (query) {

            if(query instanceof RemoteCall === false) {
                throw new TypeError("query is not instanceof RemoteCall ( " + typeof(query) + " )");
            }

            // If local cache detected then return resolved promise
            if(this.detectLocalCache(query)) {

                var promise         = $.Deferred();

                promise.resolve();

                return promise;
            }

            // Separate driver by first element of path
            switch(query.getResource().split('/').shift()) {

                case 'portal':
                case 'course': {
                    return CDNDriver.query(query);
                }
                default: {
                    return APIDriver.query(query);
                }
            }
        };

        /**
         * The method detecting local Cache for query
         * and if data is not exists cached it.
         *
         * @param   {RemoteCall}    query
         * @return  {boolean}
         */
        this.detectLocalCache       = function (query) {

            if(query.isCachedLocal() !== true || this.isSupportLocalStorage() !== true) {

                return false;
            }

            var handler             = query.getDataHandler();

            var data                = this.getLocalStorageItem(this.getStorageKeyFromQuery(query));

            // If data exists call handler and return
            if(data !== null) {

                if(typeof handler === 'function') {
                    handler(data, query, '304 (local cached)');
                }

                return true;
            }

            const self              = this;

            // If not setup cached handler
            query.setDataHandler(function (data, query, textStatus) {

                // save data to local storage
                self.setLocalStorageItem(self.getStorageKeyFromQuery(query), data);
                // restore old handler
                query.setDataHandler(handler);

                // call old handler
                if(typeof handler === 'function') {
                    handler(data, query, textStatus);
                }
            });

            return false;
        };

        /**
         * Generate string key from query
         *
         * @param {RemoteCall} query
         * @return {string}
         */
        this.getStorageKeyFromQuery = function (query) {

            return query.getResource() + '?' + JSON.stringify(query.getParameters());
        };
    }

    ServicesIntegrator.prototype             = Object.create(RemoteService.prototype);
    ServicesIntegrator.prototype.constructor = ServicesIntegrator;

    return ServicesIntegrator;

});