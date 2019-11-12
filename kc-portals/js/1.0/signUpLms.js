;define(['jquery', 'lib/Page', 'lib/SendForm', 'lib/CallGet', 'lib/CallPost', 'ui/ModalWindow', 'validate', 'ui/ruleBasedOnPromise'],
    function ($, Page, SendForm, CallGet, CallPost, ModalWindow) {

        function SignUpLms() {
            SendForm.call(this);
        	Page.call(this);
        	const that                  = this;
            const validatorLabels         = {};
            this.isAllowed                = false;

            this.getClassName           = function () {
                return 'SignUpLms ';
            };

            this.defineSelector     = function () {
                return '#lmsCreator';
            };

            this.defineEmailType     = function(){
               return ( this.isAllowed ) ?'accounts/lms' : 'portals/' + this.getPortalName() + '/contact_signupLms';
            };
            this.defineContent          = function () {
                $.when( this.outContentPromise, this.loadStylesPromise ).done(() => {
                    that.setHandlers();
                });
            	return $.when(
            		this.getPageMui(),
                    this.isCountryAllowed()
                ).then( ( mui, isAllowed ) =>{
                    isAllowed = false;// hardcode isAllowed as FALSE to hide the portal creation form for all users
                    var formButton =  (isAllowed) ? mui.SignUpLms.formButton : mui.SignUpLms.formButtonNA;
                    this.isAllowed = isAllowed;
                    let data       = mui.SignUpLms;
                    $.extend(data, {'isAllowed': isAllowed});
                    $.extend( validatorLabels, mui.validatorLabels );
                    $.extend( validatorLabels, { 'formButton': formButton } );
        			that.setContentData(data);
            	});
            };
            this.getValidateLabels      = function () {
                return validatorLabels;
            };
            this.validatePortal        = function ( portal_code ) {
                var prom = $.Deferred();
                 this.remoteCall(new CallGet("portals/0" + portal_code, {}, function(response) {
                    var result =  (response.code == 200 ) ? false : true;
                    prom.resolve(result);
                 }).defineErrorHandler( function (a){
                    prom.resolve(true);
                 }));
                 return prom;
            };
            this.validateEmail          = function ( email ) {

                var prom = $.Deferred();
                 this.remoteCall(new CallGet("accounts/available-emails" , { 'emails' : email }, function(data) {
                    var result =  ( data.code == 200 && data.response.unavailable.length > 0 ) ? false : true;
                    prom.resolve(result);
                 }).defineErrorHandler( function (a){
                    prom.resolve(true);
                 }));
                 return prom;
            }
            this.setHandlers            = function () {
                var info_get            = this.getVariables();
                var validateLabels      = this.getValidateLabels();
                $.extend($.validator.messages, {
                    required: validateLabels.required,
                    email   : validateLabels.email
                });
                $.each( info_get, function (index, value) {
                    value = (index == 'email') ? value.replace('%40', '@') : value;
                    $('input[name="'+index+'"]').val(value)
                });
                $.validator.addMethod('validate_portal_code', function( value, element, params ){
                    return ruleBasedOnPromise(
                        this,
                        value,
                        element,
                        $.Deferred(function (prom) {

                            if (!value.length)
                            {
                                return prom.resolve(false);
                            }
                            var parameters = {};

                            return $.when( that.validatePortal( value ) ).done(function (data) {
                                return prom.resolve( data );
                            });

                        }),
                        validateLabels.validatePortalCode
                    );
                },
                validateLabels.validatePortalCode);

                $.validator.addMethod( 'accepted_email', function( value, input ) {
                    var email = value.toLowerCase();
                    return ( email.indexOf('gmail') > -1 || email.indexOf('outlook') > -1 || email.indexOf('hotmail')    > -1 || email.indexOf('yahoo') > -1 ||
                             email.indexOf('inbox') > -1 || email.indexOf('icloud')  > -1 || email.indexOf('mail')       > -1 || email.indexOf('aol')   > -1 ||
                             email.indexOf('zoho')  > -1 || email.indexOf('yandex')  > -1 || email.indexOf('protonmail') > -1 ) ? false : true;
                },
                validateLabels.acceptedEmail);

                $.validator.addMethod( 'email_on_system', function( value, element, params ){
                    return ruleBasedOnPromise(
                        this,
                        value,
                        element,
                        $.Deferred(function (prom) {

                            if (!value.length)
                            {
                                return prom.resolve(false);
                            }
                            var parameters = {};

                            return $.when( that.validateEmail( value ) ).done(function (data) {
                                return prom.resolve( data );
                            });

                        }),
                        validateLabels.emailOnSystem
                    );
                },
                validateLabels.emailOnSystem);

                $.validator.addMethod("alphanumeric", function(value, element) {
                    return this.optional(element) || /^\w+$/i.test(value);
                }, validateLabels.alphanumeric);

                $.validator.addMethod("alphanumericwith_spaces", function(value, element) {
                    return this.optional(element) || /^[a-z\d\s.&]+$/i.test(value);
                }, validateLabels.alphanumericWithSpaces);

                $.validator.addMethod("employee_selector", function(value, element) {
                    return value != "false";
                }, validateLabels.employeeSelector);

                $('.creator-wrapper__lms-form').validate({
                    onkeyup: false,
                    normalizer: function( value ) {
                        return $.trim( value );
                    },
                    rules: {
                        name: "required",
                        portal_code: {
                            required: true,
                            onkeyup: false,
                            alphanumeric: true,
                            validate_portal_code: true
                        },
                        portal_name: {
                            required: true
                        },
                        email: {
                            required: true,
                            onkeyup: false,
                            email: true,
                            accepted_email : that.isAllowed,
                            email_on_system: that.isAllowed
                        },
                        first_name: {
                            required: true,
                            alphanumericwith_spaces: true
                        },
                        last_name: {
                            required: true,
                            alphanumericwith_spaces: true
                        },
                        position: {
                            required: true,
                            alphanumericwith_spaces: true
                        },
                        employees: {
                            required: true,
                            employee_selector: true
                        },
                        terms: {
                            required: true
                        }

                    },
                    errorPlacement: function (error, element) {
                        element.parent().find('.validate-error').remove();
                    },
                    showErrors: function(map, list) {
                        this.defaultShowErrors();           // calls the default function
                                                            // after which we can add our changes
                        // $('span.validate-error').remove();
                        $.each(map, function(index, value) {
                            var tag = index == 'employees' ? 'select': 'input';
                            $( tag+'[name="'+index+'"]' ).parent().append('<span class="validate-error">'+value+'</span>');
                        });
                    },
                    validClass: 'valid',
                    success: function ( label ) {
                        label.addClass('valid');
                        // removeError( label );
                    },
                    submitHandler: function ( form, event ) {
                        event.preventDefault();
                        var buttons = that.getMui().buttonLabel;
                        var validatorLabels = that.getValidateLabels();
                        $('form.creator-wrapper__lms-form input[type="submit"] ').prop( 'value', buttons.wait );
                        $('form.creator-wrapper__lms-form input, form.creator-wrapper__lms-form select').prop('disabled', true );
                        if( that.isAllowed ) {
                            var data = that.defineFormData(form );
                            that.remoteCall(new CallPost('accounts/lms', data, function (resp) {
                                if( resp.response.result == 1 ) {
                                    $('form.creator-wrapper__lms-form').addClass( 'none' );
                                    $( 'div.creator-wrapper__message-container' ).empty();
                                    $( 'div.creator-wrapper__message-container' ).html( '<div class="creator-wrapper__success-label">' + validatorLabels.successMsg + '</div>' );
                                } else {
                                    $( 'div.creator-wrapper__message-container' ).empty();
                                    $( 'div.creator-wrapper__message-container' ).html( '<div class="creator-wrapper__error-label">' + validatorLabels.errorMsg + '</div>' );
                                    $( 'form.creator-wrapper__lms-form input[type="submit"]' ).prop( 'value', validatorLabels.formButton );
                                    $( 'form.creator-wrapper__lms-form input, form.creator-wrapper__lms-form select' ).prop('disabled', false );
                                }
                            })).fail( function ( a ) {
                                console.log( a );
                            });
                        } else {
                            that.onSubmitForm( form, event );
                        }

                        return false;
                    }
                });

            };
            this.onSend                 = function () {
                var validatorLabels = that.getValidateLabels();
                $( 'form.creator-wrapper__lms-form input[type="submit"]' ).prop( 'value', validatorLabels.formButton );
                $( 'form.creator-wrapper__lms-form input, form.creator-wrapper__lms-form select' ).prop( 'disabled', false );
                $( 'form.creator-wrapper__lms-form select' ).val( 'false' );
                $( 'form.creator-wrapper__lms-form' ).validate().resetForm();
            };
            this.defineFormData         = function ( form ) {
                var formData            = {};
                if( this.isAllowed ) {
                    $( form ).find('input, select').each( function (index, input ) {
                        formData[input.name] = input.value;
                    });
                } else {
                    $( form ).find('input[type="text"], input[type="email"],textArea, select').each(function () {
                        formData[$(this).prop('name')] = $(this).val();
                    });
                }
                return formData;
            };
            this.getVariables           = function () {
                var params={};location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(s,k,v){params[k]=v});
                return params;
            };
        }
        SignUpLms.prototype = Object.create(Page.prototype);
        SignUpLms.prototype.constructor = SignUpLms;

        return SignUpLms;
    }
);
