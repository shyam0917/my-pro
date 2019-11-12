;define(['config!','jquery', 'lib/FormPage', 'lib/CallPost', 'lib/CallGet', 'lib/CallPut', 'ui/LoginForm', 'lib/CallPostFile', 'lib/CallDelete', 'lib/FormSet', 'jquery.mask'],
    function(config, $, FormPage, CallPost, CallGet, CallPut, LoginForm, CallPostFile, CallDelete, FormSet){

    function MyAccount() {

        FormPage.call(this);

        const that                  = this;

        this.getClassName           = function () {
            return 'MyAccount';
        };

        var data                    = {
            'subscriptions' :   []
        };

        var nationalIdMask          = null;

        this.defineContent          = function () {

            // // Show login form if User don't auth
            if(this.user.isAuth() === false) {

                let promise         = $.Deferred();

                promise.resolve();

                // show login form if user not auth
                this.loadStylesPromise.done(() => {

                    this.showLoginForm({isBlocking:true, redirectHomeOnClose:true});

                });

                return promise;
            }

            const that              = this;

            var isNotChangeStudentName = false;
            var isNotChangeUsername    = false;

            var promise             = $.Deferred();

            //this.getLecense

            $.when(this.getAccountConfig(this.user.getAccountId(), this.user),

                    this.getSubscription(),
                    this.getStudent(),
                    this.getAdditionalSpecification(),
                    this.defineMainData(),
                    this.loadMui()
            ).then(function (response, subcriptions, student, additional, mui) {

                if(response['isNotChangeStudentName']) {
                    isNotChangeStudentName = true;
                }

                if(response['isNotChangeUsername']) {
                    isNotChangeUsername = true;
                }

                data.accountType = response.type;

                data.national_id = student.student.national_id;

                that.handleContentData(response, subcriptions, student, additional, mui);

                that.setContentData(data);

                that.outContentPromise.done(function () {
                    // apply data mask options
                    $('[data-mask]').each(function () {
                        $(this).mask($(this).attr('data-mask'));
                    });
                });

                promise.resolve();

            }).fail(function (status) {

                if( status == 498 ) {
                    that.user.logout();

                    promise.resolve();

                    // show login form if user not auth
                    that.loadStylesPromise.done(() => {

                        that.showLoginForm({isBlocking:true, redirectHomeOnClose:true});

                    });
                }
            });


             // this.outContentPromise.done(() => {
             $.when(this.outContentPromise).then(() => {

                that.setHandlers();

                if(this.user.isAuth()) {

                    $.when(this.loadStylesPromise).then(() => {

                        if (this.user.needChangePass()) {
                            this.showAlert(this.getMessageByCode(this.user.E_NEED_CHANGE_PASSWORD), true);
                        }

                    });

                }

                if(isNotChangeStudentName) {
                    $(that.defineSelector() + ' [name=first_name]').prop('readonly', true);
                    $(that.defineSelector() + ' [name=last_name]').prop('readonly', true);
                }

                if(isNotChangeUsername) {
                    $(that.defineSelector() + ' [name=username]').prop('readonly', true);
                }


                 //update profile image handlers

                 document.ondragenter = function () {
                     $('body').addClass('drug-file');
                 };

                 document.ondrop = function (event) {

                     $('body').removeClass('drug-file');
                 };

                let uploadArea      = $('#profile-image').get(0);

                 uploadArea.ondragover = function() {
                     $('#profile-image').addClass('hover');
                     return false;
                 };

                 uploadArea.ondragleave = function() {
                     $('#profile-image').removeClass('hover');
                     return false;
                 };

                uploadArea.ondrop   = function(event) {
                    event.stopPropagation();
                    event.preventDefault();

                    let file        = event.dataTransfer.files[0];
                    let formSet     = new FormSet();
                    formSet.attachFileData('avatar', file);

                    $('body').removeClass('drug-file');

                    uploadAvatar(formSet);
                };

             });

            return promise;
        };

        this.defineSelector         = function () {

            return '#firstloginform';
        };

        this.onSubmitForm           = function (form, event) {

            event.preventDefault();

            this.lockForm(form);

            var formData        = this.defineFormData(form);

            // checked extended properties
            if(isTraversable(data['additional'])) {

                let additionalProperties = data['additional'];

                for(let property in additionalProperties) {

                    if(!additionalProperties.hasOwnProperty(property)) {
                        continue;
                    }

                    let prop    = additionalProperties[property];
                    let name    = prop['name'];

                    if(isEmpty(prop['is_static']) && isNotEmpty(prop['is_required']) && isEmpty(formData[name])) {
                        let mui = this.getMui();

                        if(typeof mui.error !== 'undefined') {
                            mui = mui.error.required;
                        } else {
                            mui = 'The field "{{field}}" - required';
                        }

                        this.showAlert(this.templater.render(mui, {'field': prop['label']}));
                        this.unlockForm(form);
                        return false;
                    }

                    if(prop['field_type'] === 'email' && !validateEmail(formData[name])) {
                        this.showAlert('Email wrong');
                        this.unlockForm(form);
                        return false;
                    }

                }
            }

            formData.national_id = data.national_id;
            formData.account_id = this.user.getAccountId();

            // remove national_id
            delete formData.national_id;

            // add x-src info
            formData['x-src']   = 'stargate-my-account';

            formData.token      = this.user.getSessionId();

            var apiUrl          = 'portals/student';

            that.remoteCall(new CallPost(apiUrl, formData, function (response) {

                that.unlockForm(form);

                that.showAlert(
                    that.getMainData().mui.pageContent.myAccount.message.AccountUpdated, true).done(function (modalWindow) {

                     modalWindow.bindOnClose(function () {
                         that.applyNewUserInfo(formData);
                     });

                });

            }).defineErrorHandler(function (query, status, msg, response) {

                //that.showAlert(that.getMainData().mui.error.unknownError || 'Unknown error occured', true);
                that.showAlert(that.getMessageByCode(status, response), true);
                that.unlockForm(form);
            }));
        };

        this.onSelectFile           = (node, event) => {

            let formSet     = new FormSet();
            formSet.attachFile(node);

            uploadAvatar(formSet).always(() => {
                $(node).val(null);
            });
        };

        this.onRemoveAvatar         = (node, event) => {

            let url                 = 'portals/student/avatar/';

            $('#profile-image-preload').removeClass('is_hidden');

            that.remoteCall(new CallDelete(url, {token: this.user.getSessionId()})).done((res) => {

                $('#profile-image-preload').addClass('is_hidden');
                $('#profile-image').removeClass('account-image--avatar-loaded')
            });
        };

        this.applyNewUserInfo       = function (formData) {

            this.user.applyNewUserInfo(formData);

            that.reload();
        };

        this.getMessageByCode       = (code, res) => {


            const defaultError      = 'Server error';
            let strings             = this.getMainData().mui;

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

                strings             = this.getMainData().mui.error;

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
            }

            switch(code) {

                // success

                case 'RECOVER_MAIL_SENT':                   return strings['recoverMailSent'];
                case this.user.AUTH_SUCCESS:                return strings['authSuccess'];
                case this.user.ACCOUNT_CHANGE_SUCCESS:      return strings['accountChangeSuccess'];

                // errors
                case this.user.E_WRONG_USERNAME:            return strings['wrongUsername'];
                case this.user.E_PASSWORDS_DONT_MATCH:      return strings['passwordsDontMatch'];
                case this.user.E_INVALID_EMAIL:             return strings['invalidEmail'];
                case this.user.E_DUPLICATE_USERNAME:        return strings['duplicateUsername'];
                case this.user.E_NEED_CHANGE_PASSWORD:      return strings['needChangePassword'];
                default:                                    return defaultError;
            }
        };

        /**
        * Returns an promise that returns the data subscription.
        *
        * @return {Promise}
        */
        this.getSubscription        = function () {

            var promise             = $.Deferred();

            this.remoteCall(new CallGet('accounts/0' + this.user.getAccountId() + '/subscriptions/', {
                    'token' :  this.user.getSessionId(),
                     '_extend': 'subscriptions,nextDate'
            },
                 function (response) {

                     promise.resolve(response.response);

            }).defineErrorHandler(function (query, status, errorThrown) {

                console.error("Error get Subscription " + status + ":" + errorThrown);

                promise.reject(query, status, errorThrown);

            }));

            return promise;

        };


        this.onCancelSubscription   = function (event) {

            $('#loading-overlay').fadeIn(300).css('display', 'block');

            var mui                 = this.getMainData().mui;

            var cancelAction        = $.Deferred();

            var accountGUID         = this.user.getAccountId();

            var subscriptionGUID    = $(event).attr('data-guid');

            this.remoteCall(new CallPut('accounts/' + accountGUID + '/subscriptions/' + subscriptionGUID + '/cancel',
                {
                    'method': 'PUT',
                    'token' :  this.user.getSessionId()
                }, (res) => {

                    cancelAction.resolve(res);

                    if(typeof res.response.result && res.response.result) {

                        $('.cancel-subscription').remove();

                        location.reload();
                    }
                    $('#loading-overlay').fadeOut(300);

                }).defineErrorHandler((query, status) => {

                cancelAction.reject(status);

                $('#loading-overlay').fadeOut(300);

                that.showAlert(mui.error.unknownError || 'Unknown error occured', true);
            }));

            return cancelAction;
        };

        /**
         * Prepare account data.
         *
         * @return {Promise}
         */
        this.handleContentData      = function (response, subscriptions, student, additional, mui) {

            data.switchers          = {
                langSwitcher: [], genderSwitcher: []
            };
            data.switcherLable          = {
                langSwitcher: this.getMainData().mui.pageContent.myAccount.txtLabel.EmailLanguage,
                genderSwitcher: ''
            };

            $.each(config.portal['langs'], function (i, lang) {

                data.switchers.langSwitcher.push({
                    is_selected:    lang['lang'] == student.student.lang ? 1 : 0,
                    checked:        lang['lang'] == student.student.lang ? 'checked' : '',
                    name:           'lang',
                    value:          lang['lang'],
                    label:          lang['name']
                });

            });

            try{
                student.student.extra = JSON.parse(student.student.extra);
            }catch (e) {
                student.student.extra = [];
            }

            var mui                 = this.getMainData().mui.buttonLabel;
            var genders             = [
                {label: 'genderNotSpecify', value: ''},
                {label: 'genderMale', value: 'm'},
                {label: 'genderFemale', value: 'f'}
            ];

            $.each(genders, function (i, gender) {
                data.switchers.genderSwitcher.push({
                    is_selected:    gender['value'] == student.student.gender ? 1 : 0,
                    checked:        gender['value'] == student.student.gender ? 'checked' : '',
                    name:           'gender',
                    value:          gender['value'],
                    label:          mui[gender['label']]
                });
            });

            if(student && student.simple_stats) {

                data.firstLoginDate     = student.simple_stats.first_login_time ? student.simple_stats.first_login_time : 'N/A';
                data.lastLoginDate      = student.simple_stats.last_login_time ? student.simple_stats.last_login_time : 'N/A';
            }

            if(student && student.active_license) {

                data.isLicense          = true;
                data.licenseDuration    = student.active_license.license_duration ? student.active_license.license_duration : 'N/A';
                data.activationDate     = student.active_license.activation_date ? student.active_license.activation_date : 'N/A';
                data.expirationDate     = student.active_license.expire_date  ? student.active_license.expire_date : 'N/A';
                data.isExpire           = student.active_license.is_expired;
            }else{
                data.isLicense          = false;
            }

            if(student && student.student) {
                data.student            = student.student;
            }

            data.licenseStatus      = that.getLicenseStatus(student.active_license);

            // additional
            if(typeof additional === 'object') {
                let result          = [];

                for(let key in additional) {
                    if(!additional.hasOwnProperty(key)) {
                        continue;
                    }

                    let block       = additional[key];

                    block['value']  = '';

                    let specialProperties = ['username', 'password', 'gender', 'lang', 'national_id'];

                    // special key for property type
                    if(specialProperties.indexOf(key) !== -1) {
                        block['property_' + key] = true;
                        data['is_property_' + key] = block;
                    } else {
                        block['property_default'] = true;
                        if(block['field_type'] === 'select') {
                            block['property_select'] = true;
                            delete block['property_default'];
                        }
                    }

                    if(!block['edit_in_lms']) {
                        block['readonly'] = 'readonly="readonly"';
                    }

                    if(block['is_required'] && block['edit_in_lms']) {
                        block['required'] = 'required="required"';
                    }

                    if(typeof student['student'][block['name']] !== 'undefined') {
                        block['value'] = student['student'][block['name']];
                    } else if(typeof student['student']['extra'] === 'object'
                        && typeof student['student']['extra'][block['name']] !== 'undefined') {
                        block['value'] = student['student']['extra'][block['name']];
                    }

                    if(specialProperties.indexOf(key) === -1 && block['field_type'] === 'select') {
                        for(let i in block['values']) {
                            if(block['values'][i]['id'] === block['value']) {
                                block['values'][i]['selected'] = 'selected';
                            }
                        }
                    }

                    if(isNotEmpty(block['options']) && isNotEmpty(block['options']['mask'])) {
                        block['mask'] = 'data-mask="' + block['options']['mask'] + '"';

                        if(key === 'national_id') {
                            nationalIdMask = block['options']['mask'];
                        }
                    }

                    result.push(block);
                }

                data['additional'] = result;
            }

            //not show for employee
            if( data.accountType == 'business' && !this.user.getUserAccountAdmin() ) {
                delete data.subscriptions;
                return;
            }

            $.each(subscriptions, function (i, subscription) {

                if(subscription.subscription_type != 'paypal' || !subscription.status) { //now we can cancel only Paypal subscriptions
                    delete data.subscriptions[i];
                    return true;
                }

                var item                   = {};
                item.isShowCancel  = subscription.status == 'ActiveProfile' && !subscription.ended; //show cancel subscription button
                item.isActive      = !subscription.ended; //show message for active or cancel
                item.isMarkedCancel = subscription.status == 'canceled'; //show message for marked to cancel
                item.title         = subscription.name;
                item.guid          = subscription.id;
                item.nextDate      = subscription.nextDate ? subscription.nextDate : '--';
                item.endDate       = subscription.end_date;
                item.licenseCount  = data.accountType == 'business' ? subscription.num_licenses : false;


                data.subscriptions.push(item);
            });
        };

        /**
         * Returns an promise that returns the data of Student.
         *
         * @return {Promise}
         */
        this.getStudent             = function () {

            var promise             = $.Deferred();

            this.remoteCall(new CallGet('accounts/0' + this.user.getAccountId() + '/groups/0/students/' + this.user.getUserId(), {
                    'token' :  this.user.getSessionId(),
                    _extend: 'license,simple_stats,avatar'
                },
                function (response) {

                    promise.resolve(response.response);

                }).defineErrorHandler(function (query, status, errorThrown) {

                that.showAlert(that.getMainData().mui.error.unknownError || 'Unknown error occured' + status, true);

                promise.reject(query, status, errorThrown);

            }));

            return promise;

        };

        this.onChangePassword       = function (n,e) {

            that.loadTemplate('ui/changePassword').done(function (template) {
                var mui     = that.getMainData().mui;
                var data    = {
                    newpassword:mui.pageContent.formlabel.newpassword,
                    newpassword2:mui.pageContent.formlabel.newpassword2
                };

                that.renderTo(template, data, '#modal__text');

                    that.showConfirm(null, function($alert){

                        var promise         = $.Deferred();
                        var password        = $alert.find('[name^=newpass]').val();
                        var passwordConfirm = $alert.find('[name^=newpass_confirm]').val();

                        if(!password || password != passwordConfirm ){

                            $alert.find('#ErrorPasswordFormMessage').text(mui.loginForm.errorMessage.passwordsDontMatch).removeClass('hidden');
                            promise.reject({});

                        } else {

                            var apiUrl          = 'users/password/recovery';
                            var params          =  {
                                password : password,
                                api_token: that.user.getSessionId()
                            };

                            that.remoteCall(new CallPost(apiUrl, params, function (response) {

                                promise.resolve(response['response']);

                                that.clearConfirmText();

                                setTimeout(function() {
                                    that.showAlert(
                                        mui.pageContent.myAccount.message.PasswordCahged, false);
                                }, 300);

                            }).defineErrorHandler(function (query, status, errorThrown, response) {

                                // that.clearConfirmText();

                                that.showAlert(that.getMessageByCode(status, response), true);

                                promise.reject(status);

                            }));

                        }
                        return promise;


                    }, that.getMainData().mui.pageContent.myAccount.txtLabel.Change);

            });

            e.preventDefault();
        };

        this.clearConfirmText       = function () {
            $('#modal__text').html('');
        };

        this.showNationalIdModal    = function () {
            this.showConfirm(
                null, this.submitNationalID, that.getMainData().mui.pageContent.myAccount.txtLabel.Change
            );
        };

        this.submitNationalID       = function ($alert) {

            var mui     = that.getMainData().mui;
            var promise         = $.Deferred();
            var nID             = $alert.find('[name^=national]').val();
            var nIDConfirm      = $alert.find('[name^=national_confirm]').val();

            if(!nID || nID != nIDConfirm) {

                $alert.find('#ErrorFormMessage').text(
                    mui.pageContent.myAccount.message.NIDsNotMatch
                ).removeClass('hidden');
                promise.reject({});

            } else {

                var apiUrl          = 'portals/student';
                var params          =  {
                    national_id : nID,
                    token: that.user.getSessionId()
                };

                that.remoteCall(new CallPost(apiUrl, params, function (response) {

                    promise.resolve(response['response']);

                    that.clearConfirmText();

                    setTimeout(function() {
                        that.showAlert(
                            mui.pageContent.myAccount.message.NIDChanged, false);
                    }, 300);

                }).defineErrorHandler(function (query, status, msg, response) {

                    promise.reject(status);

                    that.clearConfirmText();

                    if(status == '412') {

                        setTimeout(function() {
                            that.showAlert(
                                mui.pageContent.myAccount.message.ErrorChangingNID || 'Unknown error occured' + status, true);
                        }, 300);
                    }

                }));
            }

            return promise;
        };

        this.onChangeNationalID     = function (n,e) {

            e.preventDefault();

            that.loadTemplate('ui/changeNational').done(function (template) {

                var mui     = that.getMainData().mui;
                var data    = {
                    newnationalID:mui.pageContent.formlabel.newnationalID,
                    newnationalID2:mui.pageContent.formlabel.newnationalID2
                };

                that.renderTo(template, data, '#modal__text');

                // setup nationalIdMask
                if(isNotEmpty(nationalIdMask)) {
                    $('#modal__text').find('input').mask(nationalIdMask.toString());
                }

                that.showNationalIdModal();
            });
        };

        /**
         * Returns translated status of license.
         *
         * @return {string}
         */
        this.getLicenseStatus         = function (license) {

            let statusValue         = license && license.status;

            let mui                 = this.getMainData().mui.pageContent.myAccount.licensesStatus;
            let status              = mui.na;

            switch(statusValue) {

                case 'activated':   status = mui.activated;   break;
                case 'assigned':    status = mui.assigned;    break;
                case 'deactivated': status = mui.deactivated; break;
                case 'extended':    status = mui.extended;    break;
                case 'unused':      status = mui.unused;      break;
                case 'unlicensed':  status = mui.unlicensed;  break;
                case 'expired':     status = mui.expired;  break;
            }

            return status;
        };

        /**
         * Get specification for additional properties
         * @return {promise}
         */
        this.getAdditionalSpecification = function () {

            let url                 = 'accounts/' + this.user.getAccountId()
                                    + '/forms/0portal_user_profile';

            let promise             = $.Deferred();
            let data                = {
                '_extend':          'mui',
                'lang':             this.getLanguage(),
                'token':            this.user.getSessionId()
            };

            this.remoteCall(new CallGet(url, data, function(res) {
                promise.resolve(res.response);
            }));

            return promise.promise();
        };

        let uploadAvatar                = function (formSet) {


            let url                     = 'portals/student/avatar/';

            $('#profile-image-preload').removeClass('is_hidden');

            formSet.append('token', that.user.getSessionId());

            return that.remoteCall(new CallPostFile(url, formSet)).done((res) => {
                showAvatar(res.response, true);

                $('#profile-image-preload').addClass('is_hidden');
            });
        };

        let showAvatar                  = function (image, update) {

            if(update){
                image = image + '?' + (new Date()).getTime();
            }

            $('#profile-image-pic').attr('src', image);
            $('#profile-image').addClass('account-image--avatar-loaded');
        };

    }

    MyAccount.prototype                 = Object.create(FormPage.prototype);
    MyAccount.prototype.constructor     = MyAccount;

    return MyAccount;
});