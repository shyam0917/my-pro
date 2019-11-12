;define(['lib/Page'], function(Page){

    function Page404() {

        Page.call(this);

        this.getClassName           = function () {
            return 'Page404';
        };
    }

    Page404.prototype               = Object.create(Page.prototype);
    Page404.prototype.constructor   = Page404;

    return Page404;
});