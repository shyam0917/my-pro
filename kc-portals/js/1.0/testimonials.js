;define(['lib/Page', 'lib/CallGet'], function(Page, CallGet){

    function Testimonials() {

        Page.call(this);

        this.getClassName           = function () {
            return 'Testimonials';
        };

        this.defineContent          = function () {

            return this.getPageMui().done((res) => {

                this.setContentData(res)

            });
        };
    }

    Testimonials.prototype               = Object.create(Page.prototype);
    Testimonials.prototype.constructor   = Testimonials;

    return Testimonials;
});