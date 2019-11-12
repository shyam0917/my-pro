;define(['jquery', 'lib/CallPost', 'lib/CallPostFile', 'lib/FormSet'], function($, CallPost, CallPostFile, FormSet){

    function SendForm() {

        this.defineSelector     = function () {

            throw new Error('Method defineSelector is not defined in the child class');
        };

        this.defineEmailType    = function () {

            throw new Error('Method defineEmailType is not defined in the child class');
        };

        this.remoteCall         = function () {

            throw new Error('Method remoteCall is not defined in the child class');
        };

        this.getMainData        = function () {

            throw new Error('Method getMainData is not defined in the child class');
        };
        this.defineSuccessMsg   = function () {

            return this.getMessageByCode(this.SUCCESS);
        };
        this.onSend     = function () {
            console.log('Do something after Send');
        };


        this.setHandlers        = function () {


            $(this.defineSelector() + ' *:required').on('invalid', function (event) {

                var errorMessage    = $(this).attr('data-invalidMessage');
                var wrongType       = $(this).attr('data-invalidMessageWrongType');

                if (typeof errorMessage !== 'undefined') {
                    if (event.target.validity.valueMissing) {
                        event.target.setCustomValidity('');
                        event.target.setCustomValidity(errorMessage);
                    } else if (event.target.validity.typeMismatch && $(this).attr('type') == 'email') {
                        event.target.setCustomValidity('');
                        event.target.setCustomValidity(wrongType);
                    } else {
                        event.target.setCustomValidity('');
                    }
                }
            });


        };

        this.defineFormData     = function (form) {

            var formData        = {};

            // get all form data
            $(form).find('input,textarea,select').each(function () {
                if($(this).prop('type') == 'radio' && !$(this).prop('checked')){
                    return true;
                }
                formData[$(this).prop('name')] = $(this).val();
            });

            return formData;
        };

        this.onSubmitForm       = function (form, event) {

            event.preventDefault();

            this.lockForm(form);

            var formData        = this.defineFormData(form);

            formData['landing_page'] = window.location.href;

            // API parameters
            var params          = {
                'type':         this.defineEmailType(),
                'content':      formData
            };


            const self          = this;

            this.showProgressOverlay();

            this.remoteCall(new CallPost('message/email', params, function (response) {

                let closeOnSend = $(form).data('close'),
                    timeout     = closeOnSend ? 1000 : 5000;

                self.showAlert(self.defineSuccessMsg(), false, timeout).then(function () {

                    self.unlockForm(form);

                    $(form).find("input[type!='submit'],textarea").val('');

                    // Search for the first option with an empty value inside a select (if exists)
                    // and assign that option as default
                    $(form).find('select').each(function () {
                      $(this).val(null).trigger("change");
                    });

                    // fix for IE
                    if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/)) || (typeof $.browser !== "undefined" && $.browser.msie == 1)) {
                        $(form).find("input[type!='hidden'],textarea").val('');
                        $(form)[0].reset();
                        if($('#partnership').hasClass('form')) {
                            $('.form').addClass('submitted');
                            $(form).find("input,textarea").val('');
                        }
                    }

                    if (closeOnSend) {
                        self.closeModal()
                    }

                    self.onSend(formData);
                });

            }).defineErrorHandler(function (query, status, errorThrown) {

                console.error('Error send email: ' + status + ', error: ' + errorThrown);
                self.showAlert(self.getMessageByCode(self.ERROR), true).then(function () {
                    self.unlockForm(form);
                });

            })).always(function () {
                self.hideProgressOverlay();
            });
        };

        this.onSendFormWithFiles     = function (form, event) {

            event.preventDefault();

            this.lockForm(form);

            var formData        = this.defineFormData(form);

            var that            = this;

            this.showProgressOverlay();

            var params = new FormSet(form);

            //include form files

            $('input[type=file]').each(function () {
                params.attachFile(this);
            });

            //form data
            params.append('content', formData);
            params.append('type' ,this.defineEmailType() );

            this.remoteCall(new CallPostFile('message/email', params, function (response) {

                let closeOnSend = $(form).data('close'),
                    timeout = closeOnSend ? 1000 : 5000;


                that.showAlert(that.getMessageByCode(that.SUCCESS), false, timeout).then(function () {

                    that.unlockForm(form);

                    $(form).find("input[type!='submit'],textarea").val('');

                    if (closeOnSend) {
                        that.closeModal()
                    }
                });

            }).defineErrorHandler(function (query, status, errorThrown) {

                console.error('Error send email: ' + status + ', error: ' + errorThrown);
                that.showAlert(that.getMessageByCode(that.ERROR), true).then(function () {
                    that.unlockForm(form);
                });

            })).always(function () {
                that.hideProgressOverlay();
            });
        };

        this.lockForm               = function (form) {

            let mui             = this.getMainData().mui;

            // disable all inputs
            $(form).find('input,textarea,select').each(function () {
                $(this).prop('disabled', true);
            });

            $(form).find('button[type="submit"]').each(function () {
                $(this).prop('disabled', true);
                $(this).attr('rel', $(this).html());
                $(this).html(mui.buttonLabel.wait);
            });

            $(form).find('input[type="submit"]').each(function () {
                $(this).prop('disabled', true);
                $(this).attr('rel', $(this).attr('value'));
                $(this).attr('value',mui.buttonLabel.wait);
            });

        };

        this.unlockForm             = function (form) {

            let mui             = this.getMainData().mui;

            // enable all inputs
            $(form).find('input,textarea,select').each(function () {
                $(this).prop('disabled', false);
            });

            $(form).find('button[type="submit"]').each(function () {
                $(this).prop('disabled', false);
                $(this).html( $(this).attr('rel'));
            });

            $(form).find('input[type="submit"]').each(function () {
                $(this).prop('disabled', false);
                $(this).attr('value',$(this).attr('rel'));
            });

        };

        this.showProgressOverlay    = function () {

            $(this.defineSelector()).find(".progressOverlay").removeClass('hidden');
        };

        this.hideProgressOverlay    = function () {

            $(this.defineSelector()).find(".progressOverlay").addClass('hidden');
        };

        /**
         *
         * @param   {String}        message
         * @param   {boolean=}      isError
         * @param   {number}        timeout
         */
        this.showAlert              = function (message, isError, timeout) {

            var promise             = $.Deferred();

            // normalize parameter to boolean
            isError                 = typeof isError === 'boolean' ? isError: false;

            var formMessage         = $('#formMessage');

            if(isError) {
                formMessage.removeClass('alert-success').addClass('alert-danger');
            } else {
                formMessage.removeClass('alert-danger').addClass('alert-success');
            }

            formMessage.text(message);

            formMessage.removeClass('hidden').hide().fadeIn(400, function () {

                if(isError === false) {
                    setTimeout(function () {formMessage.fadeOut(); promise.resolve();}, timeout);
                } else {
                    promise.resolve();
                }
            });

            return promise;
        };

        /**
         * Returns message by code from user class
         *
         *
         * @param   {int}           code
         * @return  {string}
         */
        this.getMessageByCode       = function (code) {

            const defaultError      = 'Server error';

            // mui:messages-contactus-success
            var strings             = this.getMainData().mui;

            if(     typeof strings['messages'] === 'undefined'
                ||  typeof strings['messages']['contactus'] === 'undefined') {
                return defaultError;
            }

            strings                 = strings['messages']['contactus'];

            switch(code) {

                case this.SUCCESS:                          return strings['success'];
                case this.ERROR:                            return defaultError;

                default:                                    return defaultError;
            }
        };

        this.SUCCESS                = 200;
        this.ERROR                  = 500;
    }

    return SendForm;
});
