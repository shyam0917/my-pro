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
    function CallDelete(resource, parameters, dataHandler, options) {

        if(typeof options === 'undefined') {
            options                 = {};
        }

        options.method              = 'get';
        parameters['_method']       = 'delete';

        RemoteCall.call(this, resource, parameters, dataHandler, options);
    }

    CallDelete.prototype               = Object.create(RemoteCall.prototype);
    CallDelete.prototype.constructor   = CallDelete;

    return CallDelete;
});