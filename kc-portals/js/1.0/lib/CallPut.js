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
    function CallPut(resource, parameters, dataHandler, options) {

        if(typeof options === 'undefined') {
            options                 = {};
        }

        options.method              = 'get';
        parameters['_method']       = 'put';

        RemoteCall.call(this, resource, parameters, dataHandler, options);
    }

    CallPut.prototype               = Object.create(RemoteCall.prototype);
    CallPut.prototype.constructor   = CallPut;

    return CallPut;
});