;define(['jquery', 'lib/Page', 'ui/Quiz', 'tna', 'lib/CallPut', 'lib/CallPost','lib/CallGet','ui/ModalWindow' ],
    function($, Page, Quiz, tna, CallPut, CallPost,CallGet, ModalWindow){

    function MyLearning() {

        Page.call(this);

        var that                    = this;

        let userCourses             = [];
        let userCoursesByCategories = [];
        let userCoursesLists        = [];
        let currentCourseList       = null;
        let currentAccessType       = null;
        let toShowByList            = {};

        let coursesTemplate;
        let cyclesTemplate;
        let quizzesTemplate;
        let coursesId;
        let eventListId;
        let eventsTemplate;
        let statsTemplate;
        let statsId;
        let accountSettings;
        let pageMuiData;
        let currentCourseId;
        let courseCycles = [];
        let cycleHistory;
        let currentCycleId;
        let historyTemplate;
        let historyId;
        let quizzesId;
        let cyclesId;
        let coursesHistory;
        let eventsFilter;
        let accountConfigPromise;

        let viewData = {
            showedCourses: 0,
            bookmark: 'assigned',
            style: {
                list: true,
                flat: false
            }
        };

        var data                = {
            'subscriptions' :   [],
            'bookmarks':        {},
            'stats':            {},
            'isTnaBtn':         this.user.getLocalUserData() ? this.user.getLocalUserData().isTnaBtn : false
        };

        this.getClassName = () => {
            return 'MyLearning';
        };

        this.defineContent = () => {

            // Show login form if User don't auth
            if(this.user.isAuth() === false) {

                let promise         = $.Deferred();

                promise.resolve();

                // show login form if user not auth
                this.loadStylesPromise.done(() => {

                    this.showLoginForm({isBlocking:true, redirectHomeOnClose:true});

                });

                return promise;
            }


            if(this.user.isTna() == 1) {

                let promise         = $.Deferred();

                promise.resolve();

                $.when(this.outContentPromise).done(() => {

                    //if tna should be shown, get account settings and show it.
                    this.getAccountConfig(this.user.getAccountId(), this.user).done((response) => {
                        accountSettings     = response;
                        this.showTna();
                    });
                });

                return promise;

            }

            $.when(this.outContentPromise).then(() => {
                var saved_style_view = localStorage.getItem('myLearning_style');
                if (saved_style_view === 'flat')
                {
                    $('.view__btn--flat').trigger('click');
                }

                let stats           = that.userCourses.getStats(true);

                if(isEmpty(stats['events']) || isEmpty(stats['events']['count_all'])) {
                    localStorage.bookmark = null;
                    $('#EventsList').addClass('hide');
                }

                if (localStorage.bookmark) {
                    $('#bookmark-'+ localStorage.bookmark).trigger('click');
                }
                else {
                    // hide EventsList
                    $('#EventsList').addClass('hide');
                }
            });




            accountConfigPromise = this.getAccountConfig(this.user.getAccountId(), this.user)
                .done((response) => {

                    const that          = this;
                    accountSettings     = response;

                    data.accountType    = response['type'];


                    if (typeof that.user.showNotice() != 'undefined' &&
                        typeof that.user.getAccountId() != 'undefined' &&
                        typeof isNoticeStatus == 'undefined' &&
                        that.user.showNotice() == 1 &&
                        !that.user.isFirstLogin()) {

                        if (typeof response.isNotice != 'undefined' && response.isNotice) {

                            let promise = $.Deferred();

                            promise.resolve();

                            $.when(this.outContentPromise).done(() => {

                                $.cookie.json = true;

                                let data = $.cookie('LocalUserData');

                                data['isNotice'] = 0;

                                $.cookie('LocalUserData', data, {'path': '/'});

                                let mui = this.getMainData().mui;

                                let noticeMessage   = '<h3>'
                                                    + mui.error.onlogin_alert.title
                                                    + '</h3>'
                                                    + mui.error.onlogin_alert[0]
                                                    + '<input type="checkbox" value="1">'
                                                    + mui.error.onlogin_alert_nomore;

                                this.showNotice(noticeMessage);

                            });

                            return promise;

                        }

                    }

            }).fail(function (status) {

                if( status == 498 ) {

                    that.user.logout();

                    document.location.href="/";
                }
            });

            return $.when(
                    this.getPageMui(),
                    this.defineMainData(),
                    this.loadMui(),
                    accountConfigPromise)
                .then((pageMui, mainData, currentPageMui, accountConfig) => {

                        $.extend(data, {pageMui: pageMui}, {accountConfig: accountConfig});

                        pageMuiData             = pageMui;

                        return this.userCourses.getAllCourses(true).done((resCourses) => {

                            this.coursesHistory = resCourses['history'];
                            delete resCourses['history'];

                            data.bookmarks      = this.generateBookmarks(resCourses);

                            let  courses        = this.prepareUserCourses(resCourses);

                            userCoursesLists    = resCourses.assigned;

                            if(data.bookmarks[0].nodeId == 'bookmark-assigned') {
                                viewData.bookmark = 'assigned';
                                courses        = this.coursesFilterByAccess("assigned");
                            } else if (data.bookmarks[0].nodeId == 'bookmark-chosen') {
                                viewData.bookmark = 'chosen';
                                courses        = this.coursesFilterByAccess("chosen");
                            } else {
                                viewData.bookmark = data.bookmarks[0].nodeId.split('bookmark-')[1];
                                courses        = this.coursesFilterByList(data.bookmarks[0].nodeId.split('bookmark-')[1]);
                            }

                            this.generateCoursesByCategory(data);

                            $.extend(data, this.prepareCoursesList(courses));

                            data.courseListDuration = this.defineCourseListDuration(courses);
                        })
                })
                .then((resCourses) => {
                        return this.userCourses.getStats().done((stats) => {
                            //data.stats          = stats;

                            if(typeof stats['trainingLimit'] === 'object') {
                                data['trainingLimit'] = this.renderTrainingLimit(stats['trainingLimit']);
                                data['isTrainingLimit'] = true;
                            }

                            stats.licenseStatus = this.getMainData().mui.mylearning.content['license' + stats.licenseStatus] || 'none';
                        })
                })
               .then(() => {

                   viewData.bookmark = data.bookmarks[0] ? data.bookmarks[0].nodeId.split('bookmark-')[1] : 'assigned';
                   this.setContentData(data);

               });

        };

        this.renderTrainingLimit    = function (trainingLimit) {

            if(typeof trainingLimit['limit'] === 'undefined' || trainingLimit['limit'] === null) {
                return {};
            }

            let mui                 = this.getMainData().mui['trainingLimit'];

            if(typeof mui === 'undefined') {
                return {};
            }

            let current             = trainingLimit['limit'];
            let limit               = current['limit'] + ' ' + mui['per'] + ' ';
            let remain              = trainingLimit['left'];
            let minutes             = 0;

            switch(current['period_type']) {
                case 'day': limit += mui['day']; break;
                case 'week': limit += mui['week']; break;
                case 'month': limit += mui['month']; break;
            }

            remain                  = Math.floor(remain / 60 / 60);
            minutes                 = Math.floor(trainingLimit['left'] / 60) - remain * 60;

            if(minutes < 10) {
                minutes             = '0' + minutes;
            }

            remain                  = remain + ':' + minutes + ' ';

            switch(current['period_type']) {
                case 'day': remain += mui['forday']; break;
                case 'week': remain += mui['forweek']; break;
                case 'month': remain += mui['formonth']; break;
            }

            return {'limit': limit, 'remain': remain};
        };

        this.ctrlHistory     = (node) =>{

          historyTemplate    = node.html();
          historyId          = node.attr('id');
        }

        this.ctrlCycles             = (node) =>{

            cyclesTemplate          = node.html();
            cyclesId                = node.attr('id');
        }

        this.ctrlCoursesList        = (node) => {

            coursesTemplate         = node.html();
            coursesId               = node.attr('id');
        };

        this.ctrlQuizzes            = (node) => {

          quizzesTemplate           = node.html();
          quizzesId                 = node.attr('id');

        }

        this.ctrlEventsList         = (node) => {

            eventsTemplate          = node.html();
            eventListId             = node.attr('id');
        };

        this.ctrlListStats    = (node) => {

            statsTemplate            = node.html();
            statsId                  = node.attr('id');
        };


        this.generateBookmarks      = function (userCourses) {

            const that              = this;
            let mui                 = this.getMainData().mui['mylearning'];
            let bookmarks           = [];

            // counters
            let total               = {};
            let assigned            = {};

            $.each(userCourses.assigned, function(i, list){

                if(list['is_generated'] && list.name !='_tna' ) {

                    if(!list.isNew) {
                        list.courses.forEach(course => {
                            assigned[course] = true;
                        });
                    }

                    list.courses.forEach(course => {
                        total[course] = true;
                    });

                    return true;
                }

                if (list.name =='_tna') {

                    data.isTnaBtn   = false;
                }

                bookmarks.push({

                    'nodeId':         'bookmark-' + that.generateListId(list),
                    'text':           list.name != '_tna' ? list.name: (accountSettings['isTNARequired']?mui['content']['tnaListRequired']:mui['content']['tnaList']) ,
                    'count':          list.courses.length
                });

                if(!list.isNew) {

                    list.courses.forEach(course => {
                        total[course] = true;
                    });

                    if(list.status !== 'confirmation' && list.name !=='_tna') {
                        list.courses.forEach(course => {
                            assigned[course] = true;
                        });
                    }
                }
            });

            $.each(userCourses.chosen, function(i, list){

                list.courses.forEach(course => {
                    total[course] = true;
                });
            });

            // arrays to length
            assigned                = objectToArray(assigned).length;
            total                   = objectToArray(total).length;

            // virtual bookmarks
            $.each({
                'assigned': mui['bookmarks']['assignedCourses'],
                'chosen': mui['bookmarks']['chosenCourses'],
                'archived' : mui['bookmarks']['archivedCourses'],
                'all': mui['bookmarks']['allCourses']
            }, function (index, value)  {

                if( !userCourses.assigned.length && index == 'assigned') {
                    return true;
                }

                if( !userCourses.chosen.length && index == 'chosen') {
                    return true;
                }

                let count;
                switch(index){
                    case 'chosen':
                        count = userCourses.chosen && userCourses.chosen[0] && userCourses.chosen[0].contents ?
                            userCourses.chosen[0].contents.length : 0;
                        break;
                    case 'assigned':
                        count = assigned;
                        break;
                    case 'archived':
                        count = userCourses.archived && userCourses.archived[0] && userCourses.archived[0].courses && userCourses.archived[0].courses.length || 0;
                        if(count === 0){
                            return;
                        }
                        break;
                    case 'all':
                        count = total;
                        break;
                    default:
                        count = '-';
                        break;
                }

                bookmarks.push({
                    'nodeId':       'bookmark-' + index,
                    'text':         value,
                    'count':        count
                });
            });

            let stats           = that.userCourses.getStats(true);

            if(isNotEmpty(stats['events']) && isNotEmpty(stats['events']['count_all'])) {
                // events
                bookmarks.push({
                    'nodeId':       'bookmark-events',
                    'text':         mui['content']['myEvents'],
                    'count':        stats['events']['count_register'] + ' / ' + stats['events']['count_all']
                });
            }

            // first is active by default
            bookmarks[0].isActive   = true;

            return bookmarks;
        };

        this.prepareUserCourses     = (courses) => {

            let mui                 = this.getMainData().mui['mylearning'];

            for(let accessType in courses) {

                if(!courses.hasOwnProperty(accessType)) {
                    continue;
                }

                if(typeof courses[accessType] !== "undefined") {

                    courses[accessType].forEach(list => {

                        let catCourses  = [];
                        let exists      = {};

                        if(typeof list.contents !== "undefined") {

                            list.contents.forEach(course => {

                                if(isEmpty(course.accessType) && course.accessType !== 'assigned') {
                                    course.accessType       = list.type === 'for_chosen' ? 'chosen' :
                                        list.name === '_tna'  ? '_tna' :
                                        list.type === 'archived' ? 'archived' :
                                        list.isNew ? list.isNew : 'assigned';
                                }

                                if(course.accessType === 'archived'){
                                    course.is_archived = true;
                                }

                                course.isNew            = list.isNew;
                                course.listId           = list.id;
                                course.isConfirmation   = course.status === 'confirmation';
                                course.availableDateInit= list.av_date_start;
                                course.availableDateEnd = list.av_date_end;

                                userCourses.push(course);

                                if(!isNotEmpty(exists[course['id']])) {
                                    catCourses.push(course);
                                    exists[course['id']] = true;
                                }
                            });
                        }

                        userCoursesByCategories.push({
                            'category': list.is_personal ? mui['bookmarks']['chosenCourses'] : list.name,
                            'list_id': list.id,
                            'is_assigned': list.type !== 'for_chosen' && list.name !== '_tna' && isEmpty(list.isNew),
                            'userCourses': catCourses
                        });
                    });
                }
            }

            // delete exists
            /*
            let exists              = {};
            userCourses.forEach(course => {

                // rewrite access type if assigned
                if(isNotEmpty(exists[course['id']]) && exists[course['id']]['accessType'] === 'assigned') {
                    // no rewrite
                    return;
                }

                exists[course['id']] = course;
            });

            userCourses             = objectToArray(exists);
            */

            userCourses             = this.prepareCoursesProgress(userCourses).sort(this.sortByNameAsc);

            return userCourses;
        };

        this.prepareCoursesProgress = function (list) {

            const that              = this;
            var mui                 = this.getMainData().mui;

            return $.map(list, function (course) {

                course['url']           =  that.config['basePath'] + course['lang'] + '/library/' + course['ceid']+'/course/' + that.rewriteTitletoUrl(course['title']);
                //course['quiz'].showTest = (course.quiz.isAllowed || course.quiz.attemptsCount <= course.quiz.maxCount) && course.progress == 100;

                if(course['accessType'] == 'chosen' || //if tna is not 'required' then we suppose they can remove them
                    (course['accessType'] == '_tna' && !accountSettings['isTNAMandatoryCourse'] && !accountSettings['isTNARequired'])  
                ) {
                    course['is_removable'] = 1;
                }

                if(typeof course['quiz'] === 'undefined') {
                    course['quiz']      = {};
                }

                if(typeof course['quiz']['attemptsCount'] === 'undefined')
                {
                    course['quiz']['attemptsCount'] = 0;
                }

                if(typeof course['quiz']['maxCount'] === 'undefined')
                {
                    course['quiz']['maxCount'] = '';
                }

                if(course['quiz']['maxCount'] == 0)
                {
                    course['quiz']['unlimited'] = true;
                }

                if(course.progress>100){course.progress=100;}
                course['quiz'].showTest = course.progress == 100;
                course['quiz'].showAttempts = course['quiz']['maxCount'] <= 99;
                course['progress_style'] = `style="width: ${course.progress}%;"`;
                course['runtime_sec'] = course['runtime'];//save option for back capability
                course['runtime'] = that.formatSecondsToHrs(course['runtime']);
                course['preview'] = {
                    path:       that.config.CDNContent + 'previews/',
                    src:        course['courseID'] + '/400.jpg',
                    src2x:      course['courseID'] + '/800.jpg',
                    sources: [
                                {
                                    minWidth:   765,
                                    src:        course['courseID'] + '/240.jpg',
                                    src2x:      course['courseID'] + '/400.jpg'
                                }
                            ]
                };

                if(typeof course['certificate'] !== 'undefined') {
                    that.prepareCertificate(course['certificate']);
                }

                //mobile
                if (course['quiz']['success'] !== null &&
                    // typeof course['quiz']['success']['score'] !== 'undefined'
                    typeof course['quiz']['maxScore'] !== 'undefined'
                ) {
                    // course['scorePercent'] = course['quiz']['success']['score'];
                    course['scorePercent'] = course['quiz']['maxScore'];
                }

                if (course['quiz']['success'] !== null &&
                    // typeof course['quiz']['success']['attempt_end_date'] !== 'undefined'
                    typeof course['passed'] !== 'undefined'
                ) {
                    // course['passedDate'] = that.unixTimestampToDate(course['quiz']['success']['attempt_end_date']);
                    course['passedDate'] = that.unixTimestampToDate(course['passed']);
                }
                if(course.progress<100){
                    course['status_mobile'] = course.progress+'%';
                } else if(course.progress==100 && typeof course['scorePercent'] !== 'undefined'){
                    course['status_mobile'] = mui.mylearning.content.chosenCourses.score+': ' + course['scorePercent'];
                }
                if(course.progress == 100){
                    course['status_mobile_h'] = 'hidden';
                }

                if(course.quiz){
                    course.quiz.isTestAvailable = (course.quiz.availability || []).length > 0;
                }

                return [course];
            });

        };

        this.prepareCertificate     = function (cert) {

            return cert;
        };

        this.onTakeTest             = function (node, event) {

            event.preventDefault();

            let courseID            = $(node).attr('data-id');
            let muiQuiz             = this.getMainData().mui.pageContent.quiz;
            let isNotAllowed        = userCourses.some((course) => {

                return (course.courseID === courseID && !course.quiz.isAllowed);

            });

            if (isNotAllowed) {
                this.showDanger(muiQuiz.limitReached, function(){
                    let promise         = $.Deferred();
                    that.onResetProgress(courseID);
                    promise.resolve();
                    return promise;
                });
                return;
            }

            this.checkAccessToCourse(courseID)
                .fail(() => {
                    this.showAlert(this.getMainData().mui.mylearning.content.quiz.courseAccessDeny);
                })
                .done(() => {

                    var failAttempt         = accountSettings.quiz.max_count || 5;
                    failAttempt             = accountSettings.quiz.max_count == 0 ? muiQuiz.unlimited : failAttempt;
                    var muiMsg              = this.getMainData().mui.mylearning.content.quiz.startMessage;
                    if(accountSettings.quiz.max_count == 0) {
                        muiMsg              = this.getMainData().mui.mylearning.content.quiz.startUnlimited;
                    }
                    var msg                 = muiMsg.replace(/\{\{fileAttempt\}\}/g, failAttempt);

                    this.showConfirm(msg, function(){
                        let promise         = $.Deferred();

                        $(node).blur();

                        var quiz            = new Quiz(that, courseID);
                        quiz.show();
                        history.pushState({}, '', window.location + '/quiz');

                        promise.resolve();
                        return promise;
                    }, this.getMainData().mui.buttonLabel.accept);

                });

        };

        this.onGetRecommended       = function (node, e) {

            e.preventDefault();
            this.showTna()

        };

        this.onShowCertificate      = function (node, event) {

            var certificateID       = $(node).attr('data-id');

            if(typeof certificateID === 'undefined') {

                event.preventDefault();
                return false;
            }

            if( typeof accountSettings.student_certificate_access !='undefined' &&  accountSettings.student_certificate_access ) {

                $(node).attr('target', '_blank');
                $(node).attr('href', this.generateNewUrl('showCertificate?certificateID=' + certificateID));

            } else {

                event.preventDefault();

                let mui             = this.getMainData().mui;

                this.showAlert(mui.error.student_certificate_access, true);

                return false;
            }

            return true;
        };

        this.showTna                = function () {

            if ($('#tnaContainer').length) return;

            $('html,body').attr('style','overflow-x:visible!important');


            $('body').prepend('<div id="tnaContainer"></div>');
            $('#content').hide();

            window['_rvt_'] = '';


            //select the set of questions
            var pageGroups = ["default-intro","default-allcourses"];
            if(accountSettings['isTNARequired'])
                pageGroups = ["required-intro","default-allcourses"];

            window.tna({
                targetElementSelector: '#tnaContainer',
                languageCode: that.getLanguage(),
                availableLangs: that.getLanguages(),
                courseListPath:        this.config.CDNPortal + "opencontent/portals/" + that.config['portalID'] + '/',
                maxCourses: that.user.tnaCourses(),
                pages: pageGroups,
                onTnaResults: function (results) {

                    if(!results) {
                        if (accountSettings['isTNARequired']) {
                            //if it's required, they get logged out if they skip it.
                            that.user.logout();
                            document.location.href="/";
                            return setTimeout("location.reload(true);",100);
                            
                        } else {
                            //no results, but not required, means they skipped, so switch off TNA
                            that.switchTna('0').done(function() {
                                location.reload();
                            });
                            return;
                        }
                        
                    }

                    var coursesData = [];

                    for (var course in results){
                        if (course in tna_this.courseList){
                            tna_this.courseList[course].tnaScore = results[course]
                            coursesData.push(tna_this.courseList[course]);
                        }
                    }

                    coursesData = coursesData
                        .sort(function(a, b) {
                            return b.tnaScore - a.tnaScore
                        })
                        .slice(0, tna_this.maxCourses)
                        .map(function (item) {
                            return item.course_ID;
                        });

                    //turn tna off for user and assign courses.
                    that.switchTna('0').done(function() {
                        that.assignCourses(coursesData);
                    })
                    

                }
            })

        };

        this.assignCourses          = function (courses) {

            var params              =  {
                "path": [
                    {
                        "personal_course_list": true,
                        "courses": courses
                    },
                ],
                listName : '_tna',
                token: this.user.getSessionId()
            };

            var prom = $.Deferred();

            this.remoteCall(new CallPost('students/' + this.user.getUserId() +'/learningpath/personal/', params, function (response) {

                prom.resolve(response);

            }).defineErrorHandler(function () {

                prom.reject();

            }));

            prom.always(function () {
                location.reload();
            })
        };

        this.switchTna              = function (isTna) {

            var params = {

                isTna: isTna,
                token: this.user.getSessionId()

            };

            return that.remoteCall(new CallPut('students/0' + this.user.getUserId() + '/tna', params, function (res) {

                if (res.response) {

                    that.user.setTna(isTna);
                    that.user.saveLocalUserData();

                    // that.reload();

                }

            }));

        };

        this.openPreview    =   function(course, lesson){

            var previewModal           = new PreviewModal(page, node);
            previewModal.show();

        };

        /**
         *
         * @param   {String}        message
         * @param   {boolean=}      isError
         */
        this.showNotice              = function (message) {

            const _self             = this;

            var selector            = '#noticeWindow';

            var $notice              = $(selector);

            if($notice.length === 0) {

                console.error('Template error: #noticeWindow is not defined on the page!');
                alert(message);
                return;
            }

            $('body').css('display', 'block');

            $notice.find('[rel=text]').html(message);

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                closeButton:    '.closeNotice',
                top:            100,
                overlay:        0.4,
                isAlert:        true,
                isBlocking:     true,
                onBeforeClose:  function () {

                                _self.changeNoticeStatus()

                                }
            });

            return modalWindow.show();
        };

        this.changeNoticeStatus = function () {

            var notShowAgain    = $('#noticeWindow').find('input[type=checkbox]').prop('checked');

            if(!notShowAgain){
                return;
            }

            var params = {

                isNotice: 0

            };

            return that.remoteCall(new CallPut('students/0' + this.user.getUserId() + '/', params, function (res) {

                if (res.response) {

                    console.log(res.response);
                }

            }));

        };

        this.onBookmark              =  (node, event) => {

            event.preventDefault();

           // if ($(node).hasClass('active')) return;

            let id                  = $(node).attr('id').split('bookmark-');
            let type                = id[1];
            let hide_elements       = "div[course-cycle-focus='title'],a[course-cycle-name='title'],div[course-cycle-focus='title-plain'],#CyclesList,.table-head-cycles,#LessonList,.table-head-history";
            let show_elements       = "";
            let data                = null;
            let title               = $(node).attr('title-text');

            viewData.bookmark       = type;
            localStorage.bookmark   = type;

            if(type === 'events') {
                this.renderEvents();

                $('#coursesList').addClass('hide');
                $('#EventsList').removeClass('hide');
            }
            else
            {
                $('#coursesList').removeClass('hide');
                $('#EventsList').addClass('hide');

                if(!!~['all', 'assigned', 'chosen', 'archived'].indexOf(type)) {
                    data                = this.prepareCoursesList(this.coursesFilterByAccess(type));
                } else {
                    //for tabs asigned lists
                    data                = this.prepareCoursesList(this.coursesFilterByList(type));
                }

                accountConfigPromise.done((accountConfig) => {
                    data.accountConfig = accountConfig;

                    this.renderCourses(data);
                    this.renderStats(data);
                });
            }

            $(hide_elements).addClass("hide");
            $(show_elements).removeClass("hide");
            $("#CoursesList,.table-head-courses,div[course-page-subtitle='text'],.get-course-history__btn,.table-style,[rel='bookmarks'] a.active").removeClass("hide");
            $(".get-course-history__btn").removeClass("active");
            $("a.bookmark").removeClass("active");
            $(node).addClass('active');
            $("#selectedlistTitle").text(title);

            if (isNotEmpty(data) && data.userCourses.length && viewData.style.list) {

                $(`[rel='sort'] a.active`).removeClass('active');
                //$(`[rel='sort'] [data-type='name'][data-dir='asc']`).addClass('active');

            }
        };

        this.sendEventToApprove     = function (courseId, eventId, status) {

            let url                 = 'accounts/' + this.user.getAccountId()
                                        + '/courses/0'+courseId+'/events/'
                                        + eventId + '/users/'
                                        + that.user.getUserId() + '/status';

            this.remoteCall(new CallPost(url, {'status': status, 'token': this.user.getSessionId()}, (response) => {

                if(isEmpty(response['response'])) {
                    return;
                }

                let mui             = this.getMui();

                if(isNotEmpty(mui['mylearning']) && mui['mylearning']['alert']) {
                    mui             = mui['mylearning']['alert'];
                }

                response            = response['response'];

                if(isNotEmpty(response) && isNotEmpty(response['status'])) {

                    switch(response['status']){
                        case 'error':
                            that.showAlert(mui['error']);
                            break;
                        case 'unregister':
                            that.showAlert(mui['unregister']).done(function (modal) {
                                modal.bindOnClose(function () {
                                    that.redirect('myLearning');
                                })
                            });
                            break;

                        case 'review':
                        default:

                            let printFormLink   = that.generateNewUrl('printCourseListForm/' + courseId + '/event/' + eventId);

                            that.showApproveModal().done(function (modalWindow) {
                                $('[data-role="printFormLink"]').attr('href', printFormLink);

                                if(response['status'] === 'review'){
                                    $('[data-role="approvedEventModal-text"]').text(mui['pending']);
                                }else{
                                    $('[data-role="approvedEventModal-text"]').text(mui['registered']);
                                }

                            });

                            break;
                    }

                }

                //this.renderEvents();
            }));
        };

        this.showApproveModal       = function () {

            let selector            = '#approvedEventModal';
            let $alert              = $(selector);

            let modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        true
            });

            modalWindow.bindOnClose(function () {
                that.redirect('myLearning');
            });

            return modalWindow.show()
                .done(function(){
                    modalWindow.getModalNode()
                        .find('[rel^=close]')
                        .bind('click', function () {
                            modalWindow.close();
                        });
                });
        };

        this.onEventsTab            = function (node, event) {

            let tab                 = $(node).attr('data-tab');

            event.preventDefault();
            this.renderEvents(tab);
        };

        this.onUnRegisterEvent      = function (node, event) {

            event.preventDefault();

            let eventId             = $(node).attr('data-id');

            this.sendEventToApprove(null, eventId, 'unregister');
        };

        this.onRegisterEvent        = function (node, event) {

            event.preventDefault();

            let eventId             = $(node).data('id');
            let courseId             = $(node).data('course_id');

            this.sendEventToApprove(courseId, eventId, 'review');
        };

        this.onSelectEventFilter    = function (node, event) {

            // define current tab
            let tab                 = $('.tabs-header a.is_active').attr('data-tab');

            eventsFilter            = $(node).val();

            event.preventDefault();
            this.renderEvents(tab);
        };


        this.onQuizzesDetails   = function(node, event) {

          event.preventDefault();

          let quizId            = $(node).attr("data-id");
          let quizFocus         = $(node).text();
          let text              = $("div[course-cycle-focus='title']").text();

          this.currentQuizId    = quizId;

          let hide_elements     = "#LessonList,.table-head-history";
          let show_elements     = ".table-head-quizzes,#QuizzesList";
          let data_quizzes      = {};

          that.renderLessons(data);

          $.when( this.getQuizData() ).then(function(details){

            data_quizzes["quizDetails"] = details;
            that.renderQuizzes(data_quizzes);

            $("div[course-cycle-focus='title']").text(text+" - "+quizFocus);
            $(hide_elements).addClass("hide");
            $(show_elements).removeClass("hide");

            //that.renderCycles(data);
          }).fail(function(status){
            if( status == 498 ) {

                that.user.logout();

                document.location.href="/";
            }
          });




        }

        this.onCourseCycles      = function(node, event) {

          event.preventDefault();

          let history            = [];
          let data               = {};
          let hide_elements      = "div[course-cycle-focus='title'],a[course-cycle-name='title'],div[course-cycle-focus='title-plain'],.table-style,#CyclesList,.table-head-cycles,#LessonList,.table-head-history,.table-head-quizzes,#QuizzesList";
          let show_elements      = "div[course-page-subtitle='text'],#CoursesList,.table-head-courses";

          history                = this.coursesHistory;

          var stats              = {
            inProgress: 0,
            passed: 0,
            total: 0,
            viewed: 0
          };
          for(let k in history){

            var item = history[k];

            if(history[k].start!=null){
              history[k].startDate = that.parseDateToString(that.unixTimestampToDate(item.start));
              history[k].total = stats.total+=1;
              if(history[k].passed!=null)
                stats.passed = stats.passed+1;
              if(history[k].finish == null)
                stats.inProgress = stats.inProgress+=1;
              else{
                stats.viewed = stats.viewed+=1;
                history[k].endDate = that.parseDateToString(that.unixTimestampToDate(item.finish));
              }


            history[k].history      = true;
            history[k].is_removable = false;
            }
          }

          data.stats       = stats;
          data.userCourses = history;

          $(".get-course-history__btn").addClass("active");
          $("a.bookmark").removeClass("active");
          $(hide_elements).addClass("hide");
          $(show_elements).removeClass("hide");

          this.renderCourses(data);
          this.renderStats(data);
          //$(".view__btn[data-view='list']").trigger("click");

          //$(".courses-table--certificate[data-history='change']").text(mui.mylearning.content.courses.statusField);
          $(".courses-table--actions[data-history='hide']").removeClass("hide");
        }

        this.onShowCycles = function(node,event){
          // continue func

          event.preventDefault();

          let courseName       = $(node).text();
          let courseId         = $(node).attr("data-id");
          let currentCourse    = {};
          let course_breadcrum = $("div[course-cycle-focus='title-plain']");
          let course_link      = $("a[course-cycle-name='title']");
          let hide_elements    = "div[course-cycle-focus='title'],a[course-cycle-name='title'],#CoursesList,.table-head-courses,div[course-page-subtitle='text'],#LessonList,.table-head-history,.table-head-quizzes,#QuizzesList";
          let show_elements    = "#CyclesList,.table-head-cycles,div[course-cycle-focus='title-plain']";

          this.currentCourseId = courseId;

          $.when( this.getCourseCycles() ).then(function(cycles){

            course_breadcrum.text(courseName);
            course_link.text(courseName);
            course_link.attr("data-id",courseId);
            course_link.attr("data-handler","onShowCycles");

            $(hide_elements).addClass("hide");
            $(show_elements).removeClass("hide");

            var data = {};
            data.userCourses = cycles;
            for(var i=0;i<cycles.length;i++){
              cycles[i].begin_date      = (that.unixTimestampToDate(cycles[i].tm_begin_date));
              cycles[i].watchedAll_date = (cycles[i].watchedAll_date!=null) ? (that.unixTimestampToDate(cycles[i].tm_watchedAll_date)) : null;
              cycles[i].reset_date      = (cycles[i].reset_date!=null) ? (that.unixTimestampToDate(cycles[i].tm_reset_date)) : null;
            }

            that.renderCycles(data);

          }).fail(function(status){
            if( status == 498 ) {

                that.user.logout();

                document.location.href="/";
            }
          });
        }

        this.onShowHistory = function(node,event){

          event.preventDefault();

          let cycleId       = node.attributes[1].nodeValue;
          let cycleFocus    = $(node).text();
          let hide_elements = "#CoursesList,.table-head-courses,#CyclesList,.table-head-cycles,div[course-cycle-focus='title-plain'],.table-head-quizzes,#QuizzesList";
          let show_elements = "a[course-cycle-name='title'],div[course-cycle-focus='title'],#LessonList,.table-head-history";

          this.currentCycleId = cycleId;
          $.when(this.getCourseLessons()).then(function(lessons){
            var data = {};
            data.userCourses = lessons;
            let time_start = "";
            let time_end   = "";
            var timestamp  = 0;
            //kechuni
            for(var i=0;i<lessons.length;i++){
              time_end = "";
              if(lessons[i].isQuiz==false){
                if(lessons[i].end_time!=""){
                  timestamp                       = parseInt(lessons[i].time_end_time+"000");
                  lessons[i].end_time  = new Date(timestamp).toLocaleString();
                }
                timestamp                        = parseInt(lessons[i].time_begin_time+"000");
                lessons[i].begin_time = new Date(timestamp).toLocaleString();
              }else{
                time_start = ", "+lessons[i].attempt_begin_date.split(" ")[1];
                timestamp                                = parseInt(lessons[i].time_begin_time+"000");
                lessons[i].attempt_begin_date = new Date(timestamp).toLocaleString();
                timestamp                                = parseInt(lessons[i].time_begin_time+"000");
                lessons[i].attempt_end_date   = new Date(timestamp).toLocaleString();
              }
            }

            that.renderLessons(data);

            $("div[course-cycle-focus='title']").text(" - "+cycleFocus);
            $(hide_elements).addClass("hide");
            $(show_elements).removeClass("hide");

          });
        }

        this.getCourseCycles    = function() {

          let promise           = $.Deferred();

          let studentId         = this.user.getUserId();
          let accountId         = this.user.getAccountId();

          let url               = 'accounts/0' + accountId
                                + '/students/0' + studentId
                                + '/courses/0' + this.currentCourseId
                                + '/history';

          let params            = {
            _method : 'GET',
            token   : that.user.getSessionId(),
            lang    : that.getLanguage()
          };

          this.remoteCall(new CallGet(url,params)).then(function (res) {
            promise.resolve(res.response);
          });

          return promise;
        };

      this.getQuizData        = function() {

        var promise           = $.Deferred();

        let studentId         = this.user.getUserId();
        let sessionId         = this.user.getSessionId();
        let accountId         = this.user.getAccountId();
        let courseId          = this.currentCourseId;
        let cycleId           = that.currentCycleId;
        let quizId            = that.currentQuizId;

        var url               = 'accounts/'+accountId+'/students/0'+studentId+'/courses/0'+courseId+'/history/0'+cycleId+'/quiz/0'+quizId;
        let params            = {

          _method : 'GET',
          token   : sessionId,
          lang    : that.getLanguage()

        };

        this.remoteCall(new CallGet(url,params)).then(function (res) {
          promise.resolve(res.response);
        });

        return promise;

      }

        this.getCourseLessons = function(){

          var promise   = $.Deferred();


          let studentId = this.user.getUserId();
          let accountId = this.user.getAccountId();
          let sessionId = this.user.getSessionId();

          let url = 'accounts/0'+accountId+'/students/0'+studentId+'/courses/0'+this.currentCourseId+'/history/0'+that.currentCycleId;
          let params = {
            _method : 'GET',
            token   : sessionId,
            lang    : that.getLanguage()
          };
          this.remoteCall(new CallGet(url,params)).then(function (res) {
            promise.resolve(res.response["lessons"]);
          });

          return promise;

        };

        this.getEvents              = function (tab, filter) {

            let promise             = $.Deferred();

            let studentId           = this.user.getUserId();

            let url                 = 'portals/0' + this.getPortalId() + '/events/';

            let params              = {
              token   : that.user.getSessionId(),
              lang    : that.getLanguage()
            };

            if(tab === 'my') {
                params['is_personal'] = true;
                // show only active
                params['is_active']   = true;
            } else if (tab === 'all') {
                // get all events
                //params['is_active']   = true;
                params['is_all']      = true;
            } else if (tab === 'archive') {
                params['is_archive']  = true;
            }

            if(isNotEmpty(filter) && tab !== 'all') {
                params['state']     = filter;
            }

            this.remoteCall(new CallGet(url,params)).then(function (res) {

                $.each(res.response, (index, item) => {

                    if(item.is_review || item.is_approved){
                        item.printURL = that.generateNewUrl('printCourseListForm/' + item.course_id
                            + '/event/' + item.event_id);
                    }

                });

              promise.resolve(res.response);
            });

            return promise;
        };

        this.onDropdownBtn      = function(node,event){

          event.preventDefault();

          let target_id = node.attributes[1].nodeValue;
          let x         = node.offsetLeft;
          let y         = node.offsetTop+32;

          $(".dropdown-content[data-target = '"+target_id+"']").offset({top:y});
          $(".dropdown-content[data-target = '"+target_id+"']").removeClass("hide");

          //let courseId  = node.attributes[0].nodeValue;
        };

        //--------------------------------------------------------------------------
        this.prepareCoursesList = ((courses, count = 10) => {

            let data = {};
            let coursesLeft = courses.length - count;

            if (coursesLeft > 0) {
                data.showMoreBtn = true;
                data.showMoreBtnCount = coursesLeft > 10 ? 10 : coursesLeft;
            }
            data.userCourses        = courses.slice(0, count);
            viewData.showedCourses  = data.userCourses.length;

            let stats               = this.prepareStats(courses);

            $.extend(data, {view: viewData}, {stats: stats});

            //additional information about a current course
            if(currentCourseList !== null) {
                data.printURL = this.generateNewUrl('printCourseListForm/' + (currentCourseList.cloned_from_list_id || currentCourseList.id));
                if(currentCourseList.status === 'confirmation') {
                    data.isConfirmation = true;
                }
            }

            return data;
        });

        //--------------------------------------------------------------------------
        this.generateCoursesByCategory  = (data, coursesByCategories = null, toShowByList = null) => {

            let type                = viewData.bookmark;

            if(type !== 'all' && type !== 'assigned') {
                data['categories']  = [{'category': ''}];
                return;
            }

            // apply filter assigned if defined
            let categories          = $.extend([], userCoursesByCategories);

            if(isNotEmpty(coursesByCategories)) {
                categories          = $.extend([], coursesByCategories);
            }

            // clone categories
            for(let i in categories) {
                if(categories.hasOwnProperty(i)) {
                    categories[i]   = $.extend({}, categories[i]);
                }
            }

            if(type === 'assigned') {

                let categoriesNew   = [];

                // remove not assigned
                for(let i in categories) {
                    if(categories.hasOwnProperty(i) && isNotEmpty(categories[i]['is_assigned'])) {
                        categoriesNew.push($.extend({}, categories[i]));
                    }
                }

                categories          = categoriesNew;
            }

            // define showMoreBtn
            for(let i in categories) {
                if(categories.hasOwnProperty(i)) {
                    let toShow      = null;

                    if(toShowByList !== null && isNotEmpty(toShowByList[categories[i]['list_id']])) {
                        toShow      = toShowByList[categories[i]['list_id']];
                    }

                    this.defineShowMoreBtn(categories[i], toShow);
                }
            }

            data['categories']      = categories;
        };

        this.defineShowMoreBtn      = (category, count = null) => {

            if(isEmpty(count)) {
                count               = 10;
            }

            let courses             = category['userCourses'];
            let coursesLeft         = courses.length - count;

            category.showMoreBtn        = coursesLeft > 0;
            category.showMoreBtnCount   = coursesLeft > 10 ? 10 : coursesLeft;

            category.userCourses        = courses.slice(0, count);
        };

        this.coursesFilterByAccess  = (accessType) => {

            currentCourseList       = null;

            let exists              = {};

            if (accessType === 'all') {

                let allCourses      = [];

                $.each(userCourses, function (i, course) {

                    if(course.isNew || course.is_archived) {
                        return true;
                    }

                    if(isNotEmpty(exists[course['courseID']])) {
                        return true;
                    }

                    exists[course['courseID']] = true;

                    allCourses.push(course);
                });

                return allCourses;
            }

            return userCourses.filter((course) => {

                if(isNotEmpty(exists[course['courseID']])) {
                    return false;
                }

                let isTrue          = course.accessType === accessType && course.status != 'confirmation';

                if(!isTrue) {
                    return false;
                }

                exists[course['courseID']] = true;

                return true;
            });
        };

        this.coursesFilterByList    = (listName) => {

            let courses             = [];

            $.each(userCoursesLists, function(i, list) {

                let currentList     = that.generateListId(list);

                if(currentList == listName) {

                    currentCourseList = list;

                    courses         = list.contents;
                    return false;
                }
            });

            return courses;
        };

        this.getCoursesByListId     = (listId) => {

            let courses             = null;

            for (let i in userCoursesByCategories) {

                if(userCoursesByCategories[i]['list_id'] === listId) {
                    courses         = userCoursesByCategories[i]['userCourses'];
                    break;
                }
            }

            if(isNotEmpty(courses)) {
                courses             = $.extend([], courses);
            }

            return courses;
        };

        this.onShowMore             = (node, event) => {

            event.preventDefault();

            let type                = viewData.bookmark;

            // define current list of courses
            let $mainNode           = $(node).closest('[data-list-id]');
            let listId              = $mainNode.attr('data-list-id');
            let courses             = null;

            if(isNotEmpty(listId)) {
                // define courses for listId
                courses             = this.getCoursesByListId(listId);
            } else if(type === 'all' || type === 'assigned' || type === 'chosen') {
                courses             = this.coursesFilterByAccess(type);
            } else {
                courses             = this.coursesFilterByList(type);
            }

            let toShow              = courses.length - viewData.showedCourses > 10 ? viewData.showedCourses + 10 : courses.length;

            let coursesByCategories = null;

            let data                = this.prepareCoursesList(courses, toShow);

            if(isNotEmpty(listId)) {
                toShowByList[listId]  = toShow;
                this.renderCourses(data, null, toShowByList);
            } else {
                this.renderCourses(data);
            }
        };

        this.onSortCourses          = (node, event) => {

            event.preventDefault();

            if ($(node).hasClass('active')) {
                return;
            }

            $("[rel='sort'] a.active").removeClass('active');
            $(node).addClass('active');

            let type                = $(node).data('type');
            let dir                 = $(node).data('dir');

            // define current list of courses
            let $mainNode           = $(node).closest('[data-list-id]');
            let listId              = $mainNode.attr('data-list-id');

            let data                = null;
            let courses             = null;

            if(isNotEmpty(listId)) {
                // define courses for listId
                courses             = this.getCoursesByListId(listId);
            }

            courses                 = this.sortCourses(type, dir, courses);

            let coursesByCategories = null;

            if(isNotEmpty(listId)) {
                coursesByCategories = $.extend([], userCoursesByCategories);

                for(let i in coursesByCategories) {
                    if(coursesByCategories[i]['list_id'] === listId) {
                        coursesByCategories[i]['userCourses'] = courses;
                    }
                }
            }

            data                    = this.prepareCoursesList(courses, viewData.showedCourses);

            if(coursesByCategories !== null) {
                this.renderCourses(data, coursesByCategories);
            } else {
                this.renderCourses(data);
            }
        };

        this.onChangeView           = (node, event) => {

            event.preventDefault();

            if ($(node).hasClass('active')) {
                return;
            }

            $("[rel='view'] a.active").removeClass('active');
            $(node).addClass('active');

            let view                = $(node).data('view');

            for (let type in viewData.style) {
                viewData.style[type] = view === type;
            }

            let data                = [];

            if(!!~['all', 'assigned', 'chosen', 'archived'].indexOf(viewData.bookmark)) {
                data                = this.prepareCoursesList(this.coursesFilterByAccess(viewData.bookmark));
            } else {
                //for tabs asigned lists
                data                = this.prepareCoursesList(this.coursesFilterByList(viewData.bookmark));
            }

            this.renderCourses(data);
            localStorage.setItem('myLearning_style', view);

            if (view === 'list') {
                $("[rel='learning-head']").show();
            } else {
                $("[rel='learning-head']").hide();
            }
        };

        this.renderLessons = (data) => {

          $.extend(data,{
            mui: this.getMainData().mui,
            IMG: this.getMainData().IMG,
            pageMui: pageMuiData
          });

          this.renderTo(historyTemplate, data, '#' + historyId);
          this.assignPageHandlers('#' + historyId, this, true);

        };

        this.renderCycles = (data) => {


          $.extend(data,{
            mui: this.getMainData().mui,
            pageMui: pageMuiData,
            IMG: this.getMainData().IMG
          });


          this.renderTo(cyclesTemplate, data, '#' + cyclesId);
          this.assignPageHandlers('#' + cyclesId, this, true);

        };

        this.renderQuizzes           = (data) => {

          $.extend(data,{

            mui: this.getMainData().mui,
            pageMui: pageMuiData

          });

          this.renderTo(quizzesTemplate, data, '#' + quizzesId);
          this.assignPageHandlers('#' + quizzesId, this, true);

        };

        this.renderCourses          = (data, coursesByCategories = null, toShow = null) => {

            this.generateCoursesByCategory(data, coursesByCategories, toShow);

            $.extend(data, {
                mui:     this.getMainData().mui,
                view:    viewData,
                IMG:     this.getMainData().IMG,
                pageMui: pageMuiData,
                courseListDuration: this.defineCourseListDuration(data.userCourses)
            });

            this.renderTo(coursesTemplate, data, '#' + coursesId);
            this.assignPageHandlers('#' + coursesId, this, true);
            $('[data-tab="action"]').addClass('active');
        };

        this.renderEvents           = (tab) => {

            if(isEmpty(tab)) {
                tab                 = 'my';
            }

            let stats               = that.userCourses.getStats(true);

            if(tab !== 'archive' && isNotEmpty(stats['events']) && isEmpty(stats['events']['count_register'])) {
                tab                 = 'all';
            }

            this.getEvents(tab, eventsFilter).done(function (events) {

                // format events
                that.formatEvents({'events': events});

                let mui             = that.getMainData().mui;

                if(isNotEmpty(mui['mylearning']) && isNotEmpty(mui['mylearning']['event']))
                {
                    mui             = mui['mylearning']['event'];
                }

                for(let i in events) {

                    if(!events.hasOwnProperty(i)) {
                        continue;
                    }

                    if(events[i]['type'] === 'online') {
                        events[i]['type'] = mui['online'];
                    } else if(events[i]['type'] === 'offline') {
                        events[i]['type'] = mui['offline'];
                    }

                    if(isNotEmpty(mui[events[i]['status']])) {
                        events[i]['status'] = mui[events[i]['status']];
                    }

                    if(isNotEmpty(events[i]['ceid'])) {
                        events[i]['url']  = that.config['basePath'] + 'en' + '/library/' + events[i]['ceid'] + '/course/' + that.rewriteTitletoUrl(events[i]['title']);
                    }

                    let message     = that.defineEventMsg(events[i]);

                    if(isNotEmpty(message)) {
                        events[i]['event_message'] = message;
                    }
                }

                let data            = $.extend({}, that.getMainData(), {
                    'mui':          that.getMainData().mui,
                    'view':         viewData,
                    'IMG':          that.getMainData().IMG,
                    'pageMui':      pageMuiData,
                    'events':       events
                });

                that.renderTo(eventsTemplate, data, '#' + eventListId);
                that.assignPageHandlers('#' + eventListId, that, true);

                let $component      = $('#' + eventListId);

                $component.find('.tabs-header').find('.tab-toggle').removeClass('is_active');
                $component.find('.tab-toggle[data-tab=' + tab + ']').addClass('is_active');

                if(isEmpty(stats['events']['count_register'])) {
                    tab                 = 'all';
                    $component.find('.tab-toggle[data-tab=my]').addClass('hide');
                } else {
                    $component.find('.tab-toggle[data-tab=my]').removeClass('hide');
                }

                if(isNotEmpty(eventsFilter)) {
                    $('#eventFilter').val(eventsFilter);
                }

                if(tab === 'all') {
                    $('#eventFilter').addClass('hidden');
                }
            });
        };

        this.renderStats  = (data) => {

            $.extend(data, {
                mui:     this.getMainData().mui,
                pageMui: pageMuiData
            });

            this.renderTo(statsTemplate, data, '#' + statsId);
        };

        this.sortCourses            = (type = 'name', dir = 'asc', courses = null) => {

            if(courses === null) {
                if(viewData.bookmark === 'all' || viewData.bookmark === 'assigned' || viewData.bookmark === 'chosen') {
                    courses             = this.coursesFilterByAccess(viewData.bookmark);
                } else {
                    courses             = this.coursesFilterByList(viewData.bookmark);
                }
            }

            switch (type) {

                case 'name': return dir === 'asc' ? courses.sort(this.sortByNameAsc) : courses.sort(this.sortByNameDesc); break;
                case 'progress': return dir === 'asc' ? courses.sort(this.sortByProgressAsc) : courses.sort(this.sortByProgressDesc); break;
                case 'viewed': return dir === 'asc' ? courses.sort(this.sortByViewedAsc) : courses.sort(this.sortByViewedDesc); break;
                case 'date': return dir === 'asc' ? courses.sort(this.sortByDateAsc) : courses.sort(this.sortByDateDesc); break;
                default: return courses;
            }
        };

        this.unixTimestampToDate    = function (timestamp) {

            if(typeof timestamp !== 'number') {

                return null;
            }

            return new Date(timestamp * 1000).toDateString();
        };

        this.parseDateToString = function (date) {
          return new Date(date).toDateString();
        }

        this.sortByNameAsc = (courseA, courseB) => {

            if (courseA.title.toLowerCase() > courseB.title.toLowerCase()) {
                return 1
            } else {
                return -1;
            }

        };

        this.sortByNameDesc = (courseA, courseB) => {

            if (courseA.title.toLowerCase() < courseB.title.toLowerCase()) {
                return 1
            } else {
                return -1;
            }

        };

        this.sortByProgressAsc = (courseA, courseB) => {

            if (courseA.progress > courseB.progress) {
                return 1
            } else {
                return -1;
            }

        };

        this.sortByProgressDesc = (courseA, courseB) => {

            if (courseA.progress < courseB.progress) {
                return 1
            } else {
                return -1;
            }

        };

        this.sortByViewedAsc = (courseA, courseB) => {

            if (courseA.viewed/courseA.totalLessons > courseB.viewed/courseB.totalLessons) {
                return 1
            } else {
                return -1;
            }

        };

        this.sortByViewedDesc = (courseA, courseB) => {

            if (courseA.viewed/courseA.totalLessons < courseB.viewed/courseB.totalLessons) {
                return 1
            } else {
                return -1;
            }

        };

        this.sortByDateAsc = (courseA, courseB) => {


            if (courseA.start > courseB.start) {
                return 1
            } else {
                return -1;
            }

        };

        this.sortByDateDesc = (courseA, courseB) => {

            if (courseA.start < courseB.start) {
                return 1
            } else {
                return -1;
            }

        };

        this.onRemoveCourse         = function (node, event) {

            event.preventDefault();

            var courseId            = $(node).attr('data-id');

            if(courseId === null) {
                return false;
            }

            const that              = this;

            this.userCourses.removeCourse(courseId).done(function () {
                that.invalidateMain();
                that.reload();
            });
        };

        this.onSendForConsideration = function (node, event) {

            event.preventDefault();

            var courseListId        = $(node).attr('data-id');

            if(courseListId === null) {
                return false;
            }

            const that              = this;

            this.userCourses.sendForConsideration(courseListId).done(function () {
                that.showAlert(that.getMainData().pageMui.toApproveMessage).done(function (modalWindow) {
                    modalWindow.bindOnClose(function () {
                        that.invalidateMain();
                        that.reload();
                    });
                });
            });
        };

        this.generateListId         = function (list) {

            if(typeof list['id'] === 'undefined') {
                list['id']          = null;
            }

            return list['id'] ? list['id'].toString().replace(/[\.\s\'\`,:-]+/g, '') : list.name.toString().replace(/[\.\s\'\`,:-]+/g, '');
        };

        this.defineCourseListDuration = function(courses)
        {
            if (courses.isNew) {
                return null;
            }

            //calculate trt for all courses
            var courseListDuration = 0;
            $.each(courses, function(index, item){
                courseListDuration += item['runtime_sec'] || 0;
            });

            return that.formatSecondsToHrs(courseListDuration);
        };

        this.prepareStats           = function (courses) {

            let stats = {
                total:0,
                passed:0,
                inProgress:0,
                viewed:0
            };

            stats.total             = courses.length;

            stats.passed            = courses.filter((course) => {
                return course.passed !== null;
            }).length;

            stats.inProgress        = courses.filter((course) => {
                return course.progress !== 0 && course.progress !== 100;
            }).length;

            stats.viewed            = courses.filter((course) => {
                return course.progress == 100
            }).length;

            return stats;
        };

        this.onRemoveGeneratedCourse             = function (n, event) {

            event.preventDefault();

            let courseID            = $(n).attr('data-id');
            let progress            = $(n).attr('data-progress');
            let listID              = $(n).attr('data-list');
            let access              = $(n).attr('data-access');
            let msg                 = this.getMainData().mui.mylearning.content.course.removeMessage;
            let coursesView         = localStorage.myLearning_style ? localStorage.myLearning_style : 'def';

            if(progress != 0) {
                msg                 += this.getMainData().mui.mylearning.content.course.removeProgressMessage;
            }

            this.showConfirm(msg, function($alert){

                let promise         = $.Deferred();

                var deleteProgress  = $alert.find('[name^=removeProgress]').prop('checked');
                var apiUrl          = 'courses/0'+ courseID +'/list/'+ listID +'/';
                var params          =  {
                                        _method : 'PUT',
                                        studentGUID: that.user.getUserId(),
                                        token: that.user.getSessionId()
                                       };
                if(deleteProgress) {
                    params.deleteProgress = 1;
                }
                $('#loading-overlay').fadeIn(300);
                that.remoteCall(new CallPost(apiUrl, params, function (response) {

                    promise.resolve(response['response']);

                    that.removeCourseFromList(access, courseID,listID);
                    $(n).parent().parent().remove();

                    //that.reload();
                    $('#loading-overlay').fadeOut(300);

                }).defineErrorHandler(function (query, status, msg, response) {

                    promise.reject(status);

                    $('#loading-overlay').fadeOut(300);

                    console.log(response['response']);
                }));

                 promise.resolve();
                 return promise;
            }, this.getMainData().mui.buttonLabel.delete);

        };

        this.removeCourseFromList             = function (access,courseID,listID) {

            userCourses         = [];

            this.userCourses.getUsersCourses().done(function (resCourses) {

                $.when(that.prepareUserCourses(resCourses)).then(function () {

                    userCoursesLists = resCourses.assigned;

                    let prefix      = access === 'chosen' ? 'chosen' : that.generateListId({id:listID});

                    prefix          = localStorage.bookmark ? localStorage.bookmark : prefix;

                    $('#bookmark-'+ prefix).trigger('click');
                    var count       = $('#bookmark-'+ prefix).find('span').text();
                    count           = (count - 1) >=  0 ? count - 1 : 0;
                    $('#bookmark-'+ prefix).find('span').html(count);
                });

                //resCourses = resCourses.filter(function( obj ) {return obj.id !== courseID;});
                resCourses = $.grep(resCourses, function(data, index) {return data.id !== courseID;});

            });
        };

        this.onChangeFlatTab        = function (n,e) {

            e.preventDefault();

            $(n).closest('div').find('a').removeClass('active');
            $(n).addClass('active');

            var tab                 = $(n).data('tab');

            $(n).closest('.flat-item__inner').find('.flat-item__info').addClass('hidden');
            $(n).closest('.flat-item__inner').find('.' + tab).removeClass('hidden');

        };

        this.checkAccessToCourse       = function(courseId){

            let accessPromise           = $.Deferred();

            this.remoteCall(new CallGet(
                'portals/0' + this.getPortalName() + '/course/0' + courseId + '/userdata/',
                {
                    token: this.user.getSessionId()
                },
                (data) => {
                    if(data.response.is_access){
                        accessPromise.resolve();
                    }else {
                        accessPromise.reject();
                    }
                }
            ).defineErrorHandler((query, status) => {
                accessPromise.reject();
            }));

            return accessPromise;
        }
    }

    MyLearning.prototype               = Object.create(Page.prototype);
    MyLearning.prototype.constructor   = MyLearning;

    return MyLearning;
});
