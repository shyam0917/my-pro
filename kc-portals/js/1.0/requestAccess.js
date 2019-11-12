;define(['jquery', 'lib/FormPage', 'lib/CallPost', 'lib/CallGet', 'lib/CallPut', 'lib/FormGenerator', 'jquery.mask'],
    function($, FormPage, CallPost, CallGet, CallPut, FormGenerator) {

    function RequestAccess() {

        FormPage.call(this);

        this.getClassName           = function () {
            return 'RequestAccess';
        };

        let data                    = {};
        let formGenerator           = new FormGenerator('request_access', this);
        let results                 = null;

        let _init                   = this.init;
        this.init                   = function () {

            const that              = this;

            this.defineDataPromise.done(function () {
                that.buildForm(results);
            });

            return _init.apply(this);
        };

        this.defineContent          = function () {

            const that              = this;

            this.outContentPromise.done(function () {
                that.setHandlers();

                // apply data mask options
                $('[data-mask]').each(function () {
                   $(this).mask($(this).attr('data-mask'));
                });
            });

            let promise             = $.Deferred();

            $.when(this.getAdditionalSpecification()).done(function (additional) {

                results             = additional;

                promise.resolve();
            }).fail(function () {
                promise.reject();
            });

            return promise;
        };

        /**
         * Get specification for additional properties
         * @return {promise}
         */
        this.getAdditionalSpecification = function () {

            let url                 = 'portals/0' + this.getPortalId()
                                    + '/forms/0request_access/';

            let promise             = $.Deferred();
            let data                = {
                'is_static':        1,
                '_extend':          'mui',
                'lang':             this.getLanguage(),
                'token':            this.user.getSessionId()
            };

            this.remoteCall(new CallGet(url, data, function(res) {
                promise.resolve(res.response);
            }));

            return promise.promise();
        };

        this.buildForm          = function (additional) {

            // additional
            if(typeof additional === 'object') {
                let result          = [];

                for(let key in additional) {
                    if(!additional.hasOwnProperty(key)) {
                        continue;
                    }

                    let block       = additional[key];
                    block['value']  = '';

                    // required="required"
                    if(block['is_required']) {
                        block['required'] = 'required="required"';
                    } else {
                        block['required'] = '';
                    }

                    result.push(block);
                }

                // html generate
                formGenerator.generate(result);

                data['additional'] = result;
            }

            this.setContentData(data);
        };

        this.onSubmitForm       = function (form, event) {

            event.preventDefault();

            this.lockForm(form);

            let data            = this.defineFormData(form);

            if(isEmpty(data['lang'])) {
                data.lang       = this.getLanguage();
            }

            /*
            if(data['confirm_email'] !== data['email']) {
                this.showAlert(this.getMainData().mui.pageContent.requestAccess.checkEmail);
                return false;
            }
            */

            this.remoteCall(new CallPost('portals/'+ this.getPortalId() +'/access_requests/', data))
                .done( () => {
                    $('#formMessages').removeClass('is_hidden');
                    $('#requestAccess').addClass('is_hidden');
                })
                .fail( (res) => {

                    let message     = res.responseJSON.response.message;
                    let mui         = this.getMainData().mui.error;

                    if(message.substr(0, 4) === 'mui.') {

                        message     = message.substr(4);

                        if(typeof mui[message]) {
                            message = mui[message];
                        }
                    } else {
                        message     = res.responseJSON.response.message;
                    }

                    this.showAlert(message, true);
                })
                .always(() => {
                   this.unlockForm(form)
                });
        };

        this.getPageMui = () => {

            const pageName = this.getClassName();

            let prom = $.Deferred();

            this.remoteCall(new CallGet('mui/0' + this.getPortalName() + '/0' + this.getLanguage() + '/',
                {
                    'code':     'all',
                    'nested':   true,
                    'groups':   `Pages-${pageName},Pages-requiredLogin`,
                    '_': this.config.LocalStorageStamp
                }, (res) => {

                    if(typeof res.response !== 'undefined' && typeof res.response[pageName] !== 'undefined') {
                        prom.resolve(res.response[pageName]);
                    } else {
                        prom.resolve(res.response);
                    }
                }
            ).asCached().asLocalCached());

            return prom;
        };

        this.defineSelector     = function () {

            return '#requestAccess';
        };

        this.defineEmailType    = function () {

            return 'portals/' + this.getPortalName()   + '/request_access';
        };
    }

    RequestAccess.prototype                 = Object.create(FormPage.prototype);
    RequestAccess.prototype.constructor     = RequestAccess;

    return RequestAccess;
});