;define(['jquery', 'ui/ModalWindow', 'videoplayer'], function ($, ModalWindow, videojs) {

    /**
     *
     * @param {Page} page
     * @param {{}=} node
     * @constructor
     */
    function HowItWorksModal(page, node) {

        const closeSelector           = '.modal_close';
        // let player;

        const playlist = {
            en: 'PLf9E10gujgiZ_-gp1QpUFwdTXP6W3d_M0',
            es: 'PLf9E10gujgiZtSH1Oj91whuiOrJBmU7ec'
        };

        this.modalWindow            = null;

        /**
         * Selector for this node
         *
         * @return {String}
         */
        this.defineSelector         = () => {

            var selector            = $(node).attr('href');

            if(typeof selector === 'undefined' || selector.substring(0, 1) !== '#') {
                selector            = '#previewModal';
            }

            return selector;
        };

        /**
         *
         * @return {Promise}
         */
        this.show                   = () => {

            return page.loadTemplate('ui/howItWorksModal', (html) => {


                let content = {
                    playlist: playlist[page.getLanguage()]
                }


                page.renderTo(html, content, page.APPEND_TO_BODY);
                // page.assignPageHandlers(this.defineSelector(), this);
                // this.setHandlers();
                // this.renderPlayer();
                this.showModal();

            });
        };

        this.showModal              = () => {

            this.modalWindow        = new ModalWindow({
                    modalID:        this.defineSelector(),
                    top:            100,
                    overlay:        0.4,
                    closeButton:    closeSelector,
                    onOpen:  () => {
                        // player.play()
                    },
                    onClose: () => {

                        $(this.defineSelector()).remove()

                    }

                });

            return this.modalWindow.show();
        };

        /**
         * The method setup additional input handlers
         */
        this.setHandlers            = () => {


        };

    }

    return HowItWorksModal;
});