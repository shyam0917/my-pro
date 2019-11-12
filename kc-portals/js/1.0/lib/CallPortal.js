;define(['lib/CallGet'], function(CallGet){

    /**
     * Remote call structure
     *
     * @param   {string}            resource
     * @param   {object}            parameters
     * @param   {function}          dataHandler
     * @param   {{}=}               options
     * @constructor
     */
    function CallPortal(resource, parameters, dataHandler, options) {
        CallGet.call(this, 'portal/' + resource, parameters, dataHandler, options);

    }

    CallPortal.prototype               = Object.create(CallGet.prototype);
    CallPortal.prototype.constructor   = CallGet;

    return CallPortal;
});