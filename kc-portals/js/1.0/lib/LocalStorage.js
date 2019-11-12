;define(function () {

    function LocalStorage() {

        /**
         * Is Support Local Storage
         *
         * @return {boolean}
         */
        this.isSupportLocalStorage  = function () {

            try {
                return 'localStorage' in window && window['localStorage'] !== null;
            } catch (e) {
                return false;
            }
        };

        this.getLocalStorageItem    = function (key) {

            if(this.isSupportLocalStorage() === false) {
                return null;
            }

            try {
                return JSON.parse(window.localStorage.getItem(key));
            } catch (e) {
                return null;
            }
        };

        this.setLocalStorageItem    = function (key, data) {

            if(this.isSupportLocalStorage() === false) {
                return null;
            }

            try {
                return window.localStorage.setItem(key, JSON.stringify(data));
            } catch (e) {
                return null;
            }
        };

        /**
         * Clear all records
         * @return {LocalStorage}
         */
        this.clear                  = function () {

            if(this.isSupportLocalStorage() === false) {
                return this;
            }

            try {
                return window.localStorage.clear();
            } catch (e) {
                return this;
            }
        };
    }

    return LocalStorage;
});