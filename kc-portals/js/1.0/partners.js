;define(['jquery', 'lib/FormPage'], function($, FormPage){

    function Partners() {

        FormPage.call(this);

        this.getClassName  =  () => {
            return 'Partners';
        };

        this.defineContent = () => {

            this.outContentPromise.done(() => {
                this.setHandlers();
            });

            return this.getPageMui().done((res) => {

                this.setContentData(res);

            });

        };

        this.onApplication = (node, event) => {

            event.preventDefault();

            const
                btn = $(node),
                target = $(node).attr('href');

            $(target).slideDown();
            $('html, body').animate({
                scrollTop: $(target).offset().top - $('#header').height()
            }, 500);
            btn.hide();
        };

        this.defineSelector     = function () {

            return '#partnership';
        };

        this.defineEmailType    = function () {

            return 'portals/' + this.getPortalName() + '/partnership';
        };
    }

    Partners.prototype               = Object.create(FormPage.prototype);
    Partners.prototype.constructor   = Partners;

    return Partners;
});