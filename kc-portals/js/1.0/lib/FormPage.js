;define(['jquery', 'lib/Page', 'lib/SendForm'], function($, Page, SendForm){

    function FormPage() {

        // inherit methods
        SendForm.call(this);
        Page.call(this);

        var p_defineFormData    = this.defineFormData;

        this.defineFormData     = function (form) {

            var formData        = p_defineFormData.call(this, form);

            formData['portal']  = this.getPortalName();

            // mixed user data if auth
            if(this.user.isAuth()) {
                formData['token']       = this.user.getSessionId();
                formData['login']       = this.user.getLogin();
                formData['student_id']  = this.user.getUserId();
            }

            return formData;
        };
    }

    FormPage.prototype                  = Object.create(Page.prototype);
    FormPage.prototype.constructor      = FormPage;

    return FormPage;
});