;define(['jquery', 'lib/Page', 'lib/CallGet'], function($, Page, CallGet){

    function AutoLogin() {

        Page.call(this);

        this.getClassName           = function () {
            return 'AutoLogin';
        };

        this.loadMainTemplate       = function () {

            var promise             = $.Deferred();

            promise.resolve('');

            return promise;
        };

        this.loadContentTemplate    = function () {

            var promise             = $.Deferred();

            promise.resolve('');

            return promise;
        };

        this.renderMain             = function () {

            return false;
        };

        this.defineContent          = () => {

            var parts               = this.appLocation.urlParts;

            this.user.authByHash(parts.id, parts.hash).done(() => {

               this.updateUserView();

            }).fail((errorCode) => {

                localStorage.failAlertReason = 'autoLoginFail';
                this.redirectHome();

            }).always(() => {

            });

        };

        /**
         * Rewrite parent method for non standard url
         * @param name
         * @return {*}
         */
        this.getUrlParameter        = function (name) {

            let sPageURL            = window.location.hash.substring(1);

            sPageURL                = sPageURL.split('/');

            let index = 0,
                hasLang = sPageURL[0].match(/l-.+/);

            if (hasLang) index++;


            if(typeof sPageURL[1] === 'undefined' || sPageURL[index] !== 'autoLogin') {
                return null;
            }

            if(name === 'hash' && typeof sPageURL[index + 1] !== 'undefined') {
                return sPageURL[index + 1];
            } else if(name === 'id' && typeof sPageURL[index + 2] !== 'undefined') {
                return sPageURL[index + 2];
            } else {
                return null
            }
        };
    }

    AutoLogin.prototype               = Object.create(Page.prototype);
    AutoLogin.prototype.constructor   = AutoLogin;

    return AutoLogin;
});