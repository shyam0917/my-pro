;define(['jquery', 'jquery.inputmask', 'lib/Page', 'lib/CallGet'], function($, inputmask, Page, CallGet ){

    let weekSeconds = 60 * 60 * 10; //one week equals 10 hours
    let costPerWeek = 375; //(SAR);

    function PrintCourseListForm() {

        const that                  = this;

        Page.apply(this, arguments);

        let courseListType          = null;

        this.invalidateMain();

        this.getClassName           = () => 'printCourseListForm';

        this.defineData             = function () {

            return $.when(
                    this.defineMainData(),

                    this.loadMui('Pages-MyLearning', false),
                    this.getCourseList(),
                    this.getPageMui(),

                    this.defineContent()
                )
                .then((mainDataPromise, myLearningMui, listData, pageMui) => {
                    let mainData = this.getMainData();

                    $.extend(mainData, {
                        pageMui: myLearningMui.response,
                        listData: listData
                    });

                    $.extend(mainData.mui || {}, pageMui);
                });
        };

        this.loadMainTemplate       = function () {

            return this.loadTemplate('printCourseListFrom', function (html) {
                that.setMainHtml(html);
            }).fail(function () {
                console.error('Failed load main template: login');
                $('body').html('<h1>The site load error!</h1>');
            });
        };

        this.defineContent          = function () {

            return $.when(
                this.getCourseList(),
                this.getCourseListContent(),
                this.user.getExtendInfo()
            )
            .done((courseList, courses, userInfo) => {

                let trt = 0;

                $.each(courses, function (index, item) {
                    trt += (item.trt || 0);
                });

                let weekTrt = Math.ceil(trt / weekSeconds);

                $.extend(
                    this.getMainData(),
                    {
                        courseList: courseList,
                        courses: courses,
                        userInfo: userInfo,
                        costPerWeek: costPerWeek,
                        weekTrt: weekTrt,
                        totalCost: weekTrt * costPerWeek
                    }
                );

            });
        };

        this.loadContentTemplate     = function () {

            return $.when(this.getCourseListContent(), this.getCourseList(), this.getPageMui())
                .then(function (courseListContent, courseList, pageMui) {

                if(courseList.custom_request_form_file){
                    window.location = courseList.custom_request_form_file;
                }

                /*
                if(courseList['cloned_from_list_id'] !== null) {
                    courseListType   = 'core';
                }
                */

                courseListType      = 'core';

                //now form type can by set from url part
                if(that.appLocation.urlParts.all.length >= 4){
                    courseListType = that.appLocation.urlParts.all[3];
                }

                if(typeof pageMui['form'] === 'object' && typeof pageMui['form'][courseListType] !== 'undefined') {
                    that.setContentHtml(pageMui['form'][courseListType]);
                    return;
                }

                /*
                let template;
                switch(courseListType) {
                    case 'class':
                        template    = 'ui/printForm/class';
                        break;
                    default:
                        template    = 'ui/printForm/courseList';
                        break;
                }

                return that.loadTemplate(template, function (html) {
                    that.setContentHtml(html);
                });
                */

            });
        };

        /**
         * course list content cache
         * @type {null}
         */
        let courseListContent       = null;
        this.getCourseListContent   = function () {


            if(courseListContent){
                return courseListContent
            }

            courseListContent = $.Deferred();

            let courseListId          = this.getCourseListId(),
                params = {
                    'lang':             this.getLanguage()
                };

            if(this.user.isAuth()) {
                params.token        = this.user.getSessionId();
            }

            switch(this.appLocation.urlParts.all[3]){
                case 'event':

                    params._extend  = 'details,author,is_promoted';
                    //params.portal_id = this.getPortalId();

                    let eventId     = this.appLocation.urlParts.all[4];

                    $.when(this.remoteCall(new CallGet('courses/0'+courseListId, params)),
                        this.remoteCall(new CallGet('accounts/'
                            + this.user.getAccountId()
                            +'/courses/0'+ courseListId
                            + '/events/' + eventId, params))
                    ).done(
                        (courseRes, eventRes) => {

                            let eventInfo = eventRes[0].response;
                            let courseInfo = courseRes[0].response;

                            eventInfo.course_title = deepInObject(courseInfo, 'details.' + this.getLanguage() + '.title')
                                    || deepInObject(courseInfo, 'details.' + courseInfo.default_lang + '.title');

                            let properties = $.extend({},
                                deepInObject(courseInfo, 'details.' + this.getLanguage() + '.properties') || {},
                                deepInObject(courseInfo, 'details.' + courseInfo.default_lang + '.properties') );

                            let specialField = {
                                courseFees : new RegExp('(cost)|(fees)', 'gi'),
                                courseTiming : new RegExp('(timing)', 'gi')
                            };

                            eventInfo.time_start =  this.formatAMPM(eventInfo.date_start);
                            eventInfo.date_start = eventInfo.date_start_date;

                            for(let key in properties) {

                                $.each(specialField, function (index, reg) {
                                    if (reg.test(properties[key].name)) {
                                        eventInfo[index] = properties[key].value;
                                    }
                                });
                            }

                            courseListContent.resolve(eventInfo);
                        }
                    );

                    break;
                default:

                    this.remoteCall(new CallGet(
                        'accounts/'+this.user.getAccountId()+'/courses/lists/'+courseListId+'/content',
                        params,
                        (res) => {

                            if(typeof res.response === 'object'){
                                if(res.response[0]){
                                    courseListType  = res.response[0]['course_format'];
                                }
                            }

                            courseListContent.resolve(res.response);
                        }
                    ).defineErrorHandler((query, status) => {
                        if(status === 404) {
                            console.log('redirect404() in printCourseListForm.getCourseListContent');
                            this.redirect404();
                        } else {
                            console.error('Error occured: status = ' + status + 'for query: ' + query.toString());
                            def.reject();
                        }
                    }));

            }

            return courseListContent;

        };

        let _renderContent          = this.renderContent;
        this.renderContent          = function () {
            _renderContent.apply(this, arguments);

            $('[data-handler="onUpdateCost"]').on('keydown', function (e) {

                if(e.keyCode < 47){
                    return true;
                }

                if(! /[0-9]/.test(e.key)){
                   return false;
                }
            });

        };

        this.getCourseListId        = function(){
            return this.appLocation.urlParts.all[2];
        };

        let courseDef               = null;
        this.getCourseList          = function () {

            if(courseDef){
                return courseDef;
            }

            courseDef                 = $.Deferred();

            let courseListId        = this.appLocation.urlParts.all[2],
                params = {
                    'lang':             this.getLanguage()
                };

            if(this.user.isAuth()) {
                params.token        = this.user.getSessionId();
            }

            switch(this.appLocation.urlParts.all[3]){
                case 'event':
                    courseDef.resolve({});
                    break;
                default:

                    this.remoteCall(new CallGet(
                        'accounts/'+this.user.getAccountId()+'/courses/lists/'+courseListId+'/',
                        params,
                        (res) => {

                            res.response.isConfirmation = res.response.status === 'created';

                            courseDef.resolve(res.response);
                        }
                    ).defineErrorHandler((query, status) => {
                        if(status == 404) {
                            console.log('redirect404() in printCourseListForm.getCourseList');
                            this.redirect404();
                        } else {
                            console.error('Error occured: status = ' + status + 'for query: ' + query.toString());
                            courseDef.reject();
                        }
                    }));

            }

            return courseDef;
        };

        this.onPrintPage            = function (node, event) {
            window.print();
        };

        this.onSendForConsideration = function (node, event) {

            event.preventDefault();

            let courseListId        = this.getCourseListId();

            if(courseListId === null) {
                return false;
            }

            const that              = this;

            $('[data-role=confirmationAction]').remove();

            this.userCourses.sendForConsideration(courseListId).done(function () {
                that.showAlert(that.getMainData().pageMui.MyLearning.toApproveMessage);
            });

        };

        this.onUpdateCost           = function (node, event) {
            let requestedWeeks      = $(node).val();

            let requestedTimeCost   = requestedWeeks * costPerWeek;

            $('[data-role=requestedTimeCost]').text(requestedTimeCost);
        };
    }

    PrintCourseListForm.prototype               = Object.create(Page.prototype);
    PrintCourseListForm.prototype.constructor   = PrintCourseListForm;

    return PrintCourseListForm;
});