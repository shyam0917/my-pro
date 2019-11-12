;define(['jquery'], function ($) {

      function disableAutoFilling () {
        var realPassword = [];
        var realFields = [];
        var realids = [];

        // An Object for Helper functions.
        var _helper = {};

        // Extend the Array: add "insert" function.
        Array.prototype.insert = function (index, item) {
            this.splice(index, 0, item);
        };

        /**
         * Helper function - passwordListener
         * - Hide the original password string.
         *
         * @param {object} obj      jQuery DOM object (form)
         * @param {object} settings plugin settings.
         */
        _helper.passwordListener = function(obj, settings) {
            var passObj = (settings.passwordField == '') ? '.disabledAutoFillPassword' : settings.passwordField;
            if (obj.find('[data-type=password]').find('input').length > 0) {
                obj.find('[data-type=password]').find('input').addClass('disabledAutoFillPassword');
            }

            obj.on('keyup', passObj, function() {
                var tmpPassword = $(this).val();
                var passwordLen = tmpPassword.length;

                // Get current keyup character position.
                var currKeyupPos = this.selectionStart;

                for (var i = 0; i < passwordLen; i++) {
                    if (tmpPassword[i] != '*') {
                        if (typeof realPassword[i] == 'undefined') {
                            realPassword[i] = tmpPassword[i];
                        } else {
                            if (currKeyupPos != passwordLen) {
                                realPassword.insert(currKeyupPos - 1, tmpPassword[i]);
                            }
                        }
                    }
                }

                $(this).val(tmpPassword.replace(/./g, '*'));

                if (settings.debugMode) {
                    console.log('Current keyup position: ' + currKeyupPos);
                    console.log('Password length: ' + passwordLen);
                    console.log('Real password:');
                    console.log(realPassword);
                }
            });
        }

        /**
         * Helper function - formSubmitListener
         * - Replace submit button to normal button to make sure everything works fine.
         *
         * @param {object} obj      jQuery DOM object (form)
         * @param {object} settings plugin settings.
         */
        // _helper.formSubmitListener = function(obj, settings) {
        //     var btnObj = (settings.submitButton == '') ? '.disableAutoFillSubmit' : settings.submitButton;
        //
        //     obj.on('click', btnObj, function(event) {
        //         _helper.restoreInput(obj, settings);
        //
        //         if (settings.callback.call()) {
        //             if (settings.debugMode) {
        //                 console.log(obj.serialize())
        //             } else {
        //                 // Native HTML form validation requires "type=submit" to work with.
        //                 if (settings.html5FormValidate) {
        //                     $(btnObj).attr('type', 'submit').trigger('submit');
        //                     // Change "type=submit" back to "type=button".
        //                     setTimeout(function() {
        //                         $(btnObj).attr('type', 'button');
        //                     }, 1000);
        //
        //                 } else {
        //                     obj.submit();
        //                 }
        //             }
        //         }
        //     });
        // };

        /**
         * Helper function - ramdomizeInput
         * - Add random chars on "name" attribute to avid Browser remember what you submitted before.
         *
         * @param {object} obj      jQuery DOM object (form)
         * @param {object} settings plugin settings.
         */
        _helper.randomizeInput = function(obj, settings) {
            obj.find('input').each(function(i) {
                if($(this).attr('type') != 'submit') {
                    realFields[i] = $(this).parent().data('name');
                    realids[i]    = $(this).parent().data('id');
                }
            });
        };

        /**
         * Helper function - restoreInput
         * - Remove random chars on "name" attribute, so we can submit correct data then.
         * - Restore password from star signs to original input password.
         *
         * @param {object} obj      jQuery DOM object (form)
         * @param {object} settings plugin settings.
         */
        _helper.restoreInput = function(obj, settings) {

            if (settings.randomizeInputName) {
                obj.find('input').each(function(i) {
                  if($(this).attr('type') != 'submit') {
                      $(this).attr('name', realFields[i]);
                      $(this).attr('id', realids[i]);
                  }
                });
            }
            if (settings.textToPassword) {
                obj.find(settings.passwordField).attr('type', 'password');
            }

            obj.find(settings.passwordField).val(realPassword.join(''));
        };


        this.defaults = {
            debugMode: false,
            textToPassword: true,
            randomizeInputName: true,
            passwordField: '',
            html5FormValidate: false,
            submitButton: '',
            callback: function() {
                return true;
            },
        };

        /**
         * Core function
         */
        this.disableAutoFill = function( node, options) {
            var settings = $.extend(
                {},
                this.defaults,
                options
            );

            var form = typeof node == 'string' ? $(node) : typeof node == 'object'? node : false;

            if(!form) {
              return false;
            }

            // Add autocomplete attribute to form, and set it to 'off'
            form.attr('autocomplete', 'off');

            // if (form.find('[type=submit]').length > 0) {
            //     form.find('[type=submit]').addClass('disableAutoFillSubmit').attr('type', 'button');
            // }

            // if (settings.submitButton != '') {
            //     form.find(settings.submitButton).addClass('disableAutoFillSubmit').attr('type', 'button');
            // }

            if (settings.randomizeInputName) {
                _helper.randomizeInput(form, settings);
            }
            _helper.passwordListener(form, settings);

        };

        this.restoreAutoFill  = function( node, options ) {

            var form = typeof node == 'string' ? $(node) : typeof node == 'object'? node : false;

            if(!form) {
              return false;
            }

            var settings = $.extend(
                {},
                this.defaults,
                options
            );

            _helper.restoreInput( form, settings );

        };

      };
      return disableAutoFilling;
});
