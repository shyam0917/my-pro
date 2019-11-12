;define(['jquery'], function($){

	function LibraryScroll() {
/*
		var position = window.localStorage.getItem("position");
		var currentScroll = $(window).scrollTop();
		var theSidebar = $('.library_sidebar');
		var sbWidth = $(".inner-page__sidebar").width();
		var viewPort = $(window).height() - 94 ;
		var theContainer = $("#course-container");
		var shortSidebar =  (theSidebar.height()+20) < viewPort ? true : false;
		var shortContent =  (theContainer.height()+20) < viewPort ? true : false;
*/

 	this.scrollFunctions = function(position, currentScroll, theSidebar, sbWidth, viewPort, theContainer, shortSidebar, shortContent) {

		this.updateSizesLibrary();

		//SCROLL DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN
		if(currentScroll > position ) {

			if( shortSidebar == true   )
				theSidebar.addClass("sticky-top");


			if( shortContent == true   )
				theContainer.addClass("sticky-top");


			if( isOnScreen( jQuery( '#sbBottom' ) ) && shortSidebar == false   ) {

				theSidebar.removeClass("sticky-top")
				theSidebar.addClass("fixed-bottom");
				theSidebar.css("position","fixed")
				theSidebar.css("bottom","20px")
				theSidebar.css("width",theSidebar.parent().width()+"px");
				theSidebar.css("max-width",theSidebar.parent().width()+"px");
			}


			if ( (theSidebar.hasClass("sticky-top") || theSidebar.hasClass("upFromFooter") )  && shortSidebar == false  ) {

				theSidebar.css("position","relative");
				theSidebar.removeClass("sticky-top");
				theSidebar.removeClass("upFromFooter");
				theSidebar.css("top","auto");

				if (currentScroll > 69) {
				theSidebar.css("margin-top",(currentScroll -55 )+"px");
				}
				else{
					theSidebar.css("margin-top",(20)+"px");
				}

			}


										//COURSES COURSES COURSES
			if ( (theContainer.hasClass("sticky-top") || theContainer.hasClass("upFromFooter")) && shortContent == false ) {

			///console.log("Viendo footer de container CASO 2");
				theContainer.css("position","relative");
				theContainer.removeClass("sticky-top");
				theContainer.removeClass("upFromFooter");
				theContainer.css("top","auto");

				if (currentScroll > 69) {
						theContainer.css("margin-top",( currentScroll - 65 )+"px");
				}
				else{
					theContainer.css("margin-top","0px");
				}

			}

			if ((theContainer.height() > viewPort) || (theContainer.height() < theSidebar.height()) ) {

				if( isOnScreen( jQuery( '#clBottom' ) ) && shortContent == false ) {
					var ccWidth = theContainer.width();
					theContainer.addClass("fixed-bottom");
					theContainer.css("position","fixed")
					theContainer.css("bottom","20px")
					theContainer.css("width","100%");
				}
			}



			if ( isOnScreen(".footer")  ) {

				//console.log("Viendo FOOTER");
				if (theSidebar.hasClass("fixed-bottom")) {
					theSidebar.removeClass("fixed-bottom");
					theSidebar.addClass("absolute-bottom");
					theSidebar.parent().css("position","relative");
					theSidebar.css("position","absolute");
					theSidebar.css("bottom","0px");
					theSidebar.css("margin-top","auto");

				}

				if (theContainer.hasClass("fixed-bottom") && shortContent == false  ) {

					theContainer.removeClass("fixed-bottom");
					theContainer.addClass("absolute-bottom");
					theContainer.parent().css("position","relative");
					theContainer.css("position","absolute");
					theContainer.css("bottom","0px");
					theContainer.css("margin-top","auto");
				}

			}


		} //scrollDown


		//SCROLL UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP
			if(currentScroll < position  ) {

			//scroll up when fixed bottom, no footer visible
			if (  theSidebar.hasClass("fixed-bottom") ) {
				var marginTop = theSidebar.offset().top
				marginTop = marginTop - 145; //add headers height
				theSidebar.css("position","relative");
				theSidebar.css("margin-top", marginTop );
				theSidebar.removeClass("fixed-bottom");
				theSidebar.addClass("upFromFixBtm");

			}

			if ( isOnScreen("#sbTop") || (isOnScreen("#sbTop") && theSidebar.hasClass("upFromFixBtm") )    ) {
				this.updateSizesLibrary()

				theSidebar.css("position","sticky");
				theSidebar.css("width",theSidebar.parent().width()+"px");
				theSidebar.css("max-width",theSidebar.parent().width()+"px");
				theSidebar.addClass("sticky-top");
				theSidebar.css("margin-bottom","auto");
				theSidebar.css("margin-top","0");
				theSidebar.css("top","120px");
				theSidebar.removeClass("upFromFixBtm");
				theSidebar.removeClass("absolute-bottom");

			}

			if (isOnScreen("#clTop") || ( isOnScreen("#clTop") && theContainer.hasClass("upFromFixBtm") ) ) {

				var ccWidth = theContainer.width()
				theContainer.css("position","sticky");
				theContainer.css("width","100%");
				theContainer.addClass("sticky-top");
				theContainer.css("margin-bottom","auto");
				theContainer.css("margin-top","0");
				theContainer.css("top","120px");
				theContainer.removeClass("upFromFixBtm");
				theContainer.removeClass("absolute-bottom");
			}


			//COURSES COURSES Courses
			if( theContainer.hasClass("fixed-bottom") ) {
				var marginTop = theContainer.offset().top
				marginTop = marginTop - 145; //add headers height

				theContainer.css("position","relative");
				theContainer.css("margin-top", marginTop );
				theContainer.removeClass("fixed-bottom");
				theContainer.addClass("upFromFixBtm");
			}


		} //scrollUP


			 window.localStorage.setItem("position",currentScroll);
	 } //scrollFunctions



	 this.updateSizesLibrary = function() {
 		 var sbContent = $(".inner-page__sidebar");
 		 var clContent = $("#course-container");
 		 var theSidebar = $('.library_sidebar');
 		 var mainContainer = $(".inner-page__row");

 		 theSidebar.height($(".library-menu").height()); // sep 19
 		 sbContent.height(theSidebar.height()+"px")

 		 var sbHeight = sbContent.height();
 		 var ccHeight = clContent.height();


 		 if (sbHeight < ccHeight)
 			 {
 				 sbContent.height(ccHeight+"px");
 				 mainContainer.height(ccHeight+"px");
 				 $(".inner-page__content").height(ccHeight+"px");

 			 }
 		 if (sbHeight > ccHeight)
 			 {
 				 //clContent.height(sbHeight+"px");
 				 mainContainer.height(sbHeight+"px");
 				 $(".inner-page__content").height(sbHeight+"px");

 			 }

 	 }



 }







	function isOnScreen (elem){
		// if the element doesn't exist, abort
		if( elem.length == 0 ) {
			return;
		}
		var $window = jQuery(window)
		var viewport_top = $window.scrollTop()
		var viewport_height = $window.height()
		var viewport_bottom = viewport_top + viewport_height
		var $elem = jQuery(elem)
		var top = $elem.offset().top
		var height = $elem.height()
		var bottom = top + height

		return (top >= viewport_top && top < viewport_bottom) ||
		(bottom > viewport_top && bottom <= viewport_bottom) ||
		(height > viewport_height && top <= viewport_top && bottom >= viewport_bottom)
	}

return LibraryScroll;
});
