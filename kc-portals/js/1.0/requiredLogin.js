;define(['jquery', 'lib/Page', 'lib/CallPost', 'ui/LoginForm', 'ui/ModalWindow', 'lib/CallGet', 'jquery.mask'],
    function($, Page, CallPost, LoginForm, ModalWindow, CallGet) {

    function RequiredLogin() {

        const that                  = this;

        Page.apply(this, arguments);

        var loginForm               = new LoginForm(this, $('body'));

        this.setMainOut(false);

        this.invalidateMain();

        this.getClassName           = () => 'requiredLogin';

        var _init                   = this.init;
        this.init                   = function () {

            this.outContentPromise.done(function () {

                $('input').on('change focus blur keyup', function () {

                    $(this).toggleClass('is_valid', $(this).val().length > 0);

                });

                $('.auth-field').on('focus.initPage', function () {
                    if($('#login').val() !== ''){
                        $('.auth-field').addClass('is_valid');
                    }
                    $(this).off('focus.initPape');
                });

                $('select').on('focus', function () {
                    $(this).parent().addClass('is_valid');
                }).on('blur', function () {
                    $(this).parent().toggleClass('is_valid', $(this).val() !== '');
                });

            });

            return _init.apply(this, arguments);
        };

        this.loadMainTemplate       = function () {

            return $.when(this.loadTemplate('requiredLogin'), this.defineContent()).done(function (res) {
                that.setMainHtml(res[0]);
            }).fail(function () {
                console.error('Failed load main template: login');
                $('body').html('<h1>The site load error!</h1>');
            });
        };

        this.loadContentTemplate    = function () {

            // nothing to load
            return $.Deferred().resolve().promise();
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

        this.defineContent          = function () {

            return $.when(
                this.getFeaturedData(),
                this.getAdditionalSpecification(),
                this.loadMui()
            ).then((featured, properties, mui) => {

                mui                 = this.getMainData().mui;

                let result          = [];
                let tabIndex        = 11;

                // additional
                if(typeof properties === 'object') {

                    for(let key in properties) {

                        if(!properties.hasOwnProperty(key)) {
                            continue;
                        }

                        let block       = properties[key];
                        block['value']  = '';
                        block['index']  = tabIndex;

                        tabIndex++;

                        this.buildPropertyControl(block, mui);

                        result.push(block);

                        if(block['name'] === 'email') {
                            block       = $.extend({}, block);
                            block['name'] = 'confirm_email';
                            this.buildPropertyControl(block, mui);
                            result.push(block);
                        }
                    }

                    result          = this.buildProperties(result);
                }

                $.extend(
                        this.getMainData(),
                        mui,
                        {featured: featured},
                        result
                );
            });

        };

        this.buildProperties        = function (allProperties) {

            let maxColumns          = 5;

            if(countTraversable(allProperties) < 4 * 4) {
                maxColumns          = Number(countTraversable(allProperties) / 4);
            }

            let results             = {};

            for(let column in {'column1':0, 'column2':0, 'column3':0, 'column4':0}) {

                let properties      = [];

                // separate properties to 4 columns
                for(let i in allProperties) {

                    if(!allProperties.hasOwnProperty(i)) {
                        continue;
                    }

                    let item    = allProperties[i];
                    properties.push(item);

                    delete allProperties[i];

                    if(column !== 'column4' && properties.length >= maxColumns) {
                        break;
                    }
                }

                results[column]     = properties;
            }

            /*
            if(countTraversable(results['column2']) > 4) {
                results['column1'].push(results['column2'].shift());
            }

            if(countTraversable(results['column4']) > 4) {
                results['column3'].push(results['column4'].shift());
            }
            */

            return results;
        };

        this.buildPropertyControl   = function (property, mui) {

            // required="required"
            if(property['is_required']) {
                property['required'] = 'required="required"';
            } else {
                property['required'] = '';
            }

            switch(property['name']) {

                // mui.pageContent.requestAccess.formlabel.male
                // mui.pageContent.requestAccess.formlabel.female

                case 'gender': {
                    property['html'] = '<div class="required-login__select"><div class="required-login__select-wrap">' +
                        '<select name="gender" tabindex="' + property['index'] + '" ' + property['required'] + ' autocomplete="nope">\n' +
                        '    <option value=""></option>\n' +
                        '    <option value="m">' + mui.pageContent.requestAccess.formlabel.male + '</option>\n' +
                        '    <option value="f">' + mui.pageContent.requestAccess.formlabel.female + '</option>\n' +
                        '</select></div>' +
                        '<label class="required-login__field-label">' + property['label'] + '</label>' +
                        '</div>';
                    break;
                }
                case 'date_of_birth': {

                    property['html'] = '<input type="date" name="' + property['name']
                                        + '" class="required-login__input"\n' +
                        'tabindex="' + property['index'] + '" '
                        + property['required'] + '\n' +
                        'value="' + property['value'] + '" autocomplete="nope">' +
                        '<label class="required-login__field-label">' + property['label'] + '</label>';
                    break;
                }
                case 'lang':
                    property['html'] = '<div class="required-login__select"><div class="required-login__select-wrap">' +
                        '<select name="lang" tabindex="' + property['index'] + '" ' + property['required'] + ' autocomplete="nope">\n' +
                        '<option value=""></option>\n' +
                        '<option value="en">English</option>\n' +
                        '<option value="ar">العربية</option>\n' +
                        '</select></div>' +
                        '<label class="required-login__field-label">' + property['label'] + '</label>' +
                        '</div>';

                    break;
                case 'confirm_email':

                    // mui.pageContent.requestAccess.formlabel.confirmEmail
                    property['label'] = mui.pageContent.requestAccess.formlabel.confirmEmail;

                    property['html'] = '<input type="text" name="' + property['name']
                                        + '" class="required-login__input"\n' +
                        'tabindex="' + property['index'] + '" '
                        + property['required'] + '\n' +
                        'value="' + property['value'] + '" data-type="confim:email">' +
                        '<label class="required-login__field-label">' + property['label'] + '</label>';
                    break;

                case 'group':
                {
                    property['html'] = this.genSelectControl(property);

                    break;
                }
                default: {

                    // select control
                    if(property['field_type'] === 'select') {
                        property['html'] = this.genCustomSelectControl(property);
                        break;
                    }

                    property['html'] = '<input type="text" name="' + property['name']
                                        + '" class="required-login__input"\n' +
                        'tabindex="' + property['index'] + '" '
                        + property['required'] + '\n' +
                        'value="' + property['value'] + '">' +
                        '<label class="required-login__field-label">' + property['label'] + '</label>';
                }
            }
        };

        this.genCustomSelectControl  = function (spec) {

            let controlCSS          = 'form-control input';

            let mui                 = this.getMui();
            let msg                 = mui.form.requiredField.invalidMessageList;

            let options             = [];

            // placeholder
            options.push('<option value="">' + spec['label'] + '</option>');

            let values              = [];

            if(isNotEmpty(spec['values'])) {
                values              = spec['values'];
            }

            for(let i in values) {
                if(!values.hasOwnProperty(i)) {
                    continue;
                }

                options.push('<option value="' + values[i]['id'] + '">' + values[i]['name'] + '</option>');
            }

            let select              = '<select class="required-login__input"  '
                + '" name="' + spec['name'] + '" ' +
                + spec['required'] +
                '>\n'
                + options.join('') +
                '</select>';

            return select;
        };

        this.genSelectControl       = function (spec) {

            let options             = [];

            // placeholder
            options.push('<option value="">' + spec['label'] + '</option>');

            let groups              = [];

            if(isNotEmpty(spec['values'])) {
                groups              = spec['values'];
            } else if(isNotEmpty(spec['options']) && isNotEmpty(spec['options']['groups'])) {
                groups              = spec['options']['groups'];
            }

            for(let i in groups) {
                if(!groups.hasOwnProperty(i)) {
                    continue;
                }

                options.push('<option value="' + groups[i]['id'] + '">' + groups[i]['name'] + '</option>');
            }

            let select              = '<select class="required-login__input" name="group" ' + spec['required'] +
                '>\n'
                + options.join('') +
                '</select>';

            return select;
        };

        this.onRequestAccess        = function () {
            showRequestForm();
        };

        this.onLoginForm            = function () {
            showLoginForm();
        };

        this.onForgotPassForm       = function ( node, event ){
            showForgotPasswordForm();
        };

        this.onForgotUserForm       = function ( node, event ){
            showForgotUsernameForm();
        };

        this.onReturnToLoginForm    = function ( node, event ) {
            returnToLoginForm();
        };

        this.onLogin                = function (node, event) {
            event.preventDefault();

            let form                = $('#loginForm');
            let authData            = this.getFormData(form);

            if(authData.login === "" || authData.password === ""){

            }

            this.lockForm(form);

            this.showProgressOverlay(form);

            this.user.auth(authData.login, authData.password, 'username').done(() => {

                this.clearForm(form);
                this.unlockForm(form);

                this.updateUserView();

            }).fail((code, res) => {

                // lib/User.js changes the code variable to Redirect if response.redirect is not empty
                if(code !== "Redirect"){

                    // STARGATE-2431 - Do not display(hide) password recover link
                    // if restriction is based on Scheduled Access
                    if(res.message === "ACCESS_SCHEDULE") {
                        $("#errorMessage .required-login__singup-link").parent().hide();
                    }

                    this.showLoginError(loginForm.getMessageByCode(code, res));
                    this.unlockForm(form);
                }

            }).always(() => {

                this.hideProgressOverlay(form);
            });
        };
        this.onRecoverPassword    = ( node, event ) =>  {
          event.preventDefault();
          let form                = $('#recoverPasswordForm');
          let login               = $(form).find('#recoverpassword-login').val();

          this.lockForm(form);

          this.showProgressOverlay(form);

          this.user.recoverPass(login).done(() => {

            this.clearForm(form);
            this.unlockForm(form);
            this.showAlert(loginForm.getMessageByCode('RECOVER_MAIL_SENT'), false);

          }).fail( ( code, res ) => {
            this.showAlert( loginForm.getMessageByCode( 'E_NOT_FOUND', res ) );
            this.unlockForm(form);
          }).always( () => {
            this.hideProgressOverlay(form);
          });
        };

        this.onRecoverUserForm      = ( node, event ) => {

          event.preventDefault();
          let form                = '#recoverUsernameForm';
          this.lockForm(form);

          let searchContent = {};
          $(form).find('input').each((index,input) => {
            if($(input).val() != '' ) {
              searchContent[$(input).attr('name')] = $(input).val();
            }
          });

          this.showProgressOverlay();
          if( !$.isEmptyObject(searchContent) ) {
            searchContent['type']   = 'student';
            searchContent['portal'] = this.getPortalName();

            this.user.recoverUserName( searchContent ).done( () => {

              this.clearForm(form);
              this.unlockForm(form);
              this.showAlert(loginForm.getMessageByCode('RECOVER_USER_MAIL_SENT'));
            }).fail( () => {
              this.showAlert(this.getMainData().mui.pageContent.recoverUserFormEmpty, true);
              this.unlockForm(form);

            }).always(() => {
              this.unlockForm(form);
              this.hideProgressOverlay();
            });

          } else {
            this.showAlert(this.getMainData().mui.pageContent.recoverUserFormEmpty, true);
            this.unlockForm(form);
            this.showProgressOverlay();
          }
        };

        this.onShowForgotForm       = (node, event) => {
            event.preventDefault();

            $('#errorMessage').addClass('is_hidden');
            $('#recoverform').removeClass('is_hidden');
        };

        this.showLoginError       = (message, isError) => {

            $('#errorMessage').removeClass('is_hidden');
            $('#recoverform').addClass('is_hidden');

            var selector            = '#loginError';

            // normalize parameter to boolean
            isError                 = typeof isError === 'boolean' ? isError: false;

            var $alert              = $(selector);

            $alert.find('[rel=text]').html(message);

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        true
            });

            return modalWindow.show().then(function() {
                $alert = $( selector+".cloned" );
            $alert.find('[rel^=close]').bind('click', function () {
                modalWindow.close();
            });

            });
        };

        this.onSubmitRecoverForm    = (node, event) => {
            loginForm.onSubmitRecoverForm(node, event);
        };

        this.onSendRequestAccess    = (node, event) => {

            event.preventDefault();

            let form                = $('#requestForm');
            let data                = this.getFormData(form);

            if(data.lang === ''){
                data.lang           = this.getLanguage();
            }

            if(data.confirm_email !== data.email) {
                this.showAlert(this.getMainData().mui.pageContent.requestAccess.checkEmail);
                return false;
            }

            this.lockForm(form);

            this.remoteCall(new CallPost('portals/'+ this.getPortalId() +'/access_requests/', data))
                .done( () => {
                    $('#formMessages').removeClass('is_hidden');
                    $('#formFields').addClass('is_hidden');
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

        this.onNextStep             = function (node, event) {
            event.preventDefault();
            showRequestStep($(node).closest('.required-login__step').index() + 1);
        };

        this.onSetStep              = function (node, event) {
            showRequestStep($(node).index());
        };

        this.lockForm               = function ( form, change ) {

            change = typeof change == 'undefined'? true : change;
            let mui             = this.getMainData().mui;

            // enable all inputs
            $(form).find('input,textarea').each(function () {
                $(this).prop('disabled', true);
            });

            $(form).find('button[type="submit"]').each(function () {
                $(this).prop('disabled', true);
                if( change ) {
                    $(this).attr('rel', $(this).html())
                    .html(mui.buttonLabel.wait);

                }
            });

            $(form).find('input[type="submit"]').each(function () {
                $(this).prop('disabled', true);
                if( change ) {
                  $(this).attr('rel', $(this).attr('value'))
                    .attr('value',mui.buttonLabel.wait);

                }
            });

        };

        this.unlockForm             = function ( form, change ) {

            change = typeof change == 'undefined'? true : change;
            let mui             = this.getMainData().mui;

            // enable all inputs
            $(form).find('input,textarea').each(function () {
                $(this).prop('disabled', false);
            });

            $(form).find('button[type="submit"]').each(function () {
                $(this).prop('disabled', false)
                if( change ){
                  $(this).html( $(this).attr('rel'));
                }
            });

            $(form).find('input[type="submit"]').each(function () {
                $(this).prop('disabled', false);
                if( change ){
                  $(this).attr('value',$(this).attr('rel'));
                }
            });


        };

        this.clearForm              = function (form) {
            $(form).find('input,textarea').each(function () {
                $(this).val('');
            });
        };

        this.getFormData            = function (form) {

            let data = {
                extra: {}
            };

            $('input,select', form).each(function () {
                let key = $(this).attr('name');
                let value = $(this).val();

                data[key] = value;

                /*
                if($(this).data('type') === 'extra'){
                    data['extra'][key] = value;
                }else{
                    data[key] = value;
                }
                */
            });

            return data;
        };

        this.showProgressOverlay    = function (form) {

            $(form).find(".progressOverlay").removeClass('hidden');
        };

        this.hideProgressOverlay    = function (form) {

            $(form).find(".progressOverlay").addClass('hidden');
        };

        this.getFeaturedData =  () => {

            let prom = $.Deferred();

            this.remoteCall(new CallGet('portal/static/json/featured/' + this.getLanguage() + this.rvtVal(), {}, (res) => {

                $.when(this.defineCategoriesData()).then(() => {

                    prom.resolve(this.handleFeaturedData(res))

                });

            })
                .defineErrorHandler(function (query, status) {

                    prom.resolve({});

                })
                .asCached().asLocalCached());


            return prom;

        };

        this.handleFeaturedData  = (featured) => {

            return this.buildFeaturedCategories(featured.categories);

            /*return {
                featuredCategories: ,
                featuredCoursesShow: !!(featured.courses && featured.courses.length),
                featuredCourses: this.buildFeaturedCourses(featured.courses)
            }*/

        };

        /*this.buildFeaturedCourses = (featured) => {

            if(!featured || !featured.length) return false;

            return featured.map(course => {

                return {
                    title:course.course_title,
                    url: this.generateNewUrl('library/' + course.course_id + '/' + that.rewriteTitletoUrl(course.course_title)),
                    course_id: course.course_id,
                    lesson_id: course.firstLesson_guid,
                    preview: {
                        path:       that.config.CDNContent + 'previews/',
                        src:        course['course_id'] + '/400.jpg',
                        src2x:      course['course_id'] + '/800.jpg',
                        sources: [
                            {
                                maxWidth:   395,
                                src:        course['course_id'] + '/400.jpg',
                                src2x:      course['course_id'] + '/800.jpg'
                            },
                            {
                                maxWidth:   600,
                                src:        course['course_id'] + '/640.jpg',
                                src2x:      course['course_id'] + '/1280.jpg'
                            }
                        ]
                    },
                    runtime: this.formatSecondsToHrs(course.trt),
                    lesson_type: course.introType || 'video'
                }
            });
        };*/

        this.buildFeaturedCategories = (featured) => {

            const that          = this;
            if (!featured || !featured.length) return false;

            return featured.map(section => {


                if(!section.ceid) {
                    that.appLocation.topCategories.map(topCat => {
                        if(section.jsonFileName === topCat.json_filename) {
                            section.ceid =  topCat.id;
                        }
                    });
                }

                var catImg = typeof section.categoryImage !== 'undefined' ? `${this.getMainData().CDN_PORTAL}/assets/images/categories/${this.getLanguage()}/${section.categoryImage}` : `${this.getMainData().IMG}featured/${section.jsonFileName}.jpg`;
                catImg = this.addRVTnumber(catImg);

                return {
                    img : catImg,
                    title: section.title,
                    url: this.generateNewUrl('library/' + section.ceid + '/' + section.jsonFileName),
                    categories: (section.children && section.children.length) ? section.children.map(category => {

                        // fix main page icon
                        var icon = this.config.pathTemplate + '/images/noimage--v'+this.config.portalStorageStamp+'.png';
                        try {
                            var cat_icon = JSON.parse(category.imgFiles);
                            if(typeof cat_icon.catAppIcon!=='undefined'){
                                if(cat_icon.catAppIcon!=='0') {
                                    icon = this.config.CDNPortal + 'opencontent/portals/' + this.config.portalID + '/assets/images/categories/' + category.id + '/app/icon/' + cat_icon.catAppIcon;
                                    icon = this.addRVTnumber(icon);
                                }
                            }
                        } catch (e) {
                            //err
                        }
                        return {
                            title:  category.title,
                            url: this.generateNewUrl('library/' + category.ceid + '/' + section.jsonFileName + '/' + category.slug),
                            icon : icon,
                        }
                    }) : []

                };

            });


        };

        /**
         * Get specification for additional properties
         * @return {promise}
         */
        this.getRequestAccessSpecification = function () {

            let url                 = 'portals/0' + this.getPortalId()
                + '/forms/0request_access/';

            let promise             = $.Deferred();
            let data                = {
                'is_static':        1,
                '_extend':          'mui',
                'lang':             this.getLanguage()
            };

            this.remoteCall(new CallGet(url, data, function(res) {
                promise.resolve(res);
            }));

            return promise.promise();
        };

        let showRequestForm         = function () {

            that.getRequestAccessSpecification().done(function (result) {

                if(typeof result.response === 'undefined') {
                    throw new Error('Server error response');
                }

                // get first data
                let data            = result.response;
                let $form           = $('#requestForm');

                for(let name in data) {

                    if(!data.hasOwnProperty(name)) {
                        continue;
                    }

                    let $control    = $form.find('[name=' + name + ']');

                    if($control.length <= 0) {
                        continue;
                    }

                    let spec        = data[name]['options'];

                    if(isEmpty(spec)) {
                        spec        = {};
                    }

                    if(isNotEmpty(spec['mask'])) {
                        $control.mask(spec['mask'].toString());
                    }
                }
            });

            showRequestStep(0);
            if( $('.required-login__library').length > 0 ) {
                $('.required-login__library').addClass( 'is_hidden' );
                $('.required-login__request-form').addClass('open');
            }
            $('#requestForm, #requestDsc').removeClass('is_hidden');
            $('#loginFormScreen').addClass('is_hidden');

        };

        let showLoginForm           = function () {

            if( $('.required-login__library').length > 0 ) {
                $('.required-login__library').removeClass( 'is_hidden' );
                $('.required-login__request-form').removeClass('open');
            }
            $('#requestForm, #requestDsc').addClass('is_hidden');
            $('#loginFormScreen').removeClass('is_hidden');
        };

        let showRequestStep         = function (index) {

            $('.required-login__step, .required-login__steps-enum li').removeClass('current');

            $('.required-login__step').eq(index).addClass('current');
            $('.required-login__steps-enum li').eq(index).addClass('current');
        };

        let returnToLoginForm       = function () {

          if( $('body').css('direction') == 'rtl' ) {
            $(".recoverForm").animate( { right:'285px' } );
            $("#loginForm").animate( { right: '2px' } );
          } else {
            $(".recoverForm").animate( { left:'285px' } );
            $("#loginForm").animate( { left: '2px' } );
          }
          that.unlockForm($("#loginForm"), false );
          that.lockForm($(".recoverForm"), false );
        };
        let showForgotPasswordForm  =  function () {
          if( $('body').css('direction') == 'rtl' ) {
            $("#loginForm").animate( { right:'-285' } );
            $("#recoverPasswordForm").animate( { right: '2px' } );
          } else {
            $("#loginForm").animate( { left:'-285' } );
            $("#recoverPasswordForm").animate( { left: '2px' } );
          }
          that.unlockForm($("#recoverPasswordForm"), false );
          that.lockForm($("#loginForm"), false );
        };
        let showForgotUsernameForm  = function () {
          if( $('body').css('direction') == 'rtl' ) {
            $("#loginForm").animate( { right:'-285' } );
            $("#recoverUsernameForm").animate( { right: '2px' } );
          }
          else {
            $("#loginForm").animate( { left:'-285' } );
            $("#recoverUsernameForm").animate( { left: '2px' } );
          }
          that.unlockForm($("#recoverUsernameForm"), false );
          that.lockForm($("#loginForm"), false );
        };

    }

    RequiredLogin.prototype               = Object.create(Page.prototype);
    RequiredLogin.prototype.constructor   = RequiredLogin;

    return RequiredLogin;
});
