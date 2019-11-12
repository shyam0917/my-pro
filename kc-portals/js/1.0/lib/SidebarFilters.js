;define(['jquery'], function($){

	function SidebarFilters() {

		this.applyFilters = function(sbFilter,content, currentPage, currentLimit, trigger, libraryThis, sessionID, srtSelection) {

		  if (sbFilter == 1) { //Clear Filter and reload full array
		    libraryThis.clearsbForm();
		    sbFilter = false;
		    content = that.formatRenderCourses(content, currentPage, currentLimit);
		    that.updatesortSelect(content.courses, trigger);

		  }
		  //IF LOOGGED IN
		  if (sessionID) {
		    $.when(libraryThis.matchUserCourses(sbFilter,content)).done(function(resCoursesMatched) {


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
		      content = libraryThis.basicFilters(sbFilter,content, trigger);
		    }
		    else{
		      if (window.localStorage.getItem("sbFilter")) {
		        sbFilter = window.localStorage.getItem("sbFilter");
		        sbFilter = JSON.parse(sbFilter);

		        content = libraryThis.basicFilters(sbFilter,content, 4);
		        libraryThis.reloadsbForm(sbFilter);

		      }
		    }

		    if (srtSelection){
		      content = libraryThis.basicSort(srtSelection,content);
		    }

		    content = this.Page.formatRenderCourses(content, currentPage, currentLimit);
		    this.Page.updatesortSelect(content.courses, trigger);

		  } // else not loggged in

		}

		this.formatRenderCourses = function (coursesArray, currentPage, currentLimit, banderaFiltro){

			if (coursesArray != true) { //array is not array is just a true, so no enter

			 var coursesRealArray = coursesArray;
			 var totalLessons = 0;
			 $("#totalCourses").text(coursesRealArray.length);

			 	// no filter, means is first load, means coursesRealArray will get values from
				if (typeof banderaFiltro == true ) {
					coursesArray.courses =   this.globalArray;
					coursesRealArray = coursesArray.courses;
				}

				// filter exist, means is not first load
				if (typeof banderaFiltro != true ) {
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

		}



	}
return SidebarFilters;
});
