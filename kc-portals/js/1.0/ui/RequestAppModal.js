;define(['jquery', 'ui/ModalWindow', 'lib/CallGet'], function ($, ModalWindow, CallGet) {

    function RequestAppModal(page, node) {

        const
            closeSelector   = '.modal_close',
            platform        =  $(node).data('platform');

        this.defineSelector = () => {

            return '#requestAppModal';

        };


        this.show = () => {

            return page.loadTemplate('ui/requestAppModal', (html) => {

                let data = {};
                data[platform] = true; //for mustache template

                $.extend(data,page.getMainData());

                page.renderTo(html, data, page.APPEND_TO_BODY);
                page.assignPageHandlers(this.defineSelector(), this);
                this.showModal();

            });

        };

        this.showModal = () => {

            this.modalWindow        = new ModalWindow({
                modalID:        this.defineSelector(),
                top:            100,
                overlay:        0.4,
                closeButton:    closeSelector,
                onClose: () => {

                    this.close();

                }

            });

            return this.modalWindow.show();

        };

        this.close = () => {

          $(this.defineSelector()).remove();

        };

        this.onSubmitAppRequest = (form, event) => {

            event.preventDefault();

            this.switchLockForm(form);
            this.switchProgressOverlay(form);

            let email = $(form).find("input[name='email']").val();
            let options = {
                email,
                platform,
                lang: page.getLanguage()
            };
            let mui = page.getMainData().mui.pageContent.requestAppForm;

            this.sendMail(options).done(() => {

                this.showAlert(mui.success);

            }).fail(() => {

                this.showAlert(mui.fail, true);

            }).always(() => {

                this.switchLockForm(form);
                this.switchProgressOverlay(form);

            });

        };

        this.showAlert = (message, isError = false) => {

            let container = $(this.defineSelector()).find('#form-message');

            if (isError) {
                container.removeClass('alert-success').addClass('alert-danger');
            } else {
                container.addClass('alert-success').removeClass('alert-danger');
            }

            container
                .text(message)
                .removeClass('hidden');


            if (!isError) {

                setTimeout(() => {

                    $(closeSelector).click();

                }, 5000)

            }

        };

        this.sendMail = (options) => {

            let prom = $.Deferred();

            page.remoteCall(new CallGet(`portals/${page.config.portalID}/appurl/toemail`,
                options,
                () => {

                prom.resolve();

            }).defineErrorHandler(() => {

                prom.reject();

            }));

            return prom;

        };

        this.switchLockForm = (form) => {

            $(form).find('input').each(function () {
                $(this).prop('disabled', !$(this).prop('disabled'));
            });
        };

        this.switchProgressOverlay    = () => {

            $(this.defineSelector()).find(".progressOverlay").toggleClass('hidden');
        };

    }

    return RequestAppModal;
});