;define(['jquery', 'lib/SendForm', 'ui/ModalWindow'], function ($, SendForm, ModalWindow) {

    /**
     *
     * @param {Page} page
     * @param {string} courseID
     * @constructor
     */
    function FeedbackForm(page, courseID, courseName) {

        SendForm.call(this);

        var closeSelector           = '.modal_close';

        var emailType               = false;

        this.modalWindow            = null;

        this.defineSelector         = function () {

            return '#sendFeedback';
        };

        this.defineEmailType    = function () {

            switch(emailType) {

                case 'feedbackForm': return 'portals/' + page.getPortalName() +'/course_feedback';
                case 'errorPage':    return 'error_page';
                default:             return 'portals/' + page.getPortalName() +'/course_feedback';
            }

        };

        this.remoteCall         = function (remoteCall) {

            return page.remoteCall(remoteCall);
        };

        this.getMainData         = function () {

            return page.getMainData();
        };

        var _defineFormData     = this.defineFormData;
        this.defineFormData     = function (form) {

            var formData        = _defineFormData.call(this, form);

            formData['courseID'] = courseID;
            formData['courseName'] = courseName;
            formData['portal']  = page.getPortalName();

            // mixed user data if auth
            if(page.user.isAuth()) {
                formData['token']       = page.user.getSessionId();
                formData['login']       = page.user.getLogin();
                formData['student_id']  = page.user.getUserId();
            }

            return formData;
        };

        /**
         *
         * @return {Promise}
         */
        this.show                   = function (type) {

            var $form               = $(this.defineSelector());

            if($form.length > 0) {

                return this.showModal();
            }

            const self              = this;

            var template            = type && type == 'errorPage' ? 'ui/errorpageForm' : 'ui/feedbackForm';

            emailType               = type && type == 'errorPage' ? 'errorPage' : 'feedbackForm';

            return page.loadTemplate(template, function (html) {

                var data            = page.getMainData();

                // default params for form
                if(page.user.isAuth()) {
                    data['f_name']    = page.user.getFirstName();
                    data['l_name']    = page.user.getLastName();
                    data['email']   = page.user.getEmail();
                }

                page.renderTo(html, page.getMainData(), page.APPEND_TO_BODY);
                page.assignPageHandlers(self.defineSelector(), self);
                self.setHandlers();
                self.showModal();
            });
        };

        this.showModal              = function () {

            this.modalWindow        = new ModalWindow({
                    modalID:        this.defineSelector(),
                    top:            100,
                    overlay:        0.4,
                    closeButton:    closeSelector,
                });

            return this.modalWindow.show().then( function () {
                
            });
        };

        this.closeModal = () => {

            this.modalWindow.close()

        };

        /**
         * Hide form
         */
        this.hide                   = function () {

            $(this.defineSelector() + ' ' + closeSelector).trigger('click');
        };

        var _showAlert              = this.showAlert;
        this.showAlert              = function (message, isError, timeout) {

            $(this.defineSelector() + 'Form').hide();

            const self              = this;

            return _showAlert.call(this, message, isError, timeout).then(function () {

                if(isError !== true) {

                    self.hide();
                }

                $(self.defineSelector() + 'Form').show();
            });
        };
    }

    FeedbackForm.prototype                  = Object.create(SendForm.prototype);
    FeedbackForm.prototype.constructor      = FeedbackForm;

    return FeedbackForm;
});