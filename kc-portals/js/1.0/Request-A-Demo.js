;define(['jquery', 'lib/FormPage', 'lib/CallGet', 'lib/CallPost', 'jquery.ccValidator', 'jquery.inputmask', 'select2'], function($, FormPage, CallGet, CallPost){

    function RequestADemo() {

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
              CONTAINER = '#RequestADemoContent';

        const that                        = this;

        this.getClassName                 = () => 'RequestADemo';

        this.defineType                   = () =>  this.urlParts.categories[0];

        this.defineSelector               = () => formSelector;

        this.isForm                       = false;

        this.defineEmailType              = function () {
            return 'portals/' + this.getPortalName() + '/request_a_demo';
        };

        this.ctrlRequestADemoContent      = node => {

            target = node.attr('id');

            let pageTemplate = null,
                formTemplate;

            $.when(
                this.getPageMui(),
                this.getLocalSettings(),
                (() => {
                    //request label for form title, always english
                    let def = $.Deferred();

                    this.remoteCall(new CallGet('mui/0www/0en/', {groups: 'Pages-RequestADemo', code: 'all', nested: true, '_': this.config.LocalStorageStamp}, (res) => {
                        def.resolve(res.response.RequestADemo[this.defineType()]);
                    }).asCached().asLocalCached() );

                    return def.promise();
                })(),

                (() => {

                    let type = this.defineType();

                    if(isEmpty(type)){
                        $.when(this.outContentPromise).done(() => {
                            $('#requestDemoTypes').removeClass('hidden');
                        });
                        return $.when();
                    } else {
                        return this.loadTemplate('ui/request_a_demo/' + this.defineType(), function (html) {
                            pageTemplate = html;
                        });
                    }
                })(),
                this.loadTemplate('ui/requestADemoForm', function (html) {
                    formTemplate = html;
                })
            ).then((mui, settings, formMui) => {

                $.extend( data,
                    {mui},
                    this.getMainData().mui,
                    {formMui: formMui},
                    settings
                );

                data.isRequestADemo = true;
                data.section        = 'Request-A-Demo';

                data.businessForm = this.defineType() === 'business';

                if( data.prices ){
                    data.formattedPrices = this.formatPrices(data.prices)
                }

                if( pageTemplate ){ this.isForm = true; }

                $.when( this.outContentPromise, this.loadStylesPromise, that.setHeaderContent() ).then(() => {

                    if( pageTemplate ){
                        this.renderTo(pageTemplate, $.extend({}, this.getMainData(), that.setupScripts(), data), '#' + target);
                    }
                    this.renderTo(formTemplate, $.extend({}, this.getMainData(), that.setupScripts(), data), FORM);

                    if (!data.isUS) {
                        $(REQUEST).show(0);
                    }

                    that.setOfflineConversionTracking();
                    this.setHandlers();
                    this.assignPageHandlers('#' + target, this);
                    this.assignInputMask();
                });
            })
        };

        // function to insert additional header content
        this.setHeaderContent             = function () {
            headerProm = $.Deferred();
            if( this.isForm ){
              $("head").append('<link rel="stylesheet" href="/js/vendor/select2/select2.min.css" />');
            }
            $("head").append(this.setAnalyticsCode());
            return headerProm.resolve({});
        };

        // function to return analytics scripts to insert on the head tag
        this.setAnalyticsCode             = function () {
          var scripts = '';
          if( data.isRequestADemo ){
            scripts += '<script async src="https://www.googletagmanager.com/gtag/js?id=AW-969100715"></script>'+
            "<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'AW-969100715'); </script>";
          }
          return scripts;
        };

        this.setupScripts                 = function () {
          var promScripts = $.Deferred();
          $('body').ready( function () {
            if( data.isRequestADemo ){
              $('#request-form-company-size').select2();
            }
            promScripts.resolve({});
          });
          return promScripts;
        }

        this.assignInputMask              = () => {
            // $('#request-form-phone').inputmask('(999) 999-9999',{
            //     showMaskOnHover:false,
            //     showMaskOnFocus: false
            // });
            //$('#request-form-ext').inputmask( 'Regex', { regex: "^[0-9]{1,6}(\\.\\d{1,2})?$" } );
        };

        this.formatPrices                 = prices => {

            prices.yearly = prices.yearly/12;

            $.each(prices, function (index, price) {
                price = parseFloat(price);
                let unit = parseInt(price);
                let decimal = Math.round((price * 100) - (unit * 100));
                prices[index] = {
                    value: price,
                    unit: unit,
                    decimal: '.' + decimal
                };
            });

            return prices;

        };

        this.defineContent                = () => {
            return this.getPageMui().then((data) => {
                this.setContentData(data);
            });
        };

        this.getLocalSettings             = () => {

            let promise = $.Deferred();
            const that             = this;

            if( this.defineType() !== 'individual' && this.defineType() !== 'business' ){
                return promise.resolve({});
            }

            var visitorLocalsettings = JSON.parse(localStorage.getItem("visitorLocalsettings"));

            if( deepInObject( visitorLocalsettings, 'ipInfo.country' ) ){
                let settings = {
                    prices: visitorLocalsettings.settings.prices,
                    isUS: that.isCountryAllowedAction(visitorLocalsettings)
                };
                promise.resolve(settings);
            } else {
                this.remoteCall( new CallGet('visitor/localsettings/',
                    {}, (r) => {
                        localStorage.setItem("visitorLocalsettings", JSON.stringify(r.response));
                        let settings = {
                            prices: r.response.settings.prices,
                            isUS: that.isCountryAllowedAction(r)
                        };
                        promise.resolve(settings);
                    }
                ).defineErrorHandler(function (query, status) {
                    promise.reject(that.E_SERVER, this);
                }));
            }

            return promise;
        };

        this.defineFormData               = form => {

            let formData        = {};

            $(form).find('input,textarea,select').each(function () {
                formData[$(this).prop('name')] = $(this).val();
            });

            if( formData[ 'ext' ] != '' ) {
                formData[ 'phone' ] = formData[ 'phone' ] + ' Ext: ' + formData['ext'];
            }
            var fromUS = (
                localStorage.getItem('UserLocation') === 'US' ||
                localStorage.getItem('UserLocation') === 'CA' ||
                localStorage.getItem('UserLocation') === 'MX'
                );

            if(
                fromUS===false &&
                formData.formTitle &&
                formData.formTitle.indexOf('Request Individual Account Information') !== -1
                ){
                formData.formTitle += ' (international)';
            }
            formData.theme = formData.formTitle;

            return formData;
        };

        this.onSubmitRequestForm          = (form, event) => {
          $.when( this.onSubmitForm( form, event ) ).done( function(){
            // Send the gtag value
            gtag('event', 'conversion', { 'send_to': 'AW-969100715/dM9XCMHvkqkBEKubjc4D'} );
          });
        };

        // Google Offline conversion Tracking functions
        this.getParam                         = function ( p ) {
          var match = RegExp('[?&]' + p + '=([^&]*)').exec(window.location.search);
          return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        }

        this.getExpiryRecord                  = function ( value ) {
          var expiryPeriod = 90 * 24 * 60 * 60 * 1000; // 90 day expiry in milliseconds
          var expiryDate = new Date().getTime() + expiryPeriod;
          return { value: value, expiryDate: expiryDate };
        }

        this.addGclid                         = function () {

          var gclidParam = that.getParam('gclid');
          var gclidFormFields = ['gclid_field']; // all possible gclid form field ids here
          var gclidRecord = null;
          var currGclidFormField;

          var gclsrcParam = that.getParam('gclsrc');
          var isGclsrcValid = !gclsrcParam || gclsrcParam.indexOf('aw') !== -1;

          gclidFormFields.forEach(function (field) {
            if (document.getElementById(field)) {
              currGclidFormField = document.getElementById(field);
            }
          });

          if (gclidParam && isGclsrcValid) {
            gclidRecord = that.getExpiryRecord(gclidParam);
            localStorage.setItem('gclid', JSON.stringify(gclidRecord));
          }

          var gclid = gclidRecord || JSON.parse(localStorage.getItem('gclid'));
          var isGclidValid = gclid && new Date().getTime() < gclid.expiryDate;

          if (currGclidFormField && isGclidValid) {
            currGclidFormField.value = gclid.value;
          }

        }

        this.setOfflineConversionTracking     = function () {
          var prom = $.Deferred();
          that.addGclid();
          prom.resolve({});
          return prom;
        };

        let _getPageMui             = this.getPageMui;
        let muiCache                = null;
        this.getPageMui             = function () {
            if(muiCache){
                return $.when(muiCache);
            }
            return _getPageMui.apply(this, arguments)
                .then(function (data) {
                    muiCache = data;
                    return data;
                })
        };

    }

    RequestADemo.prototype               = Object.create(FormPage.prototype);
    RequestADemo.prototype.constructor   = RequestADemo;

    return RequestADemo;
});
