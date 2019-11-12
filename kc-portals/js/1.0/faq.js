;define(['jquery', 'lib/Page', 'lib/CallGet'], function($, Page, CallGet){ 

    function Faq() {

        Page.call(this);

        this.getClassName           = function () {
            return 'FAQ';
        };

        this.defineContent          = function () {

            const self              = this;

            $.when(this.outContentPromise).then(() => {
                self.setHandlers();
            });

            return this.getPageMui().done((res) => {
                this.setContentData(this.buildData(res));
            });

        };

        this.buildData = (data) => {
            if( this.config.portal.template != 'ussite' ) {
                if (!data['list']) {
                    return {'faq' : data[0] };
                }
            }
            return data;

        };

        this.setHandlers        = function () {

            var answerSelector  = '.faq-answer';
            var answer          = $(answerSelector);
            var question        = $(".faq-question");

            answer.hide();

            question.find('a').off('click')
            question.find('a').on('click', function(event){
                event.preventDefault();
            })

            $(document).on('keypress', question, function(event){
                if(event.which == 13){
                    console.log('clicked')
                    $(this).click()
                }
            })
            $(document).on('click',question, function(e){
                e.stopImmediatePropagation();

                var isActive = $(e.target).parents('.question').hasClass('active');

                $('.question.active')
                    .removeClass('active')
                    .find('.faq-answer')
                    .slideUp(300);

                if (!isActive) {

                    $(e.target)
                        .parents('.question')
                        .addClass('active')
                        .find('.faq-answer')
                        .slideDown(300);

                }

                //
                //answer.hide();
                //$(this).parent().find(answerSelector).show();
            });

        };
    }

    Faq.prototype               = Object.create(Page.prototype);
    Faq.prototype.constructor   = Faq;

    return Faq;
});