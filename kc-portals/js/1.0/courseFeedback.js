;define(['jquery','lib/Page', 'lib/CallGet', 'lib/CallPost', 'courses'], function($,Page, CallGet, CallPost, Courses){

    function courseFeedback() {

        Page.call(this);
        let data = {};
        let courseFeedbackInfo = {};

        this.getClassName           = function () {
            return 'courseFeedback';
        };

        this.defineContent          = function () {
            var coursesClass = new Courses();
            $.when(this.outContentPromise).done(() => {
                $("[isRequired='true']").attr("required","true");
            });

            var locationPath = location.pathname.split('/');
            var courseIdIndex = locationPath.indexOf("courseFeedback") + 1;
            var courseId = locationPath[courseIdIndex];

            var lang = this.getLanguage();

            return $.when(
                this.getPageMui(),
                this.getFeedbackQA(),
                coursesClass.getCourseInfo(courseId, lang)
                ).then((mui,feedbackQA, courseInfo) => {
                    courseFeedbackInfo = courseInfo;
                 feedbackQA = $.map(feedbackQA, function(value, index) {
                    value = $.extend(value, {
                        "question_type_flags": {
                            "single_choice": false,
                            "multiple_choice": false,
                            "open_question": false,
                            "label": true
                        }
                    })
                    
                    switch(value.question_type){
                        case 'single_choice':
                            value.question_type_flags.single_choice = true;
                            value.question_type_flags.label = false;
                        break;
                        case 'multiple_choice':
                            value.question_type_flags.multiple_choice = true;
                            value.question_type_flags.label = false;
                        break;
                        case 'open_question':
                            value.question_type_flags.open_question = true;
                            value.question_type_flags.label = false;
                        break;
                    }
                    return [value];
                });
                 let data = Object.assign(mui,{'questions':feedbackQA}, courseInfo);
                 this.setContentData(data);
                }
            )

        };

        this.onSubmitForm = function(form, event){
            event.preventDefault();
            
            this.lockForm(form);
            var formData        = this.defineFormData(form);

            // API parameters
            var params          = {
                'token': this.user.getSessionId(),
                'courseID': courseFeedbackInfo.course_ID,
                'lang': this.getLanguage()
            };
            params = $.extend(params, formData);

            const self          = this;
            this.remoteCall(new CallPost('courseFeedback/questions', params, function (response) {

                $("#courseFeedback").remove();
                $(".responseMessage.success").removeClass('hidden').hide().fadeIn('slow');
                window.scrollTo(0,0);
                // let closeOnSend = $(form).data('close'),
                //     timeout     = closeOnSend ? 1000 : 5000;

                // self.showAlert(self.defineSuccessMsg(), false, timeout).then(function () {

                //     self.unlockForm(form);

                //     // $(form).find("input[type!='submit'],textarea").val('');
                //     // fix for IE
                //     // if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/)) || (typeof $.browser !== "undefined" && $.browser.msie == 1)) {
                //     //     $(form).find("input[type!='hidden'],textarea").val('');
                //     //     $(form)[0].reset();
                //     //     if($('#partnership').hasClass('form')) {
                //     //         $('.form').addClass('submitted');
                //     //         $(form).find("input,textarea").val('');
                //     //     }
                //     // }

                //     // self.onSend(formData);
                // });

            }).defineErrorHandler(function (query, status, errorThrown) {

                console.error('Error send response: ' + status + ', error: ' + errorThrown);
                self.unlockForm(form);
                // self.showAlert(self.getMessageByCode(self.ERROR), true).then(function () {
                //     self.unlockForm(form);
                // });

            })).always(function () {
                
            });
        }

        this.defineFormData     = function (form) {

            var formData        = {};

            // get all form data
            $(form).find('input,textarea,select').each(function () {
                if(($(this).prop('type') == 'radio' || $(this).prop('type') == 'checkbox') && !$(this).prop('checked')){
                    return true;
                }

                if(!Array.isArray(formData[$(this).prop('name')]))
                    formData[$(this).prop('name')] = [];

                formData[$(this).prop('name')].push($(this).val());
            });

            var formatedFormData = [];
            Object.keys(formData).forEach(function (key) {
                formatedFormData[key] = formData[key].join(',');
            });

            return formatedFormData;
        };

        this.lockForm               = function (form) {

            let mui             = this.getMainData().mui;

            // enable all inputs
            $(form).find('input,textarea').each(function () {
                $(this).prop('disabled', true);
            });

            $(form).find('button[type="submit"]').each(function () {
                $(this).prop('disabled', true);
                $(this).attr('rel', $(this).html());
                $(this).html(mui.buttonLabel.wait);
            });

            $(form).find('input[type="submit"]').each(function () {
                $(this).prop('disabled', true);
                $(this).attr('rel', $(this).attr('value'));
                $(this).attr('value',mui.buttonLabel.wait);
            });

        };

        this.unlockForm             = function (form) {

            let mui             = this.getMainData().mui;

            // enable all inputs
            $(form).find('input,textarea').each(function () {
                $(this).prop('disabled', false);
            });

            $(form).find('button[type="submit"]').each(function () {
                $(this).prop('disabled', false);
                $(this).html( $(this).attr('rel'));
            });

            $(form).find('input[type="submit"]').each(function () {
                $(this).prop('disabled', false);
                $(this).attr('value',$(this).attr('rel'));
            });

        };

        this.showProgressOverlay    = function () {

            $(this.defineSelector()).find(".progressOverlay").removeClass('hidden');
        };

        this.getFeedbackQA = () => {
        
            let prom = $.Deferred();
            let locationPath = location.pathname.split('/');
            let courseIdIndex = locationPath.indexOf("courseFeedback") + 1;
            let courseId = locationPath[courseIdIndex];
            this.remoteCall(new CallGet('courseFeedback/questions'  , {'lang': this.getLanguage(), 'courseid':courseId, 'token': this.user.getSessionId()}, (res) => {
                    
                    prom.resolve(res.response);                        

                })
                .defineErrorHandler(function (query, status) {
                    prom.reject({});
                }));
                 return prom;
        };


    }

    courseFeedback.prototype               = Object.create(Page.prototype);
    courseFeedback.prototype.constructor   = courseFeedback;

    return courseFeedback;
});