;define(['jquery', 'lib/Page', 'lib/CallGet', 'lib/CallPost', 'ui/ModalWindow', 'lib/ServicesIntegrator', 'lib/UserCourses', 'lib/LibraryScroll'],
    function($, Page, CallGet, CallPost, ModalWindow, ServicesIntegrator, UserCourses, LibraryScroll) {


    function Library() {

        const that                  = this;

        const LIMIT                 = 9999;

        let data                    = {};
        let courseList              = null;

        var breadCrumbs             = [];

        Page.call(this);

        var pathTemplate            = this.config['pathTemplate'];
        this.catArray = [];
        this.sortSelection = "";
        this.filterArray = [];
        this.scrollVal2 = 0;
        this.sortedArrayCustom = [];
        this.getClassName              = function () {
            return 'Library';
        };

        this.biggerRuntime = 0;

        $(window).unbind('scroll');
        this.libraryScroll = new LibraryScroll();

        this.getPageMui                = () => {

            const pageName             = this.getClassName();

            let prom                   = $.Deferred();

            this.remoteCall(new CallGet('mui/0' + this.getPortalName() + '/0' + this.getLanguage() + '/',
                {
                    'code': 'all',
                    'nested': true,
                    'groups': `Pages-${pageName},Pages-CoursesForClone`,
                    '_': this.config.LocalStorageStamp
                }, (res) => {

                    if(typeof res.response !== 'undefined' && typeof res.response[pageName] !== 'undefined') {

                        let results         = {};

                        if(typeof res.response['CoursesForClone'] !== 'undefined') {
                            results         = $.extend(results, res.response['CoursesForClone']);
                        }

                        results             = $.extend(results, res.response[pageName]);

                        prom.resolve(results);
                    } else {
                        prom.resolve(res.response);
                    }
                }
            ).asCached().asLocalCached());

            return prom;
        };

        this.defineContent              = function () {



            var isCoursesConfirmation   = this.user.isCoursesConfirmation() && this.user.isAuth();

            return $.when(
                this.getPageMui(),
                this.getLangs(),
                this.getCourses(),
                isCoursesConfirmation ? this.userCourses.getAllCourses() : $.Deferred().resolve([]),
                isCoursesConfirmation ? this.getCoursesForSelect() : $.Deferred().resolve([]),
                this.getCustomColors(),
                this.defineCategoriesData(),
                this.getViewMode(),

            ).done((res, langs, courses, userCourses, coursesForSelect, cc, categories, viewMode) => {

              var sliderSections = document.getElementsByClassName("range-slider");
              for( var x = 0; x < sliderSections.length; x++ ){
                var sliders = sliderSections[x].getElementsByTagName("input");
                for( var y = 0; y < sliders.length; y++ ){
                  if( sliders[y].type ==="range" ){
                    sliders[y].oninput = getVals;
                    // Manually trigger event first time to display values
                    sliders[y].oninput();
                  }
                }
              }


              this.catArray = categories;
              let currentFilter =  "";
              let currentFilter2 =   "";

              let currentPage        = this.urlParts.page == 'all' ? 1 : this.urlParts.page;

              if (currentPage >= 1 ) {  //this condition could be deleted...

                currentFilter =  this.getSortSelection();
                currentFilter2 =  window.localStorage.getItem("sortSelection");

              }


                let events  = courses[1];
                courses     = courses[0];

                // format events
                this.formatEvents(events);
                // merge and sort events to courses
                let eventsRes = this.mergeCoursesAndEvents(courses, events['events'], events['category_id']);
                // mix courses and data
                $.extend(data, {'courses': courses, 'events': eventsRes}, {pageMui:res});


                $.when( this.handleContentData(data, categories) ).then(function( content ) {

                  breadCrumbs = that.appLocation.getBreadCrumbs($.parseJSON(sessionStorage.getItem('sidebar_' + that.getLanguage())));
                  if(isCoursesConfirmation) {

                    content.courses.forEach((courseItem) => {

                      courseItem.isAdd = false;

                      for (let i in userCourses.assigned) {
                        if (userCourses.assigned[i].courses.indexOf(courseItem.course_id) >= 0) {
                            courseItem.isAdd = true;
                            break;
                        }
                      }

                      for( let i in coursesForSelect){
                        if(coursesForSelect[i].course_id === courseItem.course_id){
                            courseItem.isSelectable = true;
                            break;
                        }
                      }

                    });

                      content.myLearningUrl = that.generateNewUrl('myLearning');
                  }

                  content.isRequestAccess = isCoursesConfirmation;

                  if(courseList !== null) {
                      content.courseList  = [courseList];
                  }
                  $.extend(res, cc);

                  that.setContentData($.extend(content, res, {breadCrumbs:breadCrumbs}, {'is_auth': that.user.isAuth()},{tmpl:that.config.pathTemplate} ));

                });


                //let content = this.handleContentData(data, categories);


            });

        };


        this.getCustomColors = () => {
            var color = {};
            if( this.checkBrandingSettings() ) {
                var cnf  = this.config.portal.colorScheme;
                color['df_text_color'] = ( typeof cnf != "undefined" && typeof cnf.default__text != "undefined" ) ? cnf.default__text : '';
            }
            return color;
        };


        this.checkBrandingSettings = () => {
            var ptl = this.config.portal;
            return ptl.template == 'template01' && ( typeof ptl.disableBrandingSettings == 'undefined' || ptl.disableBrandingSettings ==  false );
        };


        /**
         * Returns events for category
         * @param category
         * @returns {*}
         */
        this.getCategoriesEvents        = function (category) {

            let isEventsExits           = false;
            let categoryId              = null;
            let courses                 = null;

            if(typeof category !== 'undefined'){
                categoryId              = category['id'];
                courses                 = category['courses'];

                // check if events exits
                for(let i in courses) {

                    if(courses.hasOwnProperty(i) && courses[i]['course_format']) {
                        isEventsExits   = true;
                        break;
                    }
                }
            }else{
                categoryId              = null;
                courses                 = {};
            }

            // always true
            isEventsExits               = true;

            if(!isEventsExits) {
                return $.Deferred().resolve(null).promise();
            }

            // get all events for courses from category
            let url                 = 'portals/' + this.getPortalId() + '/events';

            let promise             = $.Deferred();
            let params              = {
                'current_student_id':   this.user.getUserId(),
                'resolve_stat':         1,
                'is_active':            1,
                'category_id':          categoryId
            };

            this.remoteCall(new CallGet(url, params, (response) => {

                if(isEmpty(response['response'])) {
                    return;
                }

                response            = response['response'];

                promise.resolve(response);
            })).fail(function () {
                promise.resolve(null);
            });

            return promise;
        };

        this.getCourses                 = function () {

             let prom                   = $.Deferred();
             let eventsProm             = $.Deferred();
             let mainProm               = $.Deferred();

             prom.done(function (cache) {

                 let categoryID         = that.defineCategoryCEID();
                 let category           = cache.filter((category) =>  category.ceid == categoryID);

                 category               = typeof category[0] !== 'undefined' ? category[0] : {};

                 // get events if exists for this category
                 that.getCategoriesEvents(category).done(function (results) {
                     var categoryId = (typeof category['id'] !== 'undefined' ? category['id'] : null);
                     eventsProm.resolve({'category_id': categoryId, 'events': results});
                 }).fail(function () {
                     eventsProm.reject();
                 });

                 if(!that.user.isAuth()) {
                     mainProm.resolve(cache);
                     return;
                 }

                 if(category.length === 0) {
                     mainProm.resolve(cache);
                     return;
                 }

                 // If course list id defined get him
                 if(typeof category['course_list_id'] !== 'undefined' && category['course_list_id'] !== null) {
                     that.getCourseList(category['course_list_id']).done(function () {
                         mainProm.resolve(cache);
                     }).fail(function () {
                         mainProm.resolve(cache);
                     });
                 } else {
                     mainProm.resolve(cache);
                 }

             }).fail(function () {
                 mainProm.reject();
                 eventsProm.reject();
             });

             this.appLocation.cachePromise().then( cache => {

                 if(cache) {

                     cache           = $.parseJSON(cache);

                     prom.resolve(cache);

                 } else {

                     var urlParts       = that.urlParts.categories;

                     var topCategory    = urlParts && urlParts[0] ? urlParts[0] : null;

                     if(!topCategory) {
                        console.log('404 redirect in library.getcourses');
                         this.redirect('page404');
                     }

                    // var sessionCache = sessionStorage.getItem(topCategory +'_' + that.getLanguage());
                    //  if(typeof sessionCache == 'string' && sessionCache.length > 0) {
                    //
                    //      prom.resolve($.parseJSON(sessionCache));
                    //      return prom;
                    //  }

                     this.remoteCall(new CallGet('portal/navigation_' + topCategory +'_' + this.getLanguage()+'--v'+this.config.portalStorageStamp, {})).done(function (res) {

                             sessionStorage.setItem(topCategory +'_' + that.getLanguage(), JSON.stringify(res));
                             prom.resolve(res);

                      });
                 }
             });

            return $.when(mainProm, eventsProm);
        };

        this.mergeCoursesAndEvents      = function (cache, results, categoryID) {

            let cat            = null;
            let events         = {};

            if(isEmpty(categoryID)) {
                categoryID              = '';//this.defineCategoryId();
            }

            for(let x in results) {

                if(results.hasOwnProperty(x)) {

                    let courseId = results[x]['course_id'];

                    if(isEmpty(events[courseId])) {
                        events[courseId]         = [];
                    }

                    events[courseId].push(results[x]);
                }
            }

            for(let i in cache) {
                if(!cache.hasOwnProperty(i)) {
                    continue;
                }

                if(cache[i]['id'] === categoryID) {
                    cat        = cache[i];
                }
            }

            if(isNotEmpty(cat) && isNotEmpty(cat['courses'])) {

                let courses = cat['courses'];

                for (let i in courses) {

                    if (!courses.hasOwnProperty(i)) {
                        continue;
                    }

                    if (isNotEmpty(events[courses[i]['id']])) {
                        courses[i]['events'] = events[courses[i]['id']];
                        events[courses[i]['id']][0]['is_hidden'] = false;
                    }
                }
            }

            return events;
        };

        this.getCourseList              = function (courseListId) {

            // If not auth nothing to do
            if(!this.user.isAuth()) {
                return $.Deferred().resolve([]).promise();
            }

            let params                  = {
                'token':                this.user.getSessionId(),
                'lang':                 this.getLanguage(),
            };

            params['id']                = courseListId;

            return this.remoteCall(new CallGet('portals/course_lists/for_cloning/courses/', params,
                function(res) {

                // res.response
                if(typeof res.response[0] === 'undefined' || typeof res.response[0]['courses'] === 'undefined') {
                    return $.extend(data, {'courses': []});
                }

                courseList              = res.response[0];

                return $.extend(data, {'courses': res.response[0]['courses']});
            }));
        };

        this.getCoursesForSelect    = function () {

            let params                  = {
                'token':                this.user.getSessionId(),
                'lang':                 this.getLanguage(),
            };

            let def                     = $.Deferred();

            this.remoteCall(new CallGet('portals/course_lists/for_selection/', params,
                function(res) {

                    def.resolve(res.response);

                }).asCached().asLocalCached()
                .defineErrorHandler((res, status) => {
                    if(status == 498) {
                        this.user.logout();
                        this.reload();
                    } else {
                        console.log('404 redirect in library.getCoursesForSelect');
                        this.redirect('page404');
                    }
                }));

            return def;

        };

        this.getLangs                   = function () {

            return $.ajax({
                cache: true,
                url: this.config.basePath + 'json/langs--v' + this.config.LocalStorageStamp + '.json',
                dataType: "json",
                success: function(res) {
                    return $.extend(data, {'langs': res});
                }
            });
        };

        this.parseLangs             = function (codes) {

            let dataCodes = data.langs.map((dataCode) =>dataCode.codeISO6391);

            return codes.filter((code) => ~this.config.languages.indexOf(code)).map(function (code) {

                let index = dataCodes.indexOf(code);

                if (~index) {
                    return data.langs[index].native;
                }


            }).join(', ');

        };

        this.categoryRelation       = function (categories) {

            let categoryRelation    = {};

            $.each(categories.sections, function (i, cat) {

                if(cat.categories_0){

                    $.each(cat.categories_0, function (j, subCat) {

                        categoryRelation[subCat['ceid']] = [];

                        categoryRelation[subCat['ceid']].push(subCat['ceid']);

                        if(subCat.categories_1){

                            $.each(subCat.categories_1, function (j, subSubCat) {

                                categoryRelation[subCat['ceid']].push(subSubCat['ceid']);
                            });
                        }
                    });
                }

            });

            return categoryRelation;
        };




        this.handleContentData         = function (data, categories, srtSelection, sbFilter, trigger) {


            let categoryID          = this.defineCategoryCEID();
            let category            = data.courses.filter((category) =>  category.ceid == categoryID);
            let childCategories     = this.categoryRelation(categories);
            let courses             = [];
            let events              = data['events'];
            let metaData            = {};



            var promiseHCD = $.Deferred();
            if (srtSelection != null || srtSelection != "")
            that.sortSelect = srtSelection;

            if (category.length) {

                courses = category[0].courses;

                if(childCategories[categoryID]) {

                    $.each(childCategories[categoryID], function (i, childCategory) {

                        let childCatCourses = data.courses.filter((category) =>  category.ceid == childCategory);

                        $.each(childCatCourses[0].courses, function (j, course) {

                            if(isNotEmpty(events[course['id']])) {
                                course['events'] = events[course['id']];
                                course['events'][0]['is_hidden'] = '';
                            }

                            courses.push(course);
                        });
                    });
                }

            } else {

                data.courses.forEach(category => courses.push(...category.courses));
            }


            $.each(data.courses, function (i, category) {

                if(category.ceid == categoryID) {
                    metaData =  {
                        title:              category.metaTitle || category.name,
                        meta_description:   category.metaDescription,
                        meta_keywords:      category.metaKeywords
                    }
                }
            });


            if(typeof metaData.title == 'undefined') {
                category        = categories.sections.filter((category) =>
                    category.ceid == categoryID
                );

                if(category.length > 0) {
                    var categoryData = category[0].data || {};

                    metaData =  {
                        title:              categoryData.metaTitle || category[0].name,
                        meta_description:   categoryData.metaDescription || undefined,
                        meta_keywords:      categoryData.metaKeywords|| undefined
                    };
                }
            }


            let currentLimit    = this.urlParts.page == 'all' ?  10000 :   LIMIT;
            let currentPage     = this.urlParts.page == 'all' ? 1 : this.urlParts.page;
            //remove the same courses from library page
            var uniqueCourses   = {};
            var content    = [];
            //var currentCourses = coursesArray.length;
            var currentCoursesLessons = 0;
            //var coursesArrayLessons = [];
            //var coursesArrayDuration = [];
            var coursesArrayNew = [];
            var sbFilterArray = [];
            var portalLangs = that.config.portal['langs'];
            var runtimeFormatted = [];

            //EDIT COURSE ARRAY SO FILTER AND SORT WORKS
            $.each(courses, function (i, course) {
                if(uniqueCourses[course.id]) {
                    return true;
                }

                if(isNotEmpty(events[course['id']])) {
                    course['events'] = events[course['id']];
                    course['events'][0]['is_hidden'] = '';
                }

                uniqueCourses[course.id] =  course;
                //calculate total lessons for this course for display
                currentCoursesLessons = currentCoursesLessons + course.totallessons;
                //get runtime in string, convert to int to sort, and get seconds for slider filter and get maxium value for slider too
                runtimeFormatted = runtiMeToInt(course.trt);
                course.trtInt = parseInt(runtimeFormatted["int"]);
                course.trtSeconds = runtimeFormatted["seconds"];

                //get bigger value to add later on slider max
                if (course.trtSeconds > that.biggerRuntime) {
                  that.biggerRuntime = course.trtSeconds;
                }

                //add single  element for each language so i can filter and match with portal langs
                $.each(portalLangs, function (i, portalLang) {

                  $.each(course.langs, function (i, lang) {
                    //console.log(lang);
                    if (lang == "en" && portalLang.lang == "en")
                        course.langEn = true;
                    if (lang == "es" && portalLang.lang == "es")
                        course.langEs = true;
                    if (lang == "ar" && portalLang.lang == "ar")
                        course.langAr = true;
                  });

                });

                course.formattedLang = that.parseLangs(course.langs);

                ///////////////////////////////////////////////////END USER
                ///////////////////////////////////////////////////
                content.push(course);
            });


            var resCourses2 = [];

            if (sbFilter == 1) { //Clear Filter and reload full array
              this.clearsbForm();
              sbFilter = false;
              content = that.formatRenderCourses(content, currentPage, currentLimit);
              that.updatesortSelect(content.courses, trigger);

            }
            //IF LOOGGED IN
            if (that.user.getSessionId()) {

              $.when(this.matchUserCourses(sbFilter,content)).done(function(resCoursesMatched) {


                if (resCoursesMatched) {

                  if (sbFilter && sbFilter["available1"] == true ) {
                    resCoursesMatched = resCoursesMatched.filter(function (thiscourse) {
                    return (thiscourse.availableToUser == true);
                  });

                  resCoursesMatched = that.basicFilters(sbFilter,resCoursesMatched, trigger);


                  if (srtSelection){
                    resCoursesMatched = that.basicSort(srtSelection,resCoursesMatched);
                  }

                  resCoursesMatched = that.formatRenderCourses(resCoursesMatched, currentPage, currentLimit, "availableToUser");
                  that.updatesortSelect(resCoursesMatched.courses, trigger);


                  }
                  else{
                    //add available flag to current category courses array that match resCoursesMatched
                    $.each(content, function(index, val) {
                      $.each(resCoursesMatched, function(index2, val2) {
                        if (val.id == val2.id)
                            val.availableToUser = true;

                        else
                            val.availableToUser = false;

                      });
                    });


                    if (sbFilter)
                      content = that.basicFilters(sbFilter,content, trigger);

                    if (srtSelection)
                      content = that.basicSort(srtSelection,content);

                    content = that.formatRenderCourses(content, currentPage, currentLimit, "availableToUser");
                    that.updatesortSelect(content.courses, trigger);

                  }
                }
              }).fail(function(){
                console.log("Something went wrong ");
              });
            }
            //IF NOT LOGGED IN
            else{
              if (sbFilter) {
                content = this.basicFilters(sbFilter,content, trigger);
              }
              else{
                if (window.localStorage.getItem("sbFilter")) {
                  sbFilter = window.localStorage.getItem("sbFilter");
                  sbFilter = JSON.parse(sbFilter);

                  content = this.basicFilters(sbFilter,content, 4);
                  this.reloadsbForm(sbFilter);

                }
              }

              if (srtSelection){
                content = this.basicSort(srtSelection,content);
              }

              content = that.formatRenderCourses(content, currentPage, currentLimit);
              that.updatesortSelect(content.courses, trigger);



            } // else not loggged in

          content.pagination = this.urlParts.page == 'all' ? [] : this.definePagination(content.length, currentLimit, data.pageMui);
          content.canonical = this.defineCanonical(data);
          content.metaData = metaData;
          return promiseHCD.resolve (content);

        };



        this.formatRenderCourses = function (coursesArray, currentPage, currentLimit, banderaFiltro){


          if (coursesArray != true) { //array is not array is just a true, so no enter

           var coursesRealArray = coursesArray;
           var totalLessons = 0;
           $("#totalCourses").text(coursesRealArray.length);

            if (typeof banderaFiltro == true ) { // no filter, means is first load, means coursesRealArray will get values from
              coursesArray.courses =   this.globalArray;
              coursesRealArray = coursesArray.courses;
            }

            if (typeof banderaFiltro != true ) { // filter exist, means is not first load
              this.globalArray = coursesRealArray = coursesArray;
            }


            if (coursesRealArray.length == 0)
              totalLessons = 0;

            $("#totalLessons").text(totalLessons);

            return { courses: coursesRealArray
                    .slice((currentPage - 1) * currentLimit, currentPage * currentLimit)
                    .map((course) => {

                        if(course['course_format'] === 'class') {
                            course.is_not_quiz      = true;
                            course.is_no_video      = true;
                            course.is_class         = true;
                        }

                        try{if(!course.quiz.hasQuiz) course.is_not_quiz    = true;}catch(e){}

                        var newUrlParts                 = {
                            courseTitle:    that.rewriteTitletoUrl(course.title),
                            contentCacheId: course.ceid
                        };

                        that.userCourses.formatDescription(course, that.getMui());

                        totalLessons = totalLessons + course.totallessons;
                        if (coursesRealArray.length == 0)
                          totalLessons = 0;

                        $("#totalLessons").text(totalLessons);
                        //if(course.description.lastIndexOf('<br/>') > -1) console.log(course.description);

                        return {
                            url:         that.appLocation.buildURL(newUrlParts),
                            title:       course.title,
                            description: course.description.trim(),
                            lessons:     course.is_class ? false : course.totallessons,
                            img:         `${that.config.CDNContent}previews/${course.id}/240.jpg`,
                            author:      course.author,
                            runtime:     course.is_class ? false : course.trt,
                            runtimeInt:  course.is_class ? false : course.trtInt,
                            runtimeSecs:  course.is_class ? false : course.trtSeconds,
                            is_no_video: course.is_no_video,
                            is_not_quiz: course.is_not_quiz,
                            city:        course.city,
                            address:     course.address,
                            lesson_id:   course.introGUID,
                            course_id:   course.id,
                            lesson_type: course.introType,
                            isNew:       course.new,
                            langs:       course.langs,
                            formattedLang: this.parseLangs(course.langs),
                            ceid:        course.ceid,
                            is_events:   course.course_format === 'class', // isNotEmpty(course.events),
                            is_events_exists: isNotEmpty(course.events),
                            events:      isNotEmpty(course.events) ? course.events : null,
                            properties:  isNotEmpty(course.properties) ? course.properties : null,
                            availableToUser: course.availableToUser == true ? true : false
                        }

                    })


                  }
          }

        };

        this.defineCategoryCEID        = function () {

            if (typeof that.urlParts === 'undefined') {
                throw new Error('currentPath undefined');
            }

            return that.urlParts.contentCacheId;
        };

        this.defineCanonical        = function (data) {

            let canonical           = location.protocol+'//'+ location.host+'/'+this.getLanguage() + '/library';

            let categoryID          = this.defineCategoryCEID();

            let category            = data.courses.filter((category) =>  category.ceid == categoryID);

            let pages               = this.urlParts.page &&  this.urlParts.page != 1 ? 'page/' + this.urlParts.page :'';

            canonical               +=  category[0] ? category[0].canonical + pages : '/' +
                                      this.urlParts.contentCacheId +'/' + this.urlParts.categories[0] + '/' + pages;
            return canonical;
        };

        this.definePagination          = function(totalCourses, currentLimit, mui) {

            let totalPages          = Math.ceil(totalCourses/currentLimit),
                pages               = [],
                newUrlParts         = {},
                options             = {includePage:true};

            for(let i = 0; i < totalPages; i++) {

                let pageCaption      = 1 + i;
                newUrlParts.page = i == 0 ? '' :  (i + 1);
                pages.push({
                    caption: pageCaption,
                    active: this.urlParts.page == i + 1,
                    rel:    this.urlParts.page < i + 1 ? 'next' :  'prev',
                    url:    this.appLocation.buildURL(newUrlParts, options)
                })
            }

            newUrlParts.page           = 'all';
            pages.push({
                caption: mui.PaginationAll || 'Show All',
                active: false,
                rel:    'bookmark',
                url:    this.appLocation.buildURL(newUrlParts, options)
            });

            return pages;
        };

        this.onAddCourse               = function (element, event) {

            event.preventDefault();

            const that                 = this;

            let course_id              = $(element).data('course_id');

            this.userCourses.addCourseToList(course_id).always(function () {

                that.showAlert(that.getMainData().mui.pageContent.course.AddMessage).done(function (modalWindow) {

                    $(element).addClass('is_hidden')
                        .siblings('.is_hidden').removeClass('is_hidden');
                });
            });
        };

        this.onSendListForClone     = function (element, event) {

            event.preventDefault();

            const that              = this;

            let list_id             = courseList['id'];

            this.userCourses.sendForConsideration(list_id).always(function () {

                let printFormLink   = that.generateNewUrl('printCourseListForm/' + list_id);

                that.showCourseListCloneAlert().done(function (modalWindow) {
                    $('#printFormLink').attr('href', printFormLink);
                });
            });
        };

        this.onShowProperties       = function (element, event) {

            let $properties         = $(element).closest('[data-role="description"]').find('[data-role="properties"]');

            if($properties.length === 0 || $properties.children().length === 0) {
                return false;
            }

            event.preventDefault();
            event.stopPropagation();

            const that              = this;

            $properties.removeClass('is_hidden');
            $(element).addClass('is_hidden');

            return false;
        };

        this.showCourseListCloneAlert = function () {

            let selector            = '#addedCourseModal';
            let $alert              = $(selector);

            let modalWindow         = new ModalWindow({
                modalID:        selector,
                top:            100,
                overlay:        0.4,
                isAlert:        true
            });

            $alert.find('[rel^=close]').bind('click', function () {
                modalWindow.close();
            });

            return modalWindow.show();
        };

        this.onSelectEvent          = function (element, event) {

            let $eventList          = $(element);
            let eventId             = $(element).val();

            // find event div
            let $course             = $(element).closest('[data-event-course-id]');
            let $events             = $course.find('[data-role="events"]');
            let $event              = $events.find('[data-id="' + eventId + '"]');
            let status              = $event.attr('data-status');

            // show need event
            $events.find('.event').addClass('is_hidden');
            $event.removeClass('is_hidden');

            // change button for status
            let $eventBtn           = $event.find('[data-handler="onSendToApprove"]');
            let $eventStatus        = $event.find('[data-role="eventStatus"]');

            this.changeEventStatus(status, $eventBtn, $eventStatus);
        };

        this.onSendToApprove        = function (element, event) {

            event.preventDefault();

            // detect current course block
            let $course             = $(element).closest('[data-event-course-id]');
            // find event div
            let $events             = $course.find('[data-role="events"]');
            let courseId            = $course.attr('data-event-course-id');
            let $eventList          = $course.find('[data-handler="onSelectEvent"]');
            let eventId             = $eventList.val();
            let $event              = $events.find('[data-id="' + eventId + '"]');
            let status              = $event.attr('data-status');

            let $eventBtn           = $event.find('[data-role="eventRegisterBtn"]');

            if($eventBtn.hasClass('disabled')) {

                // check if not login
                if(!this.user.isAuth()) {
                    let mui         = this.getMui();
                    this.showAlert(mui.error['auth_required']);
                }

                return;
            }

            if(status === 'review')
            {
                status              = 'unregister';
            }
            else
            {
                status              = 'review';
            }

            let url                 = 'accounts/' + this.user.getAccountId()
                + '/courses/0/events/'
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

                    $event.attr('data-status', response['status']);

                    // change button for status
                    let $eventBtn           = $event.find('[data-handler="onSendToApprove"]');
                    let $eventStatus        = $event.find('[data-role="eventStatus"]');

                    // change status
                    that.changeEventStatus(response['status'], $eventBtn, $eventStatus);

                    if(response['status'] === 'error') {
                        that.showAlert(mui['error']);
                    } else {

                        let printFormLink   = that.generateNewUrl('printCourseListForm/' + courseId + '/event/' + eventId);

                            that.showApproveModal().done(function (modalWindow) {
                            $('[data-role="printFormLink"]').attr('href', printFormLink);

                                if(response['status'] === 'review'){
                                    $('[data-role="approvedEventModal-text"]').text(mui['pending']);
                                }else{
                                    $('[data-role="approvedEventModal-text"]').text(mui['registered']);
                                }
                        });

                    };
                }
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

            return modalWindow.show()
                .done(function(){
                    modalWindow.getModalNode()
                        .find('[rel^=close]')
                        .bind('click', function () {
                            modalWindow.close();
                        });
                });
        };



        this.onChangeSort     = function (node, event, sbFilter, trigger) {
          //get 5 big cat
          var catArray = this.catArray;
          //save filter value on global and local
          let sortSelection = node.value;
          // to go to page 1 if this.onChangeSort is second time trigger
          window.localStorage.setItem('sortSelection',sortSelection);
          this.sortSelection = sortSelection;
          //we get sorted array v1
          //let sortedArray  = this.handleContentData(data, catArray, sortSelection, sbFilter);
          $.when( this.handleContentData(data, catArray, sortSelection, sbFilter, trigger) ).then(function( sortedArray ) {
            //obtengo variables necesarias para formatear el array ordenado von formatRenderCourses()
            let currentLimit       = that.urlParts.page == 'all' ?  10000 :   LIMIT;
            let currentPage        = that.urlParts.page == 'all' ? 1 : that.urlParts.page;

          });

        };


        this.updatesortSelect              = function (sortedArrayCustom, trigger) {

            //console.log(sortedArrayCustom);
            var biggerRTSecs = sortedArrayCustom.reduce(function(max, arr) {
                                return Math.max(max, arr["runtimeSecs"]);
                              }, 10000)

            $("#sliderR1").attr("max",biggerRTSecs);
            $("#sliderR2").attr("max",biggerRTSecs);
            $("#sliderR2").val(biggerRTSecs);

            var slide2 = that.formatSecondsToHrs(biggerRTSecs);

            try {
                  $(".sSlide").html(slide2)

            } catch (e) {
            }

            this.ctrlItems($("#items"),sortedArrayCustom);
        };


        this.getSortSelection       = function () {
            var var1 = this.sortSelection; //get from handler
            var var2 = window.localStorage.getItem('sortSelection'); //get from previows selection
            if (var1 != null && var1 != "" && typeof var1 != "undefined" ){ // handler exist
                return var1;
              }
            if (var2 != null && var2 != "" && typeof var2 != "undefined" ){ //previows selection exist{
                return var2;
              }
            else{
              var1 = false;
              return var1;
              }

        };


        this.getViewMode     = function () {
          var lsView = window.localStorage.getItem('viewmode');
          var viewMode = "";

          if (lsView != null || lsView != "" || typeof lsView != "undefined"   ){
                viewMode = lsView;
                return viewMode;
              }

          if (lsView == null || lsView == "" || typeof lsView == "undefined"   ){
                viewMode = "btn-library_list";
                return viewMode;
              }
        }


        this.onChangeViewMode     = function (node, event) {
          //get current viewmode value on local storage
          var lsView = window.localStorage.getItem('viewmode');
          //if node id exist means this function was called from icon click
          if (node.id != null || node.id != "" || typeof node.id != "undefined")
          {
            var btnView = node.id;
            changeViewMode(btnView);
          }
          //if localstorage not set, set list as default
          if (lsView == null || lsView == "" || typeof lsView == "undefined")
          {
            var btnView = "btn-library_list";
            changeViewMode(btnView);
          }
          //if click value != local storage, use click value
          if (node.id != lsView)
          {
            var btnView = node.id;
            changeViewMode(btnView);
          }

        };



        this.outContentPromise.done(function () {

          //theSidebar.height($(".library-menu").height()); // sep 19


          try {
                var viewMode = getViewMode();
          } catch (e) {

          }

          //this is because data-handler=onOpenPreview for preview doesnt work right now
          $(document).on('click', '.onOpenPreview', function(e){
            that.onOpenPreview(this,e);
          });

          $(document).on('click', '.onAddCourse', function(e){
              that.onAddCourse(this,e);
          });

          $( "#selectSorter" ).change(function(arg) {
             //this.sortSelection; //get from handler
            //window.localStorage.getItem('sortSelection');
            $('#loading-overlay').fadeIn(300);
          });

          $(document).on('click', '.sidebarCheckbox', function(e){

            $('#loading-overlay').fadeIn(300);
            var filterArray = [];
            filterArray = getFilterValues();
            var node = {};
            node.value = that.getSortSelection();
            that.onChangeSort(node, event, filterArray, 1);
            var newMaxVal = parseInt( $("#sliderR2").val()) ;

            $("#sliderR1").attr("max",newMaxVal);
            $("#sliderR1").val(0);
            $('.fSlide').html(that.formatSecondsToHrs(0));
            $("#sliderR2").val(newMaxVal);
            $("#sliderR2").attr("max",newMaxVal);
            $(".newMaxLabel").html("");
            $(".newMMinLabel").html("");

          });

          $(document).on('mouseup', '.sidebarSlider', function(e){

            $('#loading-overlay').fadeIn(300);

            var filterArray = [];
            filterArray = getFilterValues();
            var node = {};
            node.value = that.getSortSelection();
            var oldMax = parseInt($("#sliderR2").attr("max"));
            var slider1 = $("#sliderR1");
            var slider2 = $("#sliderR2");
            var newR1Val = parseInt(slider1.val());
            var newR2Val = parseInt(slider2.val());

            that.onChangeSort(node, event, filterArray, 2);

            slider2.val(newR2Val);
            slider1.attr("max",oldMax);
            slider2.attr("max",oldMax);

            $(".newMaxLabel").html(that.formatSecondsToHrs(oldMax));
            $(".newMinLabel").html(that.formatSecondsToHrs(0));

            slider1.val(newR1Val);
            slider2.val(newR2Val);

            if (newR1Val > newR2Val) {
              $('.sSlide').html(that.formatSecondsToHrs(newR1Val));
              $('.fSlide').html(that.formatSecondsToHrs(newR2Val));
            }

            if (newR1Val < newR2Val) {
              $('.fSlide').html(that.formatSecondsToHrs(newR1Val));
              $('.sSlide').html(that.formatSecondsToHrs(newR2Val));
            }


          });

          $(document).on('click', '#onClearFilters', function(e){

            $('#loading-overlay').fadeIn(300);
            var node = {};
            that.onChangeSort(node, event, 1, 3);

            $("#sliderR1").val(0);
            $(".fSlide").html(that.formatSecondsToHrs(0))
            $(".newMaxLabel").html("");

          });

          //expand / collapse sidebar, either we use this or mod onToggleCategory in page.js
          $(document).on('click', '.library-menu__category', function(e){

            that.libraryScroll.updateSizesLibrary();
            var theSidebar = $('.library_sidebar');
            var sbWidth = $('.library_sidebar').width();
            var viewPort = $(window).height() - 94 ;

            if (theSidebar.height() < viewPort) {
              theSidebar.css("position","sticky");
              theSidebar.css("max-width",theSidebar.parent().width()+"px");
              theSidebar.css("width",theSidebar.parent().width()+"px");
              theSidebar.addClass("sticky-top");
              theSidebar.css("margin-bottom","auto");
              theSidebar.css("margin-top","0");
              theSidebar.animate({top:"120px"},300);
              theSidebar.removeClass("upFromFixBtm");
            }

            that.libraryScroll.updateSizesLibrary();

          });

          //Scroll Functions when not movil and window width > 768


          $(window).scroll(function (event) {
            //debugger;
            if ($(window).width() > 768 && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) == false && that.getPortalName() == "www"   ) {

              var position = window.localStorage.getItem("position");
              if (!position)
              var position = $(window).scrollTop(position);

              var currentScroll = $(window).scrollTop();
              var theSidebar = $('.library_sidebar');
              var sbWidth = $(".inner-page__sidebar").width();
              var viewPort = $(window).height() - 94 ; // this 94 is for ussite header height
              var theContainer = $("#course-container");

              var shortSidebar =  (theSidebar.height()+20) < viewPort ? true : false;
              var shortContent =  (theContainer.height()+20) < viewPort ? true : false;

              that.libraryScroll.scrollFunctions(position, currentScroll, theSidebar, sbWidth, viewPort, theContainer, shortSidebar, shortContent);

            }

          });


          $( window ).resize(function() {
            $("#Sidebar").css("max-width",$("#Sidebar").parent().width()+"px")
            $("#Sidebar").css("width",$("#Sidebar").parent().width()+"px")
          });

        }); //outContentPromise



        //get runtime string i.e. "1hr32mins" and get int i.e. 132 so it can be sorted
        function runtiMeToInt(ret){

          var intValue = [];
          ret = ret.split(" ");
          let hrVal = ret[0];
          let minVal = ret[1];
          hrVal = hrVal.replace(/[^0-9]/gi, '');
          minVal = minVal.replace(/[^0-9]/gi, '');

          //when string is like 2h 8ins is going to ad a 0 so is 208 not 28
          if (minVal.length == 1) {
              minVal = "0"+minVal;
          }

          intValue["int"] = hrVal+minVal;
          intValue["seconds"] = (hrVal*60*60) + (minVal*60);
          return intValue;
        }

        function getVals(){
          // Get slider values
          var parent = this.parentNode;
          var slides = parent.getElementsByTagName("input");
          var slide1 = parseFloat( slides[0].value );
          var slide2 = parseFloat( slides[1].value );
          // Neither slider will clip the other, so make sure we determine which is larger
          if( slide1 > slide2 ){ var tmp = slide2; slide2 = slide1; slide1 = tmp; }

          slide1 = that.formatSecondsToHrs(slide1);
          slide2 = that.formatSecondsToHrs(slide2);

          $(".fSlide").html(slide1)
          $(".sSlide").html( slide2)

        }


        this.matchUserCourses = function (sbFilter,coursesArray) {

          var dfd = $.Deferred();
          var userId = that.user.getSessionId();
          var userCoursesIds = [];
          var coursesArray2 = coursesArray;
          var sbFilterAvailable = [];
          var sbFilterArray_1 = [];

          if (userId != undefined) {

            var service                 = new ServicesIntegrator(that.config);
            var portalName              = that.config['portalName'];
            that.userCourses            = new UserCourses(that.user, service, portalName, that.getLanguage());

            $.when( that.userCourses.getUsersCourses(true)).done(function( resCourses2 ) {

              //generate array with userCourses (courses assigned to current user) just the ID's
              $.each(resCourses2, function(index, courseLists) {
                if (index != "archived") {
                  $.each(courseLists, function(index2, courses) {
                    $.each(courses.courses, function(index3, val) {
                      userCoursesIds.push(val);
                    });
                  });
                }
              }); //first each


              //navigate trough user all courses and compare with userCoursesIds
              $.each(userCoursesIds, function(index, val) {
                //match user course vs. current course array
                sbFilterArray_1 = coursesArray2.filter(function (thiscourse) {
                  return thiscourse.id == val;
                });
                if (jQuery.isEmptyObject(sbFilterArray_1) == false) {
                    sbFilterAvailable.push(sbFilterArray_1[0]);
                }
              });


               dfd.resolve(sbFilterAvailable);

              }).fail((e) => {
                dfd.resolve(sbFilterAvailable);
              });

            }

            else{
               dfd.resolve(sbFilterAvailable);
            }

            return dfd;
          }


        this.basicFilters = function(sbFilter, coursesArray, trigger) {

          var sbFilterArray = coursesArray;

          if (sbFilter["chbxCourses"] == true && sbFilter["chbxClasses"] == false) {
              sbFilterArray = sbFilterArray.filter(function (thiscourse) {
              return (thiscourse.course_format == "lessons");
              });
          }

          if (sbFilter["chbxClasses"] == true && sbFilter["chbxCourses"] == false ) {
              sbFilterArray = sbFilterArray.filter(function (thiscourse) {
              return (thiscourse.course_format == "class");
              });
          }

          var sbFilterArray2 = [];

          if (sbFilter["ckbxEn"] == true && sbFilter["ckbxEs"] == false ){
              sbFilterArray2 = sbFilterArray.filter(function (thiscourse) {
                return (thiscourse.langEn == true);
              });
            }

          if (sbFilter["ckbxEs"] == true && sbFilter["ckbxEn"] == false) {
            sbFilterArray2 = sbFilterArray.filter(function (thiscourse) {
              return (thiscourse.langEs == true);
            });
          }

          if ((sbFilter["ckbxEs"] == false && sbFilter["ckbxEn"] == false) || (sbFilter["ckbxEs"] == true && sbFilter["ckbxEn"] == true) ){
            sbFilterArray2 = sbFilterArray;
          }

          var sbFilterArray3 = [];


          if (trigger == 2) { //prevent that slider values filter is apply

            if (sbFilter["sliderR1"] < sbFilter["sliderR2"]) {
              sbFilterArray3 = sbFilterArray2.filter(function (thiscourse) {
                return (thiscourse.trtSeconds >= sbFilter["sliderR1"] && thiscourse.trtSeconds <= sbFilter["sliderR2"]) ;
              });
            }

            if (sbFilter["sliderR1"] > sbFilter["sliderR2"]) {
              sbFilterArray3 = sbFilterArray2.filter(function (thiscourse) {
                return (thiscourse.trtSeconds >= sbFilter["sliderR2"] && thiscourse.trtSeconds <= sbFilter["sliderR1"]) ;
              });
            }

          }

         else {
           sbFilterArray3 = sbFilterArray2;
          }


          return sbFilterArray3;

        } //fn basic filter


        this.basicSort = function(sortSelection, coursesArray){

            var coursesArraySorted = coursesArray;


            if (sortSelection == "lessonsASC") {
              coursesArraySorted = coursesArray;
              coursesArraySorted.sort(function(obj1, obj2) {
                return obj1.totallessons - obj2.totallessons;
              });
            }

            if (sortSelection == "lessonsDSC") {
              coursesArraySorted = coursesArray;
              coursesArraySorted.sort(function(obj1, obj2) {
                return  obj2.totallessons - obj1.totallessons;
              });
            }

            if (sortSelection == "durationDSC") {
                coursesArraySorted = coursesArray;
                coursesArraySorted.sort(function(obj1, obj2) {
                    return  obj2.trtInt - obj1.trtInt;
                });
            }

            if (sortSelection == "durationASC") {
                coursesArraySorted = coursesArray;
                coursesArraySorted.sort(function(obj1, obj2) {
                    return  obj1.trtInt - obj2.trtInt;
                });
            }

            if (sortSelection == "newAdded") {
              coursesArraySorted = coursesArray ;
              coursesArraySorted.sort(function(a,b){return b.new-a.new});
            }

            return coursesArraySorted;

        }


        this.updateScroll = function (val){
          this.scrollVal2 = val ;
          window.localStorage.setItem("scrollVal2", val);
        };

        this.getScroll = function (){

          var val = this.scrollVal2;

          if (val == null || val == undefined || typeof val == undefined)
            val = window.localStorage.getItem("scrollVal2");

          if (val >= 0)
            return val;


        };


        this.updateFooterStatus = function (val){
          this.footerStats = val ;
          window.localStorage.setItem("footerStats", val);
        };

        this.getFooterStatus = function (){

          var val = this.footerStats;

          if (val == null || val == undefined || typeof val == undefined)
            val = window.localStorage.getItem("footerStats");
            return val;
        };


        this.reloadsbForm =  function (sbFilter, clear) {
            $.each(sbFilter, function(index, val) {
              if (val == true) {
                  $('#'+index).attr('checked',true)
                  $('#'+index).prop('checked',true)
              }
            });

            try {
              $("#sliderR1")[0].val($("#sliderR1")[0].min);
              $("#sliderR2")[0].val($("#sliderR2")[0].max);

            } catch (e) {

            }

        };


        this.clearsbForm = function () {

           $('input:checkbox').removeAttr('checked');

             $("#ckbxEn").removeAttr('checked');
             $("#ckbxEs").removeAttr('checked');
             $("#ckbxAr").removeAttr('checked');
             $("#chbxCourses").removeAttr('checked');
             $("#chbxClasses").removeAttr('checked');

           $('input[type=checkbox]').prop('checked',false);

             $("#ckbxEn").prop('checked',false);
             $("#ckbxEs").prop('checked',false);
             $("#ckbxAr").prop('checked',false);
             $("#chbxCourses").prop('checked',false);
             $("#chbxClasses").prop('checked',false);

           $('.library_sort_dropdown option[value="1"]').attr("selected",true);
           $(".library_sort_dropdown").val(1);
           var temp = getFilterValues();

        }

        //change view mode for library and sets off/on icons
        function changeViewMode(viewMode){
          if (viewMode == "btn-library_list" || viewMode == 1 )
          {
            $("#btn-library_list").addClass("active");
            $("#btn-library_flat").removeClass("active");
            $(".list-items_container").css("display","block");
            $(".flat-items_container").css("display","none");
          }

          if (viewMode == "btn-library_flat" || viewMode == 2)
          {
            $("#btn-library_flat").addClass("active");
            $("#btn-library_list").removeClass("active");
            $(".list-items_container").css("display","none");
            $(".flat-items_container").css("display","block");
          }

          window.localStorage.setItem("viewmode", viewMode);

        }


        //get sidebar form current option selection
        function getFilterValues(){
          var filterArray = [];
          var filterArrayls = {};

          filterArray["ckbxEn"] = $("#ckbxEn").prop('checked');
          filterArray["ckbxEs"] = $("#ckbxEs").prop('checked');
          filterArray["ckbxAr"] = $("#ckbxAr").prop('checked');
          filterArray["chbxCourses"] = $("#chbxCourses").prop('checked');
          filterArray["chbxClasses"] = $("#chbxClasses").prop('checked');
          filterArray["available1"] = $("#available1").prop('checked');
          filterArray["sliderR1"] = parseInt($("#sliderR1").val());
          filterArray["sliderR2"] = parseInt($("#sliderR2").val()); // .val so filter works

          filterArrayls = Object.assign({}, filterArray);
          filterArrayls = JSON.stringify(filterArrayls);
          window.localStorage.setItem('sbFilter',filterArrayls);



          return filterArray;
        }


    }

    Library.prototype               = Object.create(Page.prototype);
    Library.prototype.constructor   = Library;

    return Library;
});
