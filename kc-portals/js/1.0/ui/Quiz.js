;define(['jquery', 'ui/ModalWindow', 'mustache'], function ($, ModalWindow, Mustache) {

    /**
     *
     * @param {Page}    page
     * @param {string}  courseID
     * @constructor
     */
    function Quiz(page, courseID) {
        var accountSettings;

        this.defineSelector         = function () {

            return '#quizContainer';
        };

        this.onCloseEvent                = function (handler) {

            return this;
        };

        /**
         *
         */
        this.show                   = function () {

            $.when(this.updateAccountSettings()).then((accountSettings) => {
                require([page.config['quizSite'] + 'kc-quiz.js'], () => {

                    window.Mustache = Mustache;

                    $('html,body').attr('style','overflow-x:visible!important');
                    $('body').prepend('<div id="quizContainer">' +
                        '<div class="preload">'+
                        '<img class="preload-logo" src="/images/loader-logo.png">'+
                        '<img class="preload-ring" src="/images/ring.gif">'+
                        '</div></div>');
                    $('#content').hide();
                    //$('#quizContainer').attr('style','height:'+($(window).height()-200)+'px');

                    window.scrollTo(0,0);

                    var that = this;

                    kc_quiz({
                        targetSelector: this.defineSelector(),
                        courseId: courseID,
                        lang: page.getLanguage(),
                        ApiUrl: page.config['APIUrl'],
                        CDNUrl: page.config['CDNPortal'],
                        token: page.user.getSessionId(),
                        studentID: page.user.getUserId(),
                        passingScore: accountSettings.quiz.min_score,
                        onScored: function(res){
                            page.sendCourseEvent("quizCompleted", {passed:res.passed, score:res.scorePercentage}, accountSettings);
                            $(that.defineSelector()).find('.quiz_exit').show().click(function () {
                                $('link[href*="kcquiz"]').remove();
                                $('#content').show();
                                history.back();
                                $(that.defineSelector()).remove();
                                page.reload();
                            });

                        }
                    });

                    window.onpopstate = function(e) {

                        location.reload();
                    };


                });
            });

        };



        this.updateAccountSettings = function() {
            var prom= $.Deferred();
            console.log(page.user)
            if(typeof page.user.getAccountId() != 'undefined') {

                page.getAccountConfig(page.user.getAccountId(), page.user).done(function (response) {
                    accountSettings  = response;
                }).fail(function(){
                    accountSettings  = undefined;
                }).always(function(){
                    prom.resolve(accountSettings);
                });

            } else {
                accountSettings = undefined;
                return prom.resolve(accountSettings);
            }

            return prom;
        }

        /**
         * Returns message by code
         *
         * @param   {int|string}    code
         * @return  {string}
         */
        this.getMessageByCode       = function (code) {

            const defaultError      = 'Server error';

            // mui:messages-contactus-success
            var strings             = page.getMainData().mui;

            if(     typeof strings['pageContent'] === 'undefined'
                ||  typeof strings['pageContent']['quiz'] === 'undefined') {
                return defaultError;
            }

            strings                 = strings['pageContent']['quiz'];

            switch(code) {

                case this.ENTER:                            return strings['enter'];
                case this.LIMIT_REACHED:                    return strings['textLimitReached'];
                case this.NEED_TO_WATCH_ALL:                return strings['needToWatchAll'];

                default:                                    return defaultError;
            }
        };

        this.ENTER                  = 'enter';
        this.LIMIT_REACHED          = 'limit_reached';
        this.NEED_TO_WATCH_ALL      = 'needToWatchAll';
    }

    return Quiz;
});