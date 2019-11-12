;define(['jquery', 'lib/FormPage', 'lib/CallGet', 'lib/CallPost', 'jquery.ccValidator', 'jquery.inputmask'], function ($, FormPage, CallGet, CallPost) {

    function SignUp() {

        FormPage.call(this);

        const TRIAL = 10;

        let data = {},
            target,
            formSelector = '#requestForm',
            regData = {
                validCard: false
            };

        const REQUEST = '#request',
            FORM = '#request-form',
            CONTAINER = '#SignContent';


        const that = this;

        this.getClassName             = () => 'SignUp';

        this.defineType               = () => this.urlParts.categories[0];

        this.defineSelector           = () => formSelector;

        this.defineEmailType          = () => {

            return 'portals/' + this.getPortalName() + '/sign_up';
        };

        this.ctrlSignContent          = node => {

            target = node.attr('id');

            let pageTemplate = null,
                formTemplate;

            // Moving to the SignUp forms if the user is not from US
            if( this.defineType() === 'individual-plans' && localStorage.getItem('UserLocation') !== 'US' ){
              let newUrl = [location.protocol, '//', location.host].join('') +"/"+ this.getLanguage() +"/signUp/type/individual";
              window.location.href = newUrl;
            }

            $.when(
                this.getPageMui(),
                this.getLocalSettings(),
                (() => {
                    //request label for form title, always english
                    let def = $.Deferred();

                    this.remoteCall(new CallGet('mui/0www/0en/', {
                        groups: 'Pages-SignUp',
                        code: 'all',
                        nested: true,
                        '_': this.config.LocalStorageStamp
                    }, (res) => {
                        def.resolve(res.response.SignUp[this.defineType()]);

                    }).asCached().asLocalCached());

                    return def.promise();
                })(),

                (() => {
                    //load request form if set request type
                    let type = this.defineType();

                    if (isEmpty(type)) {
                        $.when(this.outContentPromise).done(() => {
                            $('#signUpTypes').removeClass('hidden');
                        });
                        return $.when();
                    } else {
                        return this.loadTemplate('ui/products/' + this.defineType(), function (html) {
                              pageTemplate = html;
                        });
                    }
                })(),
                this.loadTemplate('ui/requestForm', function (html) {

                    formTemplate = html;

                })
            ).then((mui, settings, formMui) => {

                $.extend(data, {
                        mui
                    },
                    this.getMainData().mui, {
                        formMui: formMui
                    },
                    settings
                );

                data.isSignUp = true;
                data.section = 'signUp';

                data.businessForm = this.defineType() === 'business';

                if (data.prices) {

                    data.formattedPrices = this.formatPrices(data.prices)

                }

                $.when(this.outContentPromise, this.loadStylesPromise).then(() => {
                    if (pageTemplate) {
                        this.renderTo(pageTemplate, $.extend({}, this.getMainData(), data), '#' + target);
                    }
                    this.renderTo(formTemplate, $.extend({}, this.getMainData(), data), FORM);

                    if (!data.isUS) {
                        $(REQUEST).show(0);
                    }

                    this.setHeaderContent();
                    this.setHandlers();
                    this.assignPageHandlers('#' + target, this);
                    this.assignInputMask();
                });
            })

        };

        // Appends additional data within the head tag
        this.setHeaderContent         = function () {
          var headerProm = $.Deferred();
          if( this.defineType() === 'individual-plans' ){
            var robots = $('meta[name=robots]').attr("content");
            if( robots != 'noindex' || robots != 'noindex,nofollow' ){
              $("head").append('<meta name="robots" content="noindex" />');
            }
          }
          return headerProm.resolve({});
        };

        this.assignInputMask          = () => {

            // $('#request-form-phone').inputmask('(999) 999-9999',{
            //     showMaskOnHover:false,
            //     showMaskOnFocus: false
            // });
            $('#request-form-ext').inputmask('Regex', {
                regex: "^[0-9]{1,6}(\\.\\d{1,2})?$"
            });
        };

        this.formatPrices             = prices => {

            prices.yearly         = prices.yearly / 12;

            $.each(prices, function (index, price) {
                price = parseFloat(price);

                // console.log("price: ")
                // console.log(price)
                let unit = parseInt(price);
                // console.log("unit: ")
                // console.log(unit)
                let decimal = Math.round((price * 100) - (unit * 100));

                // console.log("decimal: ")
                // console.log(decimal)

                prices[index] = {
                    value: price,
                    unit: unit,
                    decimal: '.' + decimal
                };

            });

            return prices;

        };

        this.defineContent            = () => {

            return this.getPageMui().then((data) => {
                this.setContentData(data);
            });

        };

        this.getLocalSettings         = () => {

            let promise = $.Deferred();
            const that = this;

            if( this.defineType() !== 'individual-plans' && this.defineType() !== 'business' ){
                return promise.resolve({});
            }

            var visitorLocalsettings = JSON.parse(localStorage.getItem("visitorLocalsettings"));

            if (deepInObject(visitorLocalsettings, 'ipInfo.country')) {
                let settings = {
                    prices: visitorLocalsettings.settings.prices,
                    isUS: that.isCountryAllowedAction(visitorLocalsettings)
                };

                promise.resolve(settings);
            } else {
                this.remoteCall(new CallGet('visitor/localsettings/', {}, (r) => {
                    localStorage.setItem("visitorLocalsettings", JSON.stringify(r.response));
                    let settings = {
                        prices: r.response.settings.prices,
                        isUS: that.isCountryAllowedAction(r)
                    };

                    promise.resolve(settings);

                }).defineErrorHandler(function (query, status) {

                    promise.reject(that.E_SERVER, this);
                }));
            }

            return promise;
        };

        this.onSwitchBenefits         = (node, event) => {

            event.preventDefault();

            let list = $(node).closest('[data-benefits="list"]'),
                hidden = list.find('[data-benefits="hidden"]'),
                switcher = list.find('[data-benefits="switch"]');

            switcher.toggleClass('hidden');
            hidden.slideToggle()

        };

        this.onShowFreeForm           = (node, event) => {

            event.preventDefault();

            $(REQUEST).slideDown();
            this.scrollTo(REQUEST, 120);

        };

        this.onShowCreateAccountForm  = (node, event) => {

            event.preventDefault();

            formSelector = '#create-account-form';

            $.extend(regData, {
                'type': this.defineType(),
                'plan': $(node).data('plan'),
                'price': data.prices[$(node).data('plan')].value,
                'notrial': this.defineType() === 'individual' ? '' : 1
            });

            let tmpl;

            $.when(
                this.loadTemplate('ui/createAccountForm', function (html) {

                    tmpl = html;

                })
            ).then(() => {

                let options = {
                    isBusiness: this.defineType() === 'business'
                };

                $.extend(data, options);

                this.renderTo(tmpl, data, CONTAINER);
                this.setHandlers();
                this.assignPageHandlers('#' + target, this);
                window.scrollTo(0, 0)

            })

        };

        this.onSubmitCreateForm       = (form, event) => {

            event.preventDefault();

            this.switchForm(form);

            let emails = $(form).find('[name="email"]').val(),
                params = {
                    emails
                };

            this.remoteCall(new CallGet(
                '/accounts/available-emails',
                params,
                (res) => {

                    this.switchForm(form);

                    if (res.response.unavailable.length) {

                        this.showAlert(emails + ' is unavailable', true);
                        $(form).find('[name="email"]').val('');

                        return;

                    }

                    $.extend(regData, this.defineFormData(form));
                    this.clearForm(form);
                    this.onShowPayForm();
                }
            ));
        };

        this.onShowPayForm            = (overrideData) => {

            formSelector = '#pay-form';

            let tmpl,
                isBusiness = overrideData ? false : this.defineType() === 'business';

            $.when(
                this.loadTemplate('ui/payForm', function (html) {

                    tmpl = html;

                })
            ).then(() => {

                let options = {
                    isBusiness
                };

                if (overrideData) {

                    target = overrideData.target;
                    regData['email'] = overrideData.email;
                    regData['password'] = overrideData.password;
                    regData['landing'] = overrideData.landing ? overrideData.landing : null;
                    regData['plan'] = overrideData.plan;
                    $.extend(data, overrideData);

                } else {
                    if (regData.plan == 'yearly') regData.price = regData.price * 12;

                    options['licenses'] = isBusiness ? 5 : 1;
                    options['totalPrice'] = regData.price * options['licenses'];
                    options['subscriptionPeriod'] = regData.plan === 'monthly' ? data.mui.subPeriod.monthly : data.mui.subPeriod.annual;
                    options['paymentPeriod'] = regData.plan === 'monthly' ? data.mui.payPeriod.month : data.mui.payPeriod.year;
                    options['chargeDate'] = regData.notrial ? `${data.mui.today} (${this.defineChargeDate()})` : `${data.mui.on} ${this.defineChargeDate()}`;
                    options['accountPageType'] = regData.type === 'individual' ? data.mui.accountPage.account : data.mui.accountPage.admin;
                }

                $.extend(data, options);

                this.renderTo(tmpl, data, CONTAINER);
                this.setHandlers();
                this.assignPageHandlers('#' + target, this);
                this.setPayHandlers();
                window.scrollTo(0, 0)

            })

        };

        this.setPayHandlers           = () => {

            var that = this;

            let ccNumber = $('#cc_number'),
                ccExpiryDate = $('#cc_expiry_date'),
                ccCvv = $('#cc_cvv'),
                zipcode = $('#zipcode'),
                cards = $('#cards'),
                discountCode = $('#discountCode');

            discountCode.on('change', () => {
                var code = discountCode.val();
                if (!code) {
                    var originaltotalcost = parseFloat($("#originaltotalcost").val())
                    that.setTotalPrice(originaltotalcost);
                    that.discountCodeError(false)
                    return;
                }
                $.ajax({
                        url: this.config.APIUrlv1 + "affiliates/discounts/0" + code
                    })
                    .always(function (response) {
                        if (response.status == "OK") {
                            that.discountCodeError(false)
                            var discountRate = parseFloat(response.response.discount_rate)
                            var originaltotalcost = parseFloat($("#originaltotalcost").val())
                            var newCost = Math.round(originaltotalcost * (1 - discountRate) * 100) / 100;
                            that.setTotalPrice(newCost);
                        } else {
                            that.discountCodeError(true)
                        }
                    });



            });

            let cvvOptions = {
                placeholder: '',
                oncomplete: () => {
                    zipcode.focus();
                }
            };

            ccNumber.inputmask('9999 9999 9999 9999', {
                placeholder: '',
                showMaskOnHover: false,
                showMaskOnFocus: false,
            });

            ccNumber.validateCreditCard((res) => {

                if (res.valid && ccNumber.inputmask('isComplete')) {

                    regData.cc_type = res.card_type.name;
                    regData.validCard = true;


                    cards.attr('class', `cards ${regData.cc_type}`);

                    if (regData.cc_type === 'amex') {

                        ccCvv.inputmask('9999', cvvOptions)

                    }

                    ccExpiryDate.focus();

                } else {

                    cards.attr('class', `cards`);
                    ccCvv.inputmask('999', cvvOptions);
                    regData.validCard = false;

                }

            });

            ccExpiryDate.inputmask('99/99', {
                placeholder: '',
                showMaskOnHover: false,
                showMaskOnFocus: false,
                oncomplete: () => {
                    ccCvv.focus();
                }
            });

            ccCvv.inputmask('999', cvvOptions);

            zipcode.inputmask('99999', {
                placeholder: ''
            });

            let up = $('#spinner-up'),
                down = $('#spinner-down'),
                users = $('#num_users');

            up.on('click', () => {

                let newVal = +users.val() + 1;

                users.val(newVal);

                this.updateTotalPrice(newVal);


            });

            down.on('click', () => {

                if (+users.val() > 5) {

                    let newVal = +users.val() - 1;

                    users.val(newVal);
                    this.updateTotalPrice(newVal);
                }

            });


        };

        this.discountCodeError        = (error) => {
            if (error)
                $(".signupdiscountCode").addClass('error')
            else
                $(".signupdiscountCode").removeClass('error')
        }

        this.updateTotalPrice         = amount => {

            let totalSum = $('#totalcost'),
                totalSumConditions = $('#totalcost-conditions'),
                newSum = (amount * regData.price).toFixed(2);

            this.setTotalPrice(newSum);

        };

        this.setTotalPrice            = newSum => {

            let totalSum = $('#totalcost'),
                totalSumConditions = $('#totalcost-conditions');

            totalSum.val(`$ ${newSum}`);
            totalSumConditions.text(`$${newSum}`);

        };

        this.onSubmitPayForm          = (form, event) => {

            event.preventDefault();


            if (!regData.validCard) {

                this.showAlert('Card is not valid. Please check');
                return;

            }

            this.switchForm(form);

            $.extend(regData, this.defineFormData(form));
            let options = {

                discountCode: regData.discountCode,
                cc_cvv: regData.cc_cvv,
                cc_expiry_date: regData.cc_expiry_date.replace(/\//g, '20'),
                cc_name: regData.cc_name,
                cc_number: regData.cc_number.replace(/\s/g, ''),
                cc_type: regData.cc_type,
                city: regData.city || 'n/a',
                company: regData.company || 'INDIVIDUAL:' + regData.cc_name,
                country: regData.country,
                course_accessJSON: regData.course_access,
                discount_code: regData.discount_code,
                email: regData.email,
                name_f: this.getNames(regData.cc_name)[0],
                name_l: this.getNames(regData.cc_name)[1],
                notrial: regData.notrial,
                num_users: regData.num_users || 1,
                password: regData.password,
                state: regData.country,
                street: regData.street || 'n/a',
                sub_type: regData.plan === 'monthly' ? 'monthly' : 'annual',
                subscribe: true,
                tna_required: regData.course_access ? null : 1,
                zipcode: regData.zipcode,
                portal_id: this.config.portalID,
                _extend: 'user,tna',
                first_login: 0,
                type: regData.type ? regData.type : 'individual',
                landing: regData.landing ? regData.landing : null

            };

            this.user.signUp(options).done(() => {

                this.updateUserView();

            }).fail((response) => {

                let message = data.error[response.message] ? data.error[response.message] : data.error.unknownError;

                this.showAlert(message, true);

            }).always(() => {

                this.switchForm(form);

            });


        };

        this.onSubmitRequestForm      = (form, event) => {

            event.preventDefault();

        };

        this.getNames                 = name => {

            let nameMatch = name.match(/^(.+?)\s(.+)$/);

            if (nameMatch) {

                return [nameMatch[1], nameMatch[2]]

            }

            return [name, ''];

        };

        this.switchForm               = form => {

            $(form).find('input, button').each(function () {
                $(this).prop('disabled', !$(this).prop('disabled'));
            });
        };

        this.clearForm                = form => {

            $(form).find('input, button').each(function () {
                $(this).val('');
            });
        };

        this.defineFormData           = form => {

            let formData = {};

            $(form).find('input,textarea,select').each(function () {
                formData[$(this).prop('name')] = $(this).val();
            });

            if (formData['ext'] != '') {
                formData['phone'] = formData['phone'] + ' Ext: ' + formData['ext'];
            }
            var fromUS = (
                localStorage.getItem('UserLocation') === 'US' ||
                localStorage.getItem('UserLocation') === 'CA' ||
                localStorage.getItem('UserLocation') === 'MX'
            );

            if (
                fromUS === false &&
                formData.formTitle &&
                formData.formTitle.indexOf('Request Individual Account Information') !== -1
            ) {
                formData.formTitle += ' (international)';
            }
            formData.theme = formData.formTitle;

            return formData;
        };

        this.defineChargeDate         = () => {

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            let date = new Date();
            if (!regData.notrial) {

                date.setDate(date.getDate() + TRIAL);

            }

            return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

        };

        let _getPageMui = this.getPageMui;
        let muiCache    = null;
        this.getPageMui = function () {

            if (muiCache) {
                return $.when(muiCache);
            }

            return _getPageMui.apply(this, arguments)
                .then(function (data) {
                    muiCache = data;
                    return data;
                })

        };

    }

    SignUp.prototype = Object.create(FormPage.prototype);
    SignUp.prototype.constructor = SignUp;

    return SignUp;
});
