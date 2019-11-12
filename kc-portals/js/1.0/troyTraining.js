;define(['jquery', 'lib/Page', 'lib/CallGet'], function($, Page, CallGet){

    function troyTraining() {

        Page.call(this);

        this.getClassName           = function () {
            return 'troyTraining';
        };

        this.defineContent          = function () {

            this.assignPageHandlers();

            return this.getPageMui().done((res) => {

                this.setContentData(res)

            });

        };

    }

    troyTraining.prototype               = Object.create(Page.prototype);
    troyTraining.prototype.constructor   = troyTraining;

    return troyTraining;
});
