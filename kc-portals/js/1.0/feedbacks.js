;define(['jquery','lib/Page', 'lib/CallGet'], function($,Page, CallGet){

    function Feedbacks() {

        Page.call(this);
        let data = {};

        this.getClassName           = function () {
            return 'Feedbacks';
        };

        this.defineContent          = function () {

         


            return $.when(this.getPageMui())
            .then((mui) => {
                 console.log(mui);
                 let data = Object.assign(mui);
                 this.setContentData(data);
                }

            )

        };


    }

    Feedbacks.prototype               = Object.create(Page.prototype);
    Feedbacks.prototype.constructor   = Feedbacks;

    return Feedbacks;
});