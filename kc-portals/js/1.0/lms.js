;define(['jquery', 'lib/Page', 'lib/SendForm', 'lib/CallGet', 'lib/CallPost', 'select2', 'ui/ModalWindow', 'ui/PreviewModal', 'validate', 'owl', 'ui/EmbedVideo'],
	function($, Page, SendForm, CallGet, CallPost, select2, ModalWindow, PreviewModal){

    function lms() {
        SendForm.call(this);
        Page.call(this);
        const that                  = this;
        const validatorLabels       = {};
        this.isAllowed              = false;
				this.blacklist 							= [];
				this.orgSizeLabel 					= "";
				this.isForm                 = false;

        this.getClassName           = function () {
            return 'lms';
        };

        this.defineContent          = function () {
            $.when(this.outContentPromise, this.loadStylesPromise).done(() => {
                this.renderClientsCarousel();
                this.scrollToForm();
                this.setHandlers();
								this.setHeaderContent();
								this.setupScripts();
                //page is now fully loaded and ready.
            });

            return $.when(
                this.getPageMui(),
                this.isCountryAllowed(),
								this.getBlackList(),
                this.getClientsData()
            ).then((mui, isCountryAllowed, bl, clients, isAllowed) => {
                $.extend( mui, {'clients': clients} );
                $.extend( mui, {'isCountryAllowed': false} ); // hardcode isCountryAllowed as FALSE to hide "Try Free" button for all users
                isAllowed = false; // hardcode isAllowed as FALSE to hide the portal creation form for all users
								var formButton = mui.formButton; // Set by default
								//var formButton =  (isAllowed) ? mui.formButton : mui.formButtonNA;
                this.isAllowed = isAllowed;
								this.blacklist = bl;
								this.orgSizeLabel = mui.organizationSize;
                let data = mui;
                $.extend(data, {'isAllowed': isAllowed});
                $.extend( validatorLabels, this.getMui().validatorLabels );
                $.extend( validatorLabels, { 'formButton': formButton } );
                this.setContentData(data);
            });
        };

				// returns the email servers blacklist
				this.getBlackList = function() {
						var prom = $.Deferred();
						$.get(this.config.pathTemplate + '/json/emailcompanyblacklist--v'+this.config.LocalStorageStamp+'.json', blacklist => {
							blacklist = blacklist;
              prom.resolve( blacklist );
            }).fail(() => {
              prom.resolve({});
            });
            return prom;
				};

				// function to insert additional header content
        this.setHeaderContent      	= function () {
            var headerProm = $.Deferred();
            $("head").append('<link rel="stylesheet" href="/js/vendor/select2/select2.min.css" />');
						$("head").append(this.setAnalyticsCode());
            return headerProm.resolve({});
        };

				// function to return analytics scripts to insert on the head tag
        this.setAnalyticsCode       = function () {
          var scripts = '';
            scripts += '<script async src="https://www.googletagmanager.com/gtag/js?id=AW-969100715"></script>'+
            "<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'AW-969100715'); </script>";
          return scripts;
        };

				this.setupScripts          	= function () {
          var promScripts = $.Deferred();
          $('body').ready( function () {
						$('#employees').select2({ placeholder: this.orgSizeLabel, dropdownParent: $('#s2Container') });
						$('#employees').on('select2:select', function(e){ $(this).valid(); });
            promScripts.resolve({});
          });
          return promScripts;
        }

        this.onPlayVideo            = function () {
            this.player();
        };

				this.defineEmailType     		= function () {
           return ( this.isAllowed ) ?'accounts/lms' : 'portals/' + this.getPortalName() + '/contact_signupLms';
        };

				this.defineSelector     		= function () {
            return '#lmsCreator';
        };

				this.getValidateLabels      = function () {
        		return validatorLabels;
        };

				this.validatePortal        	= function ( portal_code ) {
						var prom = $.Deferred();
						this.remoteCall(new CallGet("portals/0" + portal_code, {}, function(response) {
						  var result = (response.code == 200 ) ? false : true;
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
	          // setInterval(function() {
	          //   that.changeIpad();
	          // }, 2000);
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

						$.validator.addMethod('accepted_email', function( value, input ) {
		          var email = value.toLowerCase();
		          var domain = email.split("@");
		          var isBlackListed = that.blacklist.filter( function(bl) {
		              if( bl == "@"+domain[1]){
		                return bl;
		              }
		          });
		          return ( isBlackListed.length > 0 ) ? false : true;
		        }, validateLabels.validateBusinessEmail);

						$.validator.addMethod('validate_domain', function( value, input ) {
		          var email = value.toLowerCase();
		          var domain = email.split("@");
		          if(domain.length == 2 ) {
		            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		            var is_it = re.test(String(email));
		            return is_it;
		          } else {
		            return false;
		          }
		        }, validateLabels.email);

            $.validator.addMethod('email_on_system', function( value, element, params ){
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
            }, validateLabels.emailOnSystem);

						$.validator.addMethod("numeric", function(value, element) {
            	return this.optional(element) || /^\d{10}$/.test(value);
        		}, validateLabels.validatePhoneDigitsUS);

            $.validator.addMethod("alphanumeric", function(value, element) {
                return this.optional(element) || /^\w+$/i.test(value);
            }, validateLabels.alphanumeric);

            $.validator.addMethod("alphanumericwith_spaces", function(value, element) {
                return this.optional(element) || /^[a-z\d\s.&]+$/i.test(value);
            }, validateLabels.alphanumericWithSpaces);

						$.validator.addMethod("full_name", function(value, element) {
                return this.optional(element) || /^[\\p{L} .'-]+$/.test(value);
            }, validateLabels.fullName);

            $.validator.addMethod("employee_selector", function(value, element) {
                return value != "false";
            }, validateLabels.employeeSelector);

            $('.creator-wrapper__lms-form').validate({
								/* ignore - It will enable hidden field validation */
								ignore: [],
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
										full_name: {
                        required: true,
												/*full_name: true*/
                    },
										position: {
                        required: true,
                        alphanumericwith_spaces: true
                    },
                    email: {
                        required: true,
                        onkeyup: false,
                        email: true,
												accepted_email: true,
												validate_domain: true,
                        email_on_system: that.isAllowed
                    },
										phone_number: {
                        required: true,
												alphanumeric: true
                    },
										organization_name: {
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
										// Modifying the span.select2 classes
										if( element[0].tagName == 'SELECT' ){
											$('.creator-wrapper__form-row .select2.select2-container').removeClass('error').addClass('valid');
										}
                    element.parent().find('.validate-error').remove();
                },
                showErrors: function(map, list) {
                    this.defaultShowErrors();           // calls the default function
                                                        // after which we can add our changes
                    // $('span.validate-error').remove();
  									$.each(map, function(index, value) {
                        var tag = index == 'employees' ? 'select': 'input';
												// Finding the select2 span
												if( index === 'employees' ){
													$('.creator-wrapper__form-row .select2.select2-container').addClass('error').removeClass('valid');
												}
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
                    $('form.creator-wrapper__lms-form input[type="submit"] ').prop( 'value', buttons.wait );
                    $('form.creator-wrapper__lms-form input, form.creator-wrapper__lms-form select, form.creator-wrapper__form-row .select2.select2-container').prop('disabled', true );
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
                                $( 'form.creator-wrapper__lms-form input[type="submit"]' ).prop( 'value', formButton );
                                $( 'form.creator-wrapper__lms-form input, form.creator-wrapper__lms-form select, form.creator-wrapper__form-row .select2.select2-container' ).prop('disabled', false );
                            }
                        })).fail( function ( a ) {
                            console.log( a );
                        });
                    } else {
                        $.when( that.onSubmitForm( form, event ) ).done( function(){
							            gtag('event', 'conversion', { 'send_to': 'AW-969100715/pMyoCI6q-qoBEKubjc4D'} );
							          });
                    }

                    return false;
                }
            });

            $('[data-handler="onScrollNode"][data-to="#full_name"]').on('click', function(){
                $("#full_name").focus()
            });
        };

				this.onSend                 = function () {
            var validatorLabels = that.getValidateLabels();
            $( 'form.creator-wrapper__lms-form input[type="submit"]' ).prop( 'value', validatorLabels.formButton );
            $( 'form.creator-wrapper__lms-form input, form.creator-wrapper__lms-form select, form.creator-wrapper__form-row .select2.select2-container' ).prop( 'disabled', false );
            $( 'form.creator-wrapper__lms-form select' ).val( 'false' );
						$( '#employees' ).val('false').trigger("change");
						$( '.select2.select2-container' ).removeClass('valid');
            $( 'form.creator-wrapper__lms-form' ).validate().resetForm();
        };

				this.defineFormData         = function ( form ) {
            var formData            = {};
            if( this.isAllowed ) {
                $( form ).find('input, select').each( function (index, input ) {
                    formData[input.name] = input.value;
                });
            } else {
                $( form ).find('input[type="text"], input[type="email"], textArea, select').each(function () {
                    formData[$(this).prop('name')] = $(this).val();
                });
            }
            return formData;
        };

        this.getVariables           = function () {
            var params={};location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(s,k,v){params[k]=v});
            return params;
        };

        // this.changeIpad             = function () {
        //     var p = $('.bg-mainipad').data('position');
        //     $('.bg-mainipad').removeClass('ipad-'+p);
        //     if(p == 3) p = 1;
        //     else p++;
        //     $('.bg-mainipad').addClass( 'ipad-' + p );
        //     $('.bg-mainipad').data( 'position', p );
        // };

        this.getClientsData         = function () {
            let prom = $.Deferred();

            $.get(this.config.pathTemplate + '/json/clients--v'+this.config.LocalStorageStamp+'.json',

                clients => {


                    if (typeof  clients === 'string') {

                        clients =  $.parseJSON(clients);
                    }

                    prom.resolve(this.handleClientsData(clients))
                }).fail(() => {
                    prom.resolve({});
                });

            return prom;

        };

				this.handleClientsData      = function ( clients ) {

            return clients.map(client => {

                let data = {
                    logo: `${this.getMainData().IMG}clients/logos/${client.name}${!client.company || typeof client.company === 'undefined' ? '' : '-' + this.getLanguage()}--v${this.config.LocalStorageStamp}.png`,

                };

                if(client.company){
                    data.name   = client.company[page.getLanguage()];
                    data.height = 50;
                }

                if (client.title) {
                    data.title = typeof client.title === 'string' ? client.title : client.title[this.getLanguage()]
                }

                return data;

            });

        };

				this.renderClientsCarousel 	= () => {

            const target = '#clientsCarousel';

            $(target).owlCarousel({
                loop: true,
                margin: 20,
                speed: 1500,
                dots: true,
                slideBy: 'page',
                responsive: {
                    0:{
                        items: 2
                    },
                    400: {
                        items: 3
                    },
                    700: {
                        items: 5
                    },
                    1000 : {
                        items: 6
                    }
                }
            });
        };

				this.onPrevClients 					= function() {
            $('#clientsCarousel').trigger('prev.owl.carousel');
        };

				this.onNextClients 					= function() {
            $('#clientsCarousel').trigger('next.owl.carousel');
        };

				this.onShowVideo        		= function ( node, event ) {

            var selector            = '#videoWindow';
            var $alert              = $(selector);
            if( this.checkMobileNav() ) {
                window.open('https://fileshare.knowledgecity.com/vids/lms/'+this.getLanguage()+'/welcome/welcome.mp4', '_blank');
                return;
            }
            if($alert.length === 0) {

                console.error('Template error: #videoWindow is not defined on the page!');
                alert(message);
                return;
            }

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.8,
                isAlert:        false,
                isBlocking:     true,
                isConfirming:   false
            });


            modalWindow.show().then( function () {

                $alert = $( selector + '.cloned' );
                var component           = new EmbedVideo(that,$alert);
                component.videoResource = 'https://fileshare.knowledgecity.com/vids/lms/'+that.getLanguage()+'/welcome/welcome.mp4';
                component.ccResource = 'https://fileshare.knowledgecity.com/vids/lms/es/welcome/welcome.vtt';
                component.player();
                modalWindow.onRepositionModal($alert);

                $alert.find('[rel^=closeModal]').bind('click', function () {
                    $alert.find('#welcome_video').empty();
                    modalWindow.close();
                });

            });
        };

    }
    lms.prototype               		= Object.create(Page.prototype);
    lms.prototype.constructor   		= lms;
    return lms;
});
