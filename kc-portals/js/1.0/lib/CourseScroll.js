;define(['jquery'], function($){

	function CourseScroll () {

		this.scrollEvents = function (vpHeight, position, currentScroll, theSidebar, theVideo, topVar) {

			this.updateSizes();
			/*
			var position = window.localStorage.getItem("position");
			if (!position) {
				var position = $(window).scrollTop(position);
			}

			var currentScroll = $(window).scrollTop();
			var theSidebar = $("#course-lessons");
			var vpHeight =  $(window).height() - 160;
			var theVideo = $(".course-container-sticky");
			var portalName = page.getPortalName();
			var topVar = "160px";
*/
/*
			if (portalName != "www") {
				topVar = "99px"
				vpHeight =  $(window).height() - 99;
			}
*/

			if (currentScroll < 10) {
				this.updateSizes();

			}

			if ($(".course-page_playlist").height() < vpHeight) {

					theSidebar.css("position","sticky");
					theSidebar.addClass("sticky-top160");
					theSidebar.css("top",topVar);
					theSidebar.css("bottom","auto");
					theSidebar.css("margin-top","0");

					if (currentScroll > 1)
						theSidebar.addClass("smallSideBar");

			}

			// SCROLL GOES DOWN
			else if(currentScroll > position ) {

				theSidebar.removeClass("smallSideBar");
				theSidebar.removeClass("smallSidebarSticky");

				if (currentScroll > 1) {


					if ( theSidebar.hasClass("sticky-top160") || theSidebar.hasClass("upFromFooter")) {

						theSidebar.removeClass("sticky-top160");
						theSidebar.removeClass("upFromFooter");
						theSidebar.css("top","auto");
						theSidebar.css("position","relative");
						theSidebar.css("margin-top",currentScroll);
					}

					if ( isOnScreenCs("#cpsbBottom") ) {

						theSidebar.css("width",$(".course-sidebar").width()+"px");
						theSidebar.addClass("fixed-bottom");
						theSidebar.css("position","fixed");
						theSidebar.css("bottom","20px");
					}

					if ( isOnScreenCs(".footer") ) {

						if (theSidebar.hasClass("fixed-bottom")) {

							theSidebar.removeClass("fixed-bottom");
							theSidebar.addClass("absolute-bottom");
							theSidebar.parent().css("position","relative");
							theSidebar.css("position","absolute");
							theSidebar.css("bottom","0px");
							theSidebar.css("margin-top","auto");
						}

						if (theVideo.hasClass("fixed-bottom")) {

							theVideo.removeClass("fixed-bottom");
							theVideo.css("position","absolute");
							theVideo.css("bottom","0px");
							theVideo.css("margin-top","0");
							theVideo.addClass("absolute-bottom");
						}

					}

					if ( theSidebar.hasClass("upFromFooter") ) {

						theSidebar.css("position","relative");
						theSidebar.css("margin-top", currentScroll);
						theSidebar.removeClass("upFromFooter");
					}


					if (isOnScreenCs("#vcBottom") && theVideo.hasClass("absolute-bottom") == false ) {

						theVideo.css("width",$(".course-container").width()+"px");
						theVideo.addClass("fixed-bottom");
						theVideo.removeClass("upFromFixBtm");
						theVideo.css("position","fixed");
						theVideo.css("bottom","20px");
					}

					if (theVideo.hasClass("sticky-top160")) {

						theVideo.removeClass("sticky-top160");
						theVideo.css("top","auto");
						theVideo.css("position","relative");
						theVideo.css("margin-top",currentScroll);

					}

				}
			} //scrollDown

			// SCROLL GOES UP
			else if(currentScroll < position )  {
				theSidebar.removeClass("smallSideBar");
				theSidebar.removeClass("smallSidebarSticky");


				if (  theSidebar.hasClass("fixed-bottom")) { //scroll up when fixed bottom, no footer visible

					var marginTop = theSidebar.offset().top
					 marginTop = marginTop - 145; //removes headers height
					theSidebar.css("position","relative");
					theSidebar.css("margin-top", marginTop );
					theSidebar.removeClass("fixed-bottom");
					theSidebar.addClass("upFromFixBtm");

				}


				if ( isOnScreenCs("#cpsbTop") || (isOnScreenCs("#cpsbTop") && theSidebar.hasClass("upFromFixBtm") )    ) {

					theSidebar.css("position","sticky");
					theSidebar.css("width",$(".course-sidebar").width()+"px");
					theSidebar.addClass("sticky-top160");
					theSidebar.css("margin-bottom","auto");
					theSidebar.css("margin-top","0");
					theSidebar.css("top",topVar);
					theSidebar.removeClass("upFromFixBtm");

				}

				if ( isOnScreenCs(".footer") == false && theSidebar.hasClass("absolute-bottom") && isOnScreenCs("#cpsbTop") )
				{
					//console.log("Case 8");
					theSidebar.removeClass("absolute-bottom");
					theSidebar.addClass("upFromFooter");
					theSidebar.css("bottom","auto");
					theSidebar.css("width",$(".course-sidebar").width()+"px");
					theSidebar.css("position","fixed");

				}

				//VIDEO VIDEO VIDEO VIDEO

				if (theVideo.hasClass("fixed-bottom")) {

					var marginTop = theVideo.offset().top
					marginTop = marginTop - 145; //removes headers height

					theVideo.css("position","relative");
					theVideo.css("margin-top", marginTop );
					theVideo.removeClass("fixed-bottom");
					theVideo.addClass("upFromFixBtm");
				}

				if ( typeof ($("#vcTop").offset().bottom) != undefined && $("#vcTop").offset().bottom > -5 ) {

					theVideo.addClass("sticky-top160");
					theVideo.css("position","sticky");
					theVideo.css("top",topVar);
					theVideo.css("bottom","auto");
					theVideo.css("margin-top","0");
					theVideo.removeClass("absolute-bottom");

					if (theVideo.hasClass("upFromFixBtm"))
							theVideo.removeClass("upFromFixBtm");

				}


			} //scroll UP

			window.localStorage.setItem("position",currentScroll); //update position

		}

		//Adjuts lements sizes when sidebar expands/collapse
		 this.updateSizes = function (){

			//var vpHeight = $(window).height()-160;
			var sidebarContainer = $('.course-sidebar');
			var videoContainer = $('.course-video-container');
			var sbHeight = $('#course-lessons').height();
			var vcHeight = $('.course-container-sticky').height();

			if (sbHeight > vcHeight) {

				videoContainer.css("height",sbHeight+"px");
				$('.inner-page__row_course-page').css("height",sbHeight+"px"); // so video container can magic scroll
				$('.course-container').css("height",sbHeight+"px"); // so sidebar container can magic scroll
					sidebarContainer.css("height",sbHeight+"px");

			}

			//sidebar height is smaller than videocontent height
			if (sbHeight < vcHeight ) {

				$('.inner-page__row_course-page').css("height", vcHeight+"px");
				sidebarContainer.css("height",vcHeight+"px");
				videoContainer.css("height",vcHeight+"px");
				sidebarContainer.css("height",vcHeight+"px")

				if (sbHeight < $(".course-container-sticky").height()  )
					$(".course-container").css("height", $(".course-container-sticky").height()+"px");

				else if (sbHeight > $(".course-container-sticky").height()  )
					$(".course-container").css("height", sbHeight+"px");

			}

		}


	}




	function isOnScreenCs(elem) {
		// if the element doesn't exist, abort
		if( elem.length == 0 ) {
			return;
		}
		var $window = jQuery(window);
		var viewport_top = $window.scrollTop();
		var viewport_height = $window.height();
		var viewport_bottom = viewport_top + viewport_height;
		var $elem = jQuery(elem);
		var top = $elem.offset().top;
		var height = $elem.height();
		var bottom = top + height;

		return (top >= viewport_top && top < viewport_bottom) ||
		(bottom > viewport_top && bottom <= viewport_bottom) ||
		(height > viewport_height && top <= viewport_top && bottom >= viewport_bottom)
	}


return CourseScroll;
});
