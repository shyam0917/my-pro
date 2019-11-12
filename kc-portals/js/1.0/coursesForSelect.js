;define(['jquery', 'lib/Page', 'lib/CallGet', 'ui/ModalWindow'],
    function($, Page, CallGet, ModalWindow){

    function CoursesForSelect() {

        const LIMIT = 20;
        let data = {};

        Page.call(this);

        this.getClassName              = function () {
            return 'CoursesForSelect';
        };

        this.defineContent             = function () {

            if(!this.user.isAuth()) {
                return;
            }

            return $.when(
                this.getPageMui(),
                this.userCourses.getAllCourses(true),
                this.getLangs(),
                this.getCourses()
            ).done((res, userCourses) => {

                let content = this.handleContentData(data);

                content.courses.forEach((courseItem) => {

                    courseItem.isAdd = false;

                    for(let i in userCourses.assigned){

                        if(userCourses.assigned[i].courses.indexOf(courseItem.course_id) >= 0){
                            courseItem.isAdd = true;
                            break;
                        }
                    }
                });

                content.myLearningUrl   = this.generateNewUrl('myLearning');
                content.isRequestAccess = true;

                this.setContentData($.extend(content, res));
            });
        };


        this.getCourses                 = function () {

            var params                  = {
                'token':                this.user.getSessionId(),
                'lang':                 this.getLanguage(),
            };

            return this.remoteCall(new CallGet('portals/course_lists/for_selection/', params,
                function(res) {

                return $.extend(data, {'courses': res.response});

            }).asCached().asLocalCached()
                .defineErrorHandler(() => {
                    console.log('404 redirect in courseForSelect.getCourses');
                 this.redirect('page404');
            }));

        };

        this.getLangs                   = function () {

            return $.ajax({
                cache: true,
                url: this.config.basePath + 'json/langs--v'+this.config.LocalStorageStamp+'.json',
                dataType: "json",
                success: function(res) {
                    return $.extend(data, {'langs': res});
                }
            });
        };

        this.parseLangs             = function (codes) {

            let dataCodes           = data.langs.map((dataCode) =>dataCode.codeISO6391);

            return codes.filter((code) => ~this.config.languages.indexOf(code)).map(function (code) {

                let index = dataCodes.indexOf(code);

                if (~index) {
                    return data.langs[index].native;
                }


            }).join(', ');

        };

        this.handleContentData      = function (data) {

            let courses             = [];

            $.each(data.courses, function (id, course) {

                // for class
                if(course['course_format'] === 'class') {
                    course.is_not_quiz      = true;
                    course.is_no_video      = true;
                    course.is_class         = true;
                }
                try{if(!course.quiz.hasQuiz) course.is_not_quiz    = true;}catch(e){}

                courses.push(course);
            });

            return {

                courses: courses
                    .map((course) => {

                        this.userCourses.formatDescription(course, this.getMui());

                        return {
                            url:            this.generateNewUrl(`courses/${course.ceid}`),
                            title:          course.title,
                            description:    course.description,
                            lessons:        course.totalLessons ? course.totalLessons : null,
                            img:            `${this.config.CDNContent}previews/${course.id}.jpg`,
                            author:         course.author,
                            runtime:        course.is_class ? null : course.trt,
                            is_no_video:    course.is_no_video,
                            is_not_quiz:    course.is_not_quiz,
                            city:           course.city,
                            address:        course.address,
                            lesson_id:      course.introGUID,
                            course_id:      course.id,
                            lesson_type:    course.introType,
                            isNew:          course.new,
                            langs:          this.parseLangs(course.langs)
                        }
                }),
                metaData: {},
                pagination: {}
            };
        };

        this.defineSectionName         = function () {

            if(typeof this.currentPath === 'undefined') {
                throw new Error('currentPath undefined');
            }

            if(!this.currentPath[1]) {
                return null;
            }

            if(!isNaN(this.currentPath[1])) {
                return null;
            }

            return this.currentPath[1].replace(/-/g, " ");

        };

        this.defineCategoryCode        = function () {

            if(typeof this.currentPath === 'undefined') {
                throw new Error('currentPath undefined');
            }

            if(typeof this.currentPath[2] === 'undefined') {
                return null;
            }

            if (!isNaN(this.currentPath[2])) {

                return null

            }

            return this.currentPath[2];
        };

        this.defineCategoryName        = function() {

            if(typeof this.currentPath === 'undefined') {
                throw new Error('currentPath undefined');
            }

            if(typeof this.currentPath[3] === 'undefined') {
                return null;
            }

            if (!isNaN(this.currentPath[3])) {

                return null

            }

            return this.currentPath[3].replace(/-/g, " ");

        };

        this.definePageNum             = function () {

            if (this.currentPath[4]) {

                return this.currentPath[4];

            }

            if (this.currentPath[3] && !isNaN(this.currentPath[3])) {

                return this.currentPath[3];

            }

            if (this.currentPath[2] && !isNaN(this.currentPath[2])) {

                return this.currentPath[2];

            }

            if (this.currentPath[1] && !isNaN(this.currentPath[1])) {

                return this.currentPath[1];

            }

            return 1;


        };

        this.definePagination          = function(totalCourses) {

            let totalPages      = Math.ceil(totalCourses/LIMIT),
                pages           = [];

            for(let i = 0; i < totalPages; i++) {

                let from        = 1 + (i*LIMIT),
                    to          = LIMIT * (i+1);

                pages.push({
                    caption: from + ' - ' + to,
                    active: this.definePageNum() == i + 1,
                    url: this.generateNewUrl('library/'
                        + (this.defineSectionName() ? this.defineSectionName() + '/' : '')
                        + (this.defineCategoryCode() ? this.defineCategoryCode() + '/' : '')
                        + (this.defineCategoryName() ? this.defineCategoryName() + '/' : '')
                        + (i + 1))
                })

            }

            if (!this.definePageNum()) {

                pages[0].active = true;

            }
            return pages;

        };

        this.onAddCourse               = function (element, event) {

            event.preventDefault();

            const that                 = this;

            let course_id              = $(element).data('course_id');

            this.userCourses.addCourseToList(course_id).always(function () {

                that.showCourseAlert().done(function (modalWindow) {

                    $(element).addClass('is_hidden')
                        .siblings('.is_hidden').removeClass('is_hidden');
                });
            });
        };

        this.showCourseAlert        = function () {

            var selector            = '#addedCourseModal';
            var $alert              = $(selector);

            var modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        true
            });

            return modalWindow.show()
                .done(function () {
                    modalWindow.getModalNode()
                        .find('[rel^=close]')
                        .bind('click', function () {
                                modalWindow.close();
                            });
                });
        };


    }

    CoursesForSelect.prototype               = Object.create(Page.prototype);
    CoursesForSelect.prototype.constructor   = CoursesForSelect;

    return CoursesForSelect;
});
