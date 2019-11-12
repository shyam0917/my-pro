;define(['lib/CallPost', 'lib/FormSet'], function(CallPost, FormSet){

    /**
     * Remote call structure
     *
     * @param   {string}            resource
     * @param   {object}            parameters
     * @param   {function}          dataHandler
     * @param   {{}=}               options
     * @constructor
     * @extends CallPost
     */
    function CallPostFile(resource, parameters, dataHandler, options) {

        if(parameters instanceof FormSet){
            parameters = parameters.getFormData();
        }

        if(parameters instanceof FormData === false) {
            throw new Error('Parameters should be an FormData');
        }

        options = options || {};

        options[this.PROCESS_DATA]  = false;
        options[this.CONTENT_TYPE]  = false;

        CallPost.call(this, resource, parameters, dataHandler, options);

    }

    CallPostFile.prototype              = Object.create(CallPost['prototype']);
    CallPostFile.prototype.constructor  = CallPostFile;

    return CallPostFile;
});