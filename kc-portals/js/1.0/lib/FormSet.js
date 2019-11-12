;define([], function () {

    function FormSet(form) {

        var formData                = new FormData(form);

        this.append                 = function (key, value) {

            if(value instanceof Object){
                var obj = {};
                obj[key] = value;
                setFormData(formData, obj);
            }
            else{
                formData.append(key, value);
            }

        };

        this.attachFile             = function (input) {
            formData.append($(input).attr('name'), $(input).prop('files')[0] );
        };

        this.attachFileData         = function (name, data) {
            formData.append(name, data);
        };

        this.getFormData            = function () {
            return formData;
        };

        function setFormData(formData, data, previousKey) {
            if (data instanceof Object) {
                Object.keys(data).forEach(key => {
                    const value = data[key];
                    if (value instanceof Object && !Array.isArray(value)) {
                        return setFormData(formData, value, key);
                    }
                    if (previousKey) {
                        key = `${previousKey}[${key}]`;
                    }
                    if (Array.isArray(value)) {
                        value.forEach(val => {
                            formData.append(`${key}[]`, val);
                        });
                    } else {
                        formData.append(key, value);
                    }
                });
            }
        }

    }

    return FormSet;

});