;define(['lib/Page', 'lib/CallGet'], function(Page, CallGet){

    function Privacy() {

        Page.call(this);

        this.getClassName           = function () {
            return 'Privacy';
        };

        this.defineContent          = function () {

            return this.getPageMui().done((res) => {

                this.setContentData(res)

            });

        };


    }

    Privacy.prototype               = Object.create(Page.prototype);
    Privacy.prototype.constructor   = Privacy;

    return Privacy;
});