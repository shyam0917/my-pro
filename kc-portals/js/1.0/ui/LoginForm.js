;define(['jquery', 'ui/ModalWindow', 'lib/CallGet', 'lib/FormGenerator', 'jquery.mask'], function ($, ModalWindow, CallGet, FormGenerator) {

    /**
     *
     * @param {Page} page
     * @param {{}=} node
     * @constructor
     */
    function LoginForm(page, node) {

        var closeSelector           = '.modal_close';

        this.modalWindow            = null;

        /**
         * Selector for this node
         *
         * @return {String}
         */
        this.defineSelector         = function () {

            var selector            = $(node).attr('href');

            if(typeof selector === 'undefined' || selector.substring(0, 1) !== '#') {
                selector            = '#loginPopUp';
            }

            return selector;
        };

        this.getLoginFormSpec       = function () {
            if(!page.user.getAccountId()) return true;

            let url                 = 'accounts/' + page.user.getAccountId()
                                    + '/forms/0first_login';

            let promise             = $.Deferred();
            let data                = {
                '_extend':          'mui',
                'lang':             page.getLanguage(),
                'token':            page.user.getSessionId()
            };

            page.remoteCall(new CallGet(url, data, function(res) {
                promise.resolve(res.response);
            }).defineErrorHandler(function () {
                promise.resolve({});
            }));

            return promise.promise();
        };

        /**
         *
         * @return {Promise}
         */
        this.show                   = function (options) {

            $('#employeeloginform, #activedirloginform').addClass('hidden');

            var form                = $(this.defineSelector());

            if(form.length > 0 && form.attr('id') !== 'loginPopUp') {

                return this.showModal();
            }

            const that              = this;

            var accountConfig;
            if(page.user.isAuth()) {
                accountConfig       = page.getAccountConfig(page.user.getAccountId(), page.user);
            }else{
                accountConfig       = $.when({});
            }

            return $.when(page.loadTemplate('ui/loginForm'), accountConfig, this.getLoginFormSpec(), page.user.getProfile())
                    .done(function (template, accountConfig, formSpec, student) {

                        let data    = $.extend({}, page.getMainData(),
                                        {accountConfig: accountConfig},
                                        {'additional': that.handleFormSpec(formSpec, student)});
                                      $.extend(options, {
                                          'isNotChangeUsername':    accountConfig['isNotChangeUsername'],
                                          'isNotChangeStudentName': accountConfig['isNotChangeStudentName']
                                      });
                        page.renderTo(template[0], data, page.APPEND_TO_BODY);
                        page.assignPageHandlers(that.defineSelector(), that, true);
                        that.setHandlers();
                        // apply data mask options
                        $('#firstloginform [data-mask]').each(function () {
                            $(this).mask($(this).attr('data-mask'));
                        });
                        that.showModal(options);
                    });
        };

        this.handleFormSpec         = function (additional, student) {

            if(typeof additional !== 'object' || isEmpty(student)) {
                return [];
            }

            if(isNotEmpty(student['student'])) {
                student             = student['student'];
            }

            let result          = [];

            for(let key in additional) {

                if(!additional.hasOwnProperty(key)) {
                    continue;
                }

                let block       = additional[key];

                block['value']  = '';

                let specialProperties = ['password', 'gender', 'lang'];

                // special key for property type
                if(specialProperties.indexOf(key) !== -1) {
                    block['property_' + key] = true;
                } else {
                    block['property_default'] = true;
                }


                if(!block['edit_in_lms']) {
                    block['readonly'] = 'readonly="readonly"';
                }

                if(block['is_required'] && block['edit_in_lms']) {
                    block['required'] = 'required="required"';
                }

                if(typeof student[block['name']] !== 'undefined') {
                    block['value'] = student[block['name']];
                } else if(typeof student['extra'] === 'object'
                    && typeof student['extra'][block['name']] !== 'undefined') {
                    block['value'] = student['extra'][block['name']];
                }

                result.push(block);
            }

            let formGenerator       = new FormGenerator('login_form', page, 'flex-form__input');

            formGenerator.generate(result);

            return result;
        };

        this.showModal              = function (options) {
            if(typeof options !== 'object')
                options = {};

            const self              = this;

            //if Active Directory or Library login should show by default...  (this clearly needs to be refactored)
            if(page.config['login'] && (page.config.login['ssoid'] || page.config.login['authid']) ){
                $('#loginform').addClass('hidden'); //hide all options (username/password, SSN/employee id etc) see hideFirstLoginForm
            }


            this.modalWindow = new ModalWindow({
                    modalID: this.defineSelector(),
                    top: 100,
                    overlay: 0.4,
                    closeButton: closeSelector,
                    //closeButton:    page.user.isFirstLogin() ? null : closeSelector,
                    // block modal window

                    isBlocking: page.user.isFirstLogin() || options.isForcedFirst || options.isBlocking,
                    onBeforeOpen: function () {

                        var strings = page.getMainData().mui;

                        var muiTitle = strings.pageContent.loginFormTitle;

                        if (page.user.isFirstLogin() || options.isForcedFirst) {

                            muiTitle = strings.pageContent.firstLoginFormTitle;

                            self.showFirstLoginForm(muiTitle, options);

                            //page.user.logout();

                        } else {
                            //hide first login but also show the regular login
                            self.hideFirstLoginForm(muiTitle);
                            //autocomplete and hide fields
                            if(page.config['login'] && page.config.login['authid']) {
                                var frm = $(self.defineSelector() + " form:not(.hidden)");
                                if(page.config.login['authlu']) {
                                    try{frm.find('[name="username"]').val(page.config.login['authlu']).hide()}catch(e){}
                                }

                                if(page.config.login['authlp']) {
                                    try{frm.find('[name="password"]').val(page.config.login['authlp']).hide()}catch(e){}
                                }

                                if(page.config.login['authfw']) {
                                    try{frm.find('[name="username"]').remove()}catch(e){}
                                    try{frm.find('[name="password"]').remove()}catch(e){}
                                    try{frm.find('[name="submit"]').remove()}catch(e){}
                                    try{frm.find('.forwardtologin').removeClass('hidden')}catch(e){}
                                }
                            }
                        }
                    },
                    onBeforeClose: function () {

                        if(options.redirectHomeOnClose) {
                            document.location.href="/";
                        }

                    }

                });
            return   this.modalWindow.show().always(function(){
                    $("#loginPopUp form input:visible").eq(0).focus();
                });

        };

        /**
         * The method setup additional input handlers
         */
        this.setHandlers            = function () {

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

        this.onSubmitLoginForm      = function (form, event) {
            event.preventDefault();

            this.lockForm(form);
            $('#loginFormMessage, #loginPopUp #loginFormMessage').hide();
            var params = {};

            //handle active directory (sso) if present
            if($(form).data('option')=="ActiveDirectory"){
                var ssoid = (page.config.login||{}).ssoid;
                if(ssoid){
                    //for AD, we have to redirect, we cannot negotiate the creds in the background
                    window.location = page.config.APIUrl + //  https://api.knowledgecity.com/v2/
                                      "auth/saml/"+ ssoid + "/login" +
                                      "?RelayState=" + encodeURIComponent(location.origin +"/#l-en/autoLogin/");
                }else{
                    //sso id could not be found
                    $('#unknown-company').removeClass('hidden');
                }
                return;
            }

            //handle sip2 auth (for libraries) if present
            if($(form).data('option')=="LibraryIdPin"){
                var authid = (page.config.login||{}).authid;
                if(authid){
                    if(page.config.login['authfw'])
                    {
                        //will do external login on library page with api such as oauth
                        window.location = page.config.APIUrl + // https://api.knowledgecity.com/v2/
                                      "auth/"+ authid + "/login" +
                                      "?RelayState=" + encodeURIComponent(location.origin +"/#l-en/autoLogin/");
                        return;
                    } else {
                        //add params relevant to this type of auth. will do background api request to log in
                        params.authid = authid;
                    }
                }else{
                    //sip2 id could not be found
                    $('#unknown-company').removeClass('hidden');
                    return;
                }

            }

            let login               = $(form).find('#loginform-username'),
                password            = $(form).find('#loginform-password');


            if(typeof login === 'undefined' || typeof password === 'undefined') {
                throw new Error('login or password undefined');
            }

            this.showProgressOverlay();

            let type = $(form).data('type') || 'username';

            page.user.auth(login.val(), password.val(), type, params).done(() => {

                this.showAlert(this.getMessageByCode(page.user.AUTH_SUCCESS)).then(() => {

                    this.hide();
                    this.unlockForm(form);

                    login.val('');

                    //usually clear except when from parameter (if cleared and hidden, validation bug occurs)
                    try {
                        if(page.config.login['authlu']) {
                            login.val(page.config.login['authlu']).hide();
                        } else {
                            login.removeClass('hidden');
                        }
                    }catch(e) {
                    }

                    page.updateUserView();

                });

            }).fail((code, res) => {

                // lib/User.js changes the code variable to Redirect if response.redirect is not empty
                if(code !== "Redirect"){
                    this.showAlert(this.getMessageByCode(code, res), true);
                    this.unlockForm(form);
                }

            }).always(() => {

                 password.val('');

                //usually clear except when from parameter (if cleared and hidden, validation bug occurs)
                try {
                    if(page.config.login['authlp']) {
                        password.val(page.config.login['authlp']).hide();
                    } else {
                        password.removeClass('hidden');
                    }
                }catch(e) {
                }

                this.hideProgressOverlay();
            });

        };

        this.defineFormData     = function (form) {

            var formData        = {};

            // get all form data
            $(form).find('input,textarea').each(function () {
                formData[$(this).prop('name')] = $(this).val();
            });

            return formData;
        };

        this.onSubmitFirstLoginForm = function (form, event) {

            event.preventDefault();

            this.lockForm(form);

            this.showProgressOverlay();

            var formData            = this.defineFormData(form);

            // add x-src
            formData['x-src']       = 'stargate-first-login-form';

            const self              = this;

            page.user.updateProfile(formData)
            .done(function () {

                self.showAlert(self.getMessageByCode(page.user.ACCOUNT_CHANGE_SUCCESS)).then(function () {

                    self.unlockForm(form);
                    self.modalWindow.close();

                    // update all browser window and reload this page

                    //page.invalidateMain();
                    //page.reload();

                    page.updateUserView();

                });
            })
            .fail(function (errorCode, res) {

                self.showAlert(self.getMessageByCode(errorCode, res), true).then(function () {

                    self.unlockForm(form);
                });
            })
            .always(function () {

                self.hideProgressOverlay();
            });
        };

        /**
         * Hide form
         */
        this.hide                   = function () {

            $(closeSelector).trigger('click');
        };

        this.lockForm               = function (form) {

            // enable all inputs
            $(form).find('input').each(function () {
                $(this).prop('disabled', true);
            });
        };

        this.unlockForm             = function (form) {

            // enable all inputs
            $(form).find('input').each(function () {
                $(this).prop('disabled', false);
            });
        };

        this.showProgressOverlay    = function () {

            $(this.defineSelector()).find(".progressOverlay").removeClass('hidden');
        };

        this.hideProgressOverlay    = function () {

            $(this.defineSelector()).find(".progressOverlay").addClass('hidden');
        };

        //these next 2 methods need to be refactored.  We just need to render with differnt options, not jquery toggle
        this.showFirstLoginForm     = function (muiTitle, options) {

            $(this.defineSelector()).find('#loginform').addClass('hidden');
            $(this.defineSelector()).find('#libraryloginform').addClass('hidden');
            $(this.defineSelector()).find('#activedirloginform').addClass('hidden');
            $(this.defineSelector()).find('#employeeloginform').addClass('hidden');
            $(this.defineSelector()).find('#recoverform').addClass('hidden');

            $(this.defineSelector()).find('#loginFormClose').removeClass('hidden');
            // $(this.defineSelector()).find('.modal_close').addClass('hidden');
             $(this.defineSelector()).find('.modal_close').unbind('click').bind('click', function () {
                $("#logoffLink").trigger('click');
             });
            $(this.defineSelector()).find('#firstloginform').removeClass('hidden');

            $(this.defineSelector()).find('#loginTitle .h1').text(muiTitle);

            /*
            $(this.defineSelector() + ' [name=email]').val(page.user.getEmail());
            $(this.defineSelector() + ' [name=username]').val(page.user.getLogin());
            $(this.defineSelector() + ' [name=first_name]').val(page.user.getFirstName());
            $(this.defineSelector() + ' [name=last_name]').val(page.user.getLastName());
            */

            if(options['isNotChangeUsername']) {
                $(this.defineSelector() + ' [name=username]').prop('readonly', true);
            }

            if(options['isNotChangeStudentName']) {
                $(this.defineSelector() + ' [name=first_name]').prop('readonly', true);
                $(this.defineSelector() + ' [name=last_name]').prop('readonly', true);
            }
        };

        this.hideFirstLoginForm     = function (muiTitle) {

            $(this.defineSelector()).find('#loginFormMessage').addClass('hidden');
            $(this.defineSelector()).find('#loginTitle .h1').text(muiTitle);
            $(this.defineSelector()).find('.modal_close').removeClass('hidden');
            $(this.defineSelector()).find('#loginFormClose').removeClass('hidden');
            $(this.defineSelector()).find('#firstloginform').addClass('hidden');
            $(this.defineSelector()).find('#recoverform').addClass('hidden');

            //different authentication methods. hide all then show one
            $(this.defineSelector()).find('#employeeloginform').addClass('hidden');
            // $(this.defineSelector()).find('#loginform').addClass('hidden');
            $(this.defineSelector()).find('#activedirloginform').addClass('hidden');

            // Choose login method to show, by priority:
            // 1. if default specified, use that
            // 2. if no config default, go with user/pass
            if((page.config.login||{}).default != 'undefined')
                $(this.defineSelector()).find('form[data-option="'+page.config.login.default+'"]').removeClass('hidden');
            else
                $(this.defineSelector()).find('form[data-option="UsernamePassword"]').removeClass('hidden');


            // if multiple options, show any links to switch
            if(page.config.login.options.length > 1) {
                $(this.defineSelector()).find('.loginoptions a').removeClass('hidden');
            } else {
                $(this.defineSelector()).find('#activedirloginform').addClass('hidden');

                //usually everybody has at least the regular login form + 0 or more other options, but for libraries, it's the only option
                if((page.config.login||{}).default == 'LibraryIdPin')
                    $(this.defineSelector()).find('#libraryloginform').removeClass('hidden');
                else
                    $(this.defineSelector()).find('#loginform').removeClass('hidden');
            }

        };

        /**
         *
         * @param   {String}        message
         * @param   {boolean=}      isError
         */
        this.showAlert              = function (message, isError, timer) {
            timer = timer || 500;
            var promise             = $.Deferred();

            // normalize parameter to boolean
            isError                 = typeof isError === 'boolean' ? isError: false;

            var formMessage         = $('#loginFormMessage, #loginPopUp #loginFormMessage');

            if(isError) {
                formMessage.removeClass('alert-success').addClass('alert-danger');
            } else {
                formMessage.removeClass('alert-danger').addClass('alert-success');
            }

            formMessage.text(message);

            formMessage.removeClass('hidden').hide().fadeIn(400, function () {

                if(isError === false) {
                    setTimeout(function () {formMessage.fadeOut(); promise.resolve();}, timer);
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

        this.getMessageByCode       = (code, res = {}, login = '') => {


            const defaultError      = 'Login failed';
            let strings             = page.getMainData().mui;

            if(     typeof strings['loginForm'] === 'undefined'
                ||  typeof strings['loginForm']['errorMessage'] === 'undefined'
                ||  typeof strings['loginForm']['successMessage'] === 'undefined') {
                return defaultError;
            }

            strings                 = $.extend(
                strings['loginForm']['errorMessage'],
                strings['loginForm']['successMessage']
            );

            // for error like mui.*
            if(typeof res.message !== 'undefined' && res.message.substr(0, 4) === 'mui.') {

                strings             = page.getMainData().mui.error;

                res.message         = res.message.substr(4);

                if(typeof strings[res.message]) {
                    return strings[res.message];
                }
            }

            switch(res.message) {

                case 'USERTYPE_IS_REQUIRED':    return strings['wrongUsername'];
                case 'USER_DISABLED':           return strings['userDisabled'];
                case 'PASSWORD_MIN_LENGTH':     return strings['passwordMinLength'].replace('{X}', res.min_length);
                case 'PASSWORD_ALREADY_EXISTS': return strings['passwordAlreadyExists'];
                case 'ACCESS_SCHEDULE':         return strings['accessScheduleError'];
            }

            switch(code) {

                // success

                case 'RECOVER_MAIL_SENT':                   return strings['recoverMailSent'];
                case 'RECOVER_USER_MAIL_SENT':              return strings['recoverUsernameMailSent'];
                case page.user.AUTH_SUCCESS:                return strings['authSuccess'];
                case page.user.ACCOUNT_CHANGE_SUCCESS:      return strings['accountChangeSuccess'];

                // errors
                case 'E_NOT_FOUND':                         return strings['userNotFound'].replace("{{username}}", login);
                case page.user.E_WRONG_USERNAME:            return strings['wrongUsername'];
                case page.user.E_PASSWORDS_DONT_MATCH:      return strings['passwordsDontMatch'];
                case page.user.E_INVALID_EMAIL:             return strings['invalidEmail'];
                case page.user.E_DUPLICATE_USERNAME:        return strings['duplicateUsername'];

            }

             return defaultError;
        };

        this.onSwitchType = function (node, event) {

            event.preventDefault();

            $('#loginform, #loginPopUp #loginform').toggleClass('hidden');
            $('#employeeloginform, #activedirloginform').toggleClass('hidden');//template should not have both

        };

        this.onForgotPass   =   (node, event) => {
            event.preventDefault();
            $('#loginform').addClass('hidden');
            $('#recoveruserform').addClass('hidden');
            $('#recoverform').toggleClass('hidden');
            $('#employeeloginform').addClass('hidden');
            $(this.defineSelector()).find('#loginTitle .h1').text(page.getMainData().mui.pageContent.recoverFormTitle);
        };

        this.onForgotUser   =   (node, event) => {
            event.preventDefault();
            $('#loginform').addClass('hidden');
            $('#recoverform').addClass('hidden');
            $('#recoveruserform').toggleClass('hidden');
            $('#employeeloginform').addClass('hidden');
            $(this.defineSelector()).find('#loginTitle .h1').text(page.getMainData().mui.pageContent.recoverUserFormTitle);
        };

        //restore username mechanise post form
        this.onSubmitRecoverUserForm = (form, event) => {

          event.preventDefault();
          this.lockForm(form);

          let searchContent = {};
          $(form).find('input').each((index,input) => {
            if($(input).val() != '' && $(input).attr('name') != 'submit' ) {
              searchContent[$(input).attr('name')] = $(input).val();
            }
          });
          this.showProgressOverlay();
          if( !$.isEmptyObject(searchContent) ) {
            searchContent['type']   = 'student';
            searchContent['portal'] = page.getPortalName();
            page.user.recoverUserName( searchContent ).done( () => {
              this.showAlert(this.getMessageByCode('RECOVER_USER_MAIL_SENT'), false, 10000);
            }).fail( () => {
              this.showAlert(page.getMainData().mui.pageContent.recoverUserFormEmpty, true);

            }).always(() => {
              this.unlockForm(form);
              this.hideProgressOverlay()
            });

          } else {
            this.showAlert(page.getMainData().mui.pageContent.recoverUserFormEmpty, true);
            this.unlockForm(form);
            this.hideProgressOverlay();
          }

        };
        this.onSubmitRecoverForm    =   (form, event) => {

            event.preventDefault();

            this.lockForm(form);

            let login               = $(form).find('#recoverform-login').val();

            this.showProgressOverlay();

            page.user.recoverPass(login).done(() => {

                this.showAlert(this.getMessageByCode('RECOVER_MAIL_SENT'), false, 10000);

            }).fail(() => {

                this.showAlert(this.getMessageByCode('E_NOT_FOUND', login), true);

            }).always(() => {

                this.unlockForm(form);
                this.hideProgressOverlay()

            });

        }

    }

    return LoginForm;
});
