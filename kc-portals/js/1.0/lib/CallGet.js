;define(['lib/RemoteCall'], function(RemoteCall){

    /**
     * Remote call structure
     *
     * @param   {string}            resource
     * @param   {object}            parameters
     * @param   {function}          dataHandler
     * @param   {{}=}               options
     * @constructor
     */
    function CallGet(resource, parameters, dataHandler, options) {

        if(typeof options === 'undefined') {
            options                 = {};
        }

        options.method              = 'get';

        RemoteCall.call(this, resource, parameters, dataHandler, options);
    }

    CallGet.prototype               = Object.create(RemoteCall.prototype);
    CallGet.prototype.constructor   = CallGet;

    return CallGet;
});
