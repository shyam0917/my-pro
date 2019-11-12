;define(['jquery', 'lib/CallGet', 'lib/CallPut', 'lib/CallPost', 'lib/CallDelete'],
    function ($, CallGet, CallPut, CallPost, CallDelete) {

    function UserCourses(user, service, portalName, language) {

        /**
         * User
         * @type {User}
         */
        this.user                   = user;
        /**
         * Remote service
         * @type {RemoteService}
         */
        this.service                = service;

        /**
         * User Courses With History
         * @type {{}|null}
        */
        var coursesHistory          = null;

        /**
         * User Courses
         * @type {{}|null}
         */
        var usersCourses            = null;

        /**
         *
         * @type {Promise|null}
         */
        var usersCoursesPromise     = null;

        /**
         * Stat for lesson by courses
         * @type {{}}
         */
        var lessonsStats            = {};

        /**
         * Common stats
         * @type {{}|null}
         */
        var commonStats             = null;

        /**
         * Returns an promise that returns the data statistics lessons.
         *
         * @return {Promise|{}}
         */
        this.getStats               = function (isNoWait) {

            if(isNotEmpty(isNoWait)) {
                return commonStats;
            }

            var promise             = $.Deferred();

            if(commonStats !== null) {

                promise.resolve(commonStats);
                return promise;
            }

            this.getUsersCourses().done(function () {

                promise.resolve(commonStats);

            }).fail(function (status, errorThrown) {
                promise.reject(status, errorThrown);
            });

            return promise;
        };

        /**
         *
         * @return {Promise}
         */
        this.getHistoryCourses    = function () {

            var promise             = $.Deferred();

            this.getUsersCourses().done(function (usersCourses) {

                promise.resolve(usersCourses['coursesHistory']);

            }).fail(function (status, errorThrown) {
                promise.reject(status, errorThrown);
            });

            return promise;
        };

        /**
         *
         * @return {Promise}
         */
        this.getAssignedCourses    = function () {

            var promise             = $.Deferred();

            this.getUsersCourses().done(function (usersCourses) {

                promise.resolve(usersCourses['assigned']);

            }).fail(function (status, errorThrown) {
                promise.reject(status, errorThrown);
            });

            return promise;
        };

        /**
         *
         * @return {Promise}
         */
        this.getChosenCourses       = function () {

            var promise             = $.Deferred();

            this.getUsersCourses().done(function (usersCourses) {

                promise.resolve(usersCourses['chosen']);

            }).fail(function (status, errorThrown) {
                promise.reject(status, errorThrown);
            });

            return promise;
        };

        /**
         *
         * @param {boolean=}        byType
         *
         * @return {Promise}
         */
        this.getAllCourses          = function (byType) {

            return this.getUsersCourses();
        };

        /**
         *
         * @return {Promise}
         */
        this.getUsersCourses        = function () {

            if(usersCoursesPromise !== null) {
                return usersCoursesPromise;
            }

            var promise             = $.Deferred();

            usersCoursesPromise     = promise;

            usersCourses      = null;

            if(usersCourses !== null) {

                promise.resolve(usersCourses);
            }

            const self              = this;

            //this.user.getSessionId(); this fails when you go from myLearning to Library


            var params              = {

                'token':            this.user.getSessionId(),
                'portal':           portalName,
                'lang':             language,
                '_extend':          'license,users_courses,simple_stats,courses_history'
            };

            service.query(new CallGet('portals/myLearning/', params, function (response) {


                self.handleUsersCourses(response.response);
                promise.resolve(usersCourses);
                usersCoursesPromise = null;

            }).defineErrorHandler(function (query, status, errorThrown) {
                promise.reject(status, errorThrown);
                usersCoursesPromise = null;

            }));

            return promise;
        };

        /**
         *
         * @return {Promise}
         */
        this.getCourseStats         = function (courseID) {

            var promise             = $.Deferred();

            if(typeof lessonsStats[courseID] !== 'undefined') {

                promise.resolve(lessonsStats[courseID]);

                return promise;
            }

            var params              = {'token': this.user.getSessionId()};

            var statPromise         = this.service.query
            (new CallGet('portals/learning/course/0' + courseID + '/', params, function (data) {

                lessonsStats[courseID] = {};

                $.each(data.response, function (index, lesson) {

                    lessonsStats[courseID][lesson['lesson_id']] = lesson;
                });
            }));

            $.when(statPromise, this.getUsersCourses()).then(function () {

                if(typeof lessonsStats[courseID] !== 'undefined') {
                    promise.resolve(lessonsStats[courseID]);
                }else{
                    promise.resolve({});
                }
            });

            return promise;
        };

        this.defineLessonAttributes = function (course, lesson, lessonCount, openLessons) {

            // is lesson watched?
            lesson.isWatched        = (typeof lesson['end_time'] !== 'undefined' && lesson['end_time'] > 0);

            // new code for learning path (Dmitriy)
            if(typeof course['is_access'] !== 'undefined') {
                lesson['is_access'] = course['is_access'];
            }

            // is_assigned
            if(typeof course['is_assigned'] !== 'undefined') {
                lesson['is_assigned'] = course['is_assigned'];
            }

            //if(this.isLessonAvailable(course['courseID'], lesson) || lessonCount <= openLessons) {
            if( lesson.is_open == 1 ||
                lesson.is_preview == 1 ||
                (lesson.is_open == 0 || !lesson.is_open) && this.isLessonAvailable(course['courseID'], lesson) ||
                !lesson.is_open && lesson.is_open != 0 && lessonCount <= openLessons
            ) {
                lesson.noAccess     = false;
                lesson.isAccess     = true;

            } else {
                lesson.noAccess     = true;
                lesson.isAccess     = false;
            }

            return lesson;
        };

        this.isLessonAvailable      = function (courseID, lesson) {

            // new code for learning path (Dmitriy)

            if(typeof lesson['is_access'] !== 'undefined') {
                return lesson['is_access'];
            }

            if(usersCourses === null || typeof usersCourses['assigned'] === 'undefined' || this.user.license === null) {
                return false;
            }

            var isAvailable         = false;
            var isPassedAssigned   = true;

            $.each(usersCourses['assigned'], function (index, course) {

                if(course['courseID'] == courseID) {

                    isAvailable     = true;

                    // break loop
                    return false;
                }

                if(course['finish'] === null) {

                    isPassedAssigned = false;
                }
            });

            // If this course is Assigned then his is always available
            if(isAvailable === true) {
                return true;
            }

            // If assigned courses are not passed returns false
            return isPassedAssigned !== false;
        };

        this.isPassedAssigned      = function () {

            if(usersCourses === null || typeof usersCourses['assigned'] === 'undefined') {
                return false;
            }

            var isPassedAssigned   = true;

            $.each(usersCourses['assigned'], function (index, course) {

                if(course['finish'] === null) {

                    isPassedAssigned = false;
                }
            });

            return isPassedAssigned;
        };

        /**
         * Save stats for lesson
         *
         * @param {string} courseID
         * @param {string} lessonID
         * @param {string|null=} progressID
         *
         * @return {Promise}
         */
        this.saveLessonStats        = function (courseID, lessonID, progressID) {

            if(typeof progressID === 'undefined') {
                progressID          = null;
            }

            var promise             = $.Deferred();
            const self              = this;

            var params              = {

                'token':            this.user.getSessionId(),
                'lessonID':         lessonID,
                'progress_id':      progressID,
                'lang':             language,
                'status':           progressID ? 'watched' : 'start'
            };

            service.query(new CallPut('portals/learning/course/0' + courseID + '/', params, function (response) {

                self.resetState();
                promise.resolve(response['response']['progress_id']);

            }).defineErrorHandler(function (status, message) {

                promise.reject(status, message);
            }));

            return promise;
        };

        /**
         * Returns Certificate information
         *
         * @param   {string}        certificateID
         * @return  {Promise}
         */
        this.getCertificate         = function (certificateID) {

            var promise             = $.Deferred();

            var params              = {
                'token':            this.user.getSessionId()
            };

            this.service.query(new CallGet('students/0' + this.user.getUserId() + '/certificates/0' + certificateID,
            params,
            function (response) {
                promise.resolve(response.response);
            }).defineErrorHandler(function (query, status, errorThrown) {
                console.error("Error getCertificate " + status + ":" + errorThrown);
                promise.reject(query, status, errorThrown);
            }));

            return promise;
        };

        /**
         *
         * @param {string} courseID
         * @return {{}|null}
         */
        this.getQuizStats           = function (courseID) {

            if(typeof usersCourses['assigned'][courseID] === 'undefined'
            || typeof usersCourses['assigned'][courseID]['quiz'] === 'undefined') {
                return null;
            }

            return usersCourses['assigned'][courseID]['quiz'];
        };

        /**
         *
         * @param {string} courseID
         * @return {boolean}
         */
        this.isQuizAllowed          = function (courseID) {

            var quiz                = this.getQuizStats(courseID);

            return quiz !== null && quiz['isAllowed'] === true;
        };

        this.markLessonsAsWatched   = function (courseID) {

            var promise             = $.Deferred();

            if(this.user.isTest() === false) {

                promise.reject();
                return promise;
            }

            var params              = {
                'token':            this.user.getSessionId(),
                'lang':             language
            };

            const self              = this;

            service.query(new CallPost('portals/learning/course/0' + courseID + '/', params, function (response) {

                self.resetState();
                promise.resolve(response['response']);

            }).defineErrorHandler(function () {

                promise.reject();
            }));

            return promise;
        };

        this.addCourseToList        = function (courseID) {

            var promise             = $.Deferred();
            var params              = {
                'token':            this.user.getSessionId(),
                'course_id':        courseID
            };

            const that              = this;

            service.query(new CallPost('portals/course_lists/new/course/', params, function (response) {

                that.resetState();
                promise.resolve(response['response']);

            }).defineErrorHandler(function () {
                promise.reject();
            }));

            return promise;
        };

        this.sendForConsideration   = function (courseListId) {

            var promise             = $.Deferred();
            var params              = {
                'token':            this.user.getSessionId(),
                'course_list_id':   courseListId
            };

            const that              = this;

            service.query(new CallPost('portals/course_lists/new/consideration/', params, function (response) {

                that.resetState();
                promise.resolve(response['response']);

            }).defineErrorHandler(function () {
                promise.reject();
            }));

            return promise;
        };

        this.removeCourse           = function (courseId) {

            var promise             = $.Deferred();
            var params              = {
                'token':            this.user.getSessionId(),
                'course_id':        courseId
            };

            const that              = this;

            service.query(new CallDelete('portals/course_lists/new/course/', params, function (response) {
                that.resetState();
                promise.resolve(response['response']);
            }));

            return promise;
        };

        this.handleUsersCourses     = function (data) {

            if(typeof data['stats'] === 'undefined') {
                console.error('Wrong server response: stats undefined');
                return;
            }

            var stats               = data['stats'];

            if(typeof data['license'] === 'undefined') {
                console.error('Wrong server response: license undefined');
                return;
            }

            this.user.license       = data['license'];

            if(typeof data['courses_list'] === 'undefined') {
                console.error('Wrong server response: courses_list undefined');
                return;
            }

            if(typeof data['courses'] === 'undefined') {
                console.error('Wrong server response: courses undefined');
                return;
            }

            var coursesList         = data['courses_list'];

            commonStats             = {
                'total':            stats['total'],
               	'passed':           stats['tests_passed'],
               	'inProgress':       stats['in_progress'],
               	'viewed':           stats['viewed'],
               	'daysLeft':         stats['license_duration'],
                'events':           stats['events'],
                'licenseStatus':    this.getLicenseStatus(data)
            };

            if(typeof data['training_limit'] !== 'undefined') {
                commonStats['trainingLimit'] = data['training_limit'];
            }

            if(isNotEmpty(data['events_stats'])) {
                commonStats['events'] = data['events_stats'];
            }

            const that              = this;

            usersCourses            = {'assigned': [], 'chosen': [], 'archived': [], 'history': data["coursesHistory"]};

            $.each(data['courses'], function (courseID, course) {

                if(typeof course !== 'object' || !course) {
                    console.error
                    (
                        'Wrong server response: users_courses.category.course is not valid:'
                        + JSON.stringify(course)
                    );
                    return;
                }

                // handling course info
                course['courseID']      = courseID;
                course['startDate']     = that.unixTimestampToDate(course['start']);
                course['endDate']       = that.unixTimestampToDate(course['finish']);
                course['isDone']        = course['endDate'] !== null;

                // is_class flag
                course['is_class']      = course['course_format'] === 'class';

                if(typeof course['certificate'] !== 'undefined' && course['certificate'] !== null) {
                    course['certificate'] = {'number': course['certificate']};
                }

                // sort course
                if(typeof course['course_list_id'] !== 'undefined' && course['course_list_id'] !== null) {

                    //usersCourses['m a n d a t o r y'].push(course);

                    if(typeof coursesList[course['course_list_id']] !== 'undefined') {

                        if(typeof coursesList[course['course_list_id']]['contents'] === 'undefined') {
                            coursesList[course['course_list_id']]['contents'] = [];
                        }

                        // clone course
                        let personalCourse = $.extend({}, course);

                        coursesList[course['course_list_id']]['contents'].push(personalCourse);
                    }

                } else {
                   // usersCourses['chosen'].push(course);
                }
            });

            let findCourseById      = function (courseId) {

                for(let id in data['courses']) {

                    if(!data['courses'].hasOwnProperty(id)) {
                        continue;
                    }

                    if(id == courseId) {
                        return data['courses'][id];
                    }
                }

                return null;
            };

            // courses to contents
            for (let courseListId in coursesList) {

                if(!coursesList.hasOwnProperty(courseListId)) {
                    continue;
                }

                let item            = coursesList[courseListId];

                if(!isTraversable(item['courses'])) {
                    continue;
                }

                // reset contents
                item['contents']    = [];

                for (let i in item['courses']) {
                    if(!item['courses'].hasOwnProperty(i)) {
                        continue;
                    }

                    let courseId    = item['courses'][i];
                    let course      = findCourseById(courseId);

                    if(isObject(course)) {
                        // clone course
                        let personalCourse = $.extend({}, course);
                        item['contents'].push(personalCourse);
                    }
                }
            }

            usersCourses['assigned'] = [];

            for(let i in coursesList) {
                if(coursesList.hasOwnProperty(i)) {

                    coursesList[i]['id']    = i;

                    if(typeof coursesList[i].contents == 'undefined') {
                        coursesList[i].contents = [];
                    }

                    if(coursesList[i]['type'] === 'for_chosen') {
                        usersCourses['chosen'].push(coursesList[i]);
                        continue;
                    }

                    if(coursesList[i]['type'] === 'archived') {
                        usersCourses['archived'].push(coursesList[i]);
                        continue;
                    }

                    // isNew
                    if(coursesList[i]['status'] === 'created') {
                        coursesList[i]['isNew'] = true;
                    }

                    usersCourses['assigned'].push(coursesList[i]);
                }
            }
        };

        this.unixTimestampToDate    = function (timestamp) {

            if(typeof timestamp !== 'number') {

                return null;
            }

            return new Date(timestamp * 1000).toDateString();
        };

        this.resetState             = function () {

            if(usersCoursesPromise !== null) {

                return;
            }

            usersCourses            = null;
            commonStats             = null;
            lessonsStats            = {};
        };

        this.getLicenseStatus       = function (data) {

            var status          = 'Active';

           if (data.stats.license_duration == 0  && data.stats.activation_date == null) {
               status = 'Inactive';
           }

           // if (!data.stats.activation_date) {
           //     status = 'None';
           // }

           return status;
        };

        this.formatDescription      = function (data, mui) {

            // convert description
            var $html               = $('<div>');

            var code                = null;

            if(typeof data.code !== 'undefined') {
                code                = data.code;
            } else if(typeof data.id !== 'undefined') {
                code                = data.id;
            }

            $html.text(data.description);
            var description         = $html.html();

            description             = description.replace(/([^>])\n+/g, '$1<br/>');

            data.description        = description;

            return data;
        };

        /**
         * @param manuals
         * @param isAccess
         * @returns {[]|Array}
         */
        this.filterManuals          = function (manuals, isAccess) {

            if(!isTraversable(manuals)) {
                return [];
            }

            let newManuals          = [];

            for(let id in manuals) {

                if(!manuals.hasOwnProperty(id)) {
                    continue;
                }

                if(isAccess === true || manuals[id]['access'] === 'open') {
                    newManuals.push(manuals[id]);
                }
            }

            return newManuals;
        };
    }

    return UserCourses;
});
