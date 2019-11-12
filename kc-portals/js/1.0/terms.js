;define(['lib/Page', 'lib/CallGet'], function(Page, CallGet){

    function Terms() {

        Page.call(this);

        this.getClassName           = function () {
            return 'Terms';
        };

        this.defineContent          = function () {

            return this.getPageMui().done((res) => {

                this.setContentData(res)

            });

        };
    }

    Terms.prototype               = Object.create(Page.prototype);
    Terms.prototype.constructor   = Terms;

    return Terms;
});