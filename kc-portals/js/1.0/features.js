;define(['lib/Page', 'lib/CallGet'], function(Page, CallGet){

    function Features() {

        Page.call(this);

        this.getClassName           = function () {
            return 'Features';
        };

        this.defineContent          = function () {

            return this.getPageMui().done((res) => {

                this.setContentData(res)

            });
        };
    }

    Features.prototype               = Object.create(Page.prototype);
    Features.prototype.constructor   = Features;

    return Features;
});