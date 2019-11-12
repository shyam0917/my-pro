;define(['jquery', 'lib/CallGet', 'config!'], function($, CallGet, config) {

    function FormGenerator(formName, page, controlCSS) {

        if(isEmpty(controlCSS)) {
            controlCSS              = 'form-control input';
        }

        this.getFormSpecification   = function () {

            let url                 = 'portals/0' + page.getPortalId()
                + '/forms/0' + formName + '/';

            let promise             = $.Deferred();
            let data                = {
                'is_static':        1,
                '_extend':          'mui',
                'lang':             page.getLanguage(),
                'token':            page.user.getSessionId()
            };

            this.remoteCall(new CallGet(url, data, function(res) {
                promise.resolve(res.response);
            }));

            return promise.promise();
        };

        this.prepareSpecification   = function (additional) {

            if(typeof additional !== object) {
                return [];
            }

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

            return result;
        };

        this.generate               = function (spec) {

            // prepare
            // spec                 = this.prepareSpecification(spec);

            for(let key in spec) {

                if(!spec.hasOwnProperty(key)) {
                    continue;
                }

                let ctrl            = spec[key];

                ctrl['html']        = this.generateControl(ctrl);
            }

            return spec;
        };

        this.generateControl        = function (spec) {

            switch (spec['name']) {
                case 'group':       return this.groupControl(spec);
                case 'password':    return this.passwordControl(spec);
                case 'email':       return this.emailControl(spec);
                case 'gender':      return this.genderControl(spec);
                case 'lang':        return this.langControl(spec);
                case 'date_of_birth': return this.dateControl(spec);
                default:            return this.defaultControl(spec);
            }
        };

        this.defaultControl         = function (spec) {

            // select control
            if(spec['field_type'] === 'select') {
                return this.selectControl(spec);
            }

            let type                = 'text';
            let mui                 = page.getMui();

            if(spec['field_type'] === 'email') {
                type                = 'email';
                mui                 = mui.form.requiredField.failedEmail;
            } else {
                mui                 = mui.form.requiredField.invalidMessage;
            }

            let mask                = '';

            if(isNotEmpty(spec.options) && isNotEmpty(spec.options.mask)) {
                mask                = ' data-mask="' + spec.options.mask + '" ';
            }

            return '<input type="' + type + '" class="' + controlCSS + '" value="' + spec['value'] + '"\n' +
                '                           name="' + spec['name'] + '"\n' +
                '                           id="' + spec['name'] + '"\n' + mask +
                '                           placeholder="' + spec['label'] + '" ' + spec['required'] + '\n' +
                '                           data-invalidMessage="' + mui + '"/>';
        };

        this.dateControl            = function (spec) {

            let mui                 = page.getMui();

            mui                     = mui.form.requiredField.invalidMessage;

            return '<input type="date" class="' + controlCSS + '" value="' + spec['value'] + '"\n' +
                '                           name="' + spec['name'] + '"\n' +
                '                           id="' + spec['name'] + '"\n' +
                '                           placeholder="' + spec['label'] + '" ' + spec['required'] + '\n' +
                '                           data-invalidMessage="' + mui + '"/>';
        };

        this.groupControl           = function (spec) {

            let mui                 = page.getMui();
            let msg                 = mui.form.requiredField.invalidMessageList;

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

            let select              = '<select class="' + controlCSS + '" name="group" ' + spec['required'] +
                ' data-invalidMessage="' + msg + '"' +
                '>\n'
                + options.join('') +
                '</select>';

            return select;
        };

        this.selectControl           = function (spec) {

            let mui                 = page.getMui();
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

            let select              = '<select class="' + controlCSS + '" name="' + spec['name'] + '" ' + spec['required'] +
                ' data-invalidMessage="' + msg + '"' +
                '>\n'
                + options.join('') +
                '</select>';

            return select;
        };

        this.passwordControl        = function (spec) {

            let mui                 = page.getMui();

            mui                     = mui.form.requiredField.invalidMessage;

            return '<input type="password" class="' + controlCSS + '" value="' + spec['value'] + '"\n' +
                '                           name="' + spec['name'] + '"\n' +
                '                           id="' + spec['name'] + '"\n' +
                '                           placeholder="' + spec['label'] + '" ' + spec['required'] + '\n' +
                '                           data-invalidMessage="' + mui + '"/>';
        };

        this.emailControl           = function (spec) {

            let mui                 = page.getMui();

            let invalidType         = mui.form.requiredField.invalidTypeMessage;
            mui                     = mui.form.requiredField.invalidMessage;

            return '<input type="email" class="' + controlCSS + '" value="' + spec['value'] + '"\n' +
                '                           name="' + spec['name'] + '"\n' +
                '                           id="' + spec['name'] + '"\n' +
                '                           placeholder="' + spec['label'] + '" ' + spec['required'] + '\n' +
                '                           data-invalidMessage="' + mui + '"/' +
                ' data-invalidMessageWrongType="' + invalidType + '"' +
                '>';
        };

        this.genderControl          = function (spec) {

            let mui                 = page.getMui();

            let msg                 = mui.form.requiredField.invalidMessageList;

            mui                     = mui.pageContent.requestAccess.formlabel;

            return '<select class="' + controlCSS + '" name="gender" ' + spec['required'] +
                ' data-invalidMessage="' + msg + '"' +
                '>\n' +
                '<option value="">' + spec['label'] + '</option>\n' +
                '<option value="m">' + mui.male + '</option>\n' +
                '<option value="f">' + mui.female + '</option>\n' +
                '</select>';
        };

        this.langControl            = function (spec) {

            let mui                 = page.getMui();

            let msg                 = mui.form.requiredField.invalidMessageList;

            mui                     = mui.pageContent.requestAccess.formlabel;

            let langs               = config['langs'];
            let options             = [];

            // placeholder
            options.push('<option value="">' + spec['label'] + '</option>');

            $.each(langs, function (index, value) {
                options.push('<option value="' + value.lang + '">' + value.native + '</option>');
            });

            return '<select class="' + controlCSS + '" name="lang" ' + spec['required'] +
                ' data-invalidMessage="' + msg + '"' +
                '>\n' + options.join('') +
                '</select>';
        };
    }

    FormGenerator.prototype.constructor   = FormGenerator;

    return FormGenerator;
});
