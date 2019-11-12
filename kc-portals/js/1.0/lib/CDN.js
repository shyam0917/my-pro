;define(['lib/RemoteService'], function (RemoteService) {

    function CDN(CDNUrl, portal) {

        var portalName              = portal;

        RemoteService.call(this, CDNUrl);

        /**
         *
         * @param {RemoteCall} query
         */
        this.generateUrl            = function (query) {

            var resource            = query.getResource();
            var path                = resource.split('/');
            var base                = path.shift();

            /**
             * Mask the real CDN structure to achieve an abstraction in the names of resources.
             */
            switch (base) {
                case 'portal': {

                    //base            = 'portals/json' + '/' + portalName + '/' ;
                    base            = 'opencontent/portals/' + portalName + '/';

                    break;
                }
                case 'course': {

                    //base            = 'kc/json/courses/';
                    base            = 'opencontent/portals/' + portalName + '/';

                    // modify path to courseCode_Lang
                    if(path.length === 2) {
                        path        = [path[0] + '_' + path[1]];
                    }

                    break;
                }
            }
            let filePath = this.getBaseUrl() + base + path.join('/') + '.json';
            return filePath;

        };
    }

    CDN.prototype                   = Object.create(RemoteService.prototype);
    CDN.prototype.constructor       = CDN;

    return CDN;

});