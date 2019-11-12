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
    function CallPost(resource, parameters, dataHandler, options) {

        if(typeof options === 'undefined') {
            options                 = {};
        }

        options.method              = 'post';

        RemoteCall.call(this, resource, parameters, dataHandler, options);
    }

    CallPost.prototype              = Object.create(RemoteCall.prototype);
    CallPost.prototype.constructor  = CallPost;

    return CallPost;
});