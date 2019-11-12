;define([ '!config', 'jquery', 'lib/Page', 'lib/CallGet','courses'], function(config, $, Page, CallGet, Courses){

	function promoEbook () {

		Page.call( this );

        const that              = this;
        var lang                = this.getLanguage();
        var data                = {};


		this.defineContent      = function() {

			return $.when( 
                    that.getEbookMui(),
                    that.getRandomEbooks(),
                    that.getCoursesEBooks()
				).then( ( ebook_mui, rnd_ebooks, main_ebook ) => {
					that.handleContentData( main_ebook );
					that.setHandlers();
					that.setContentData( data );
					that.hideHeaderAndFooter();
				});
		};

		this.getCoursesEBooks   = function () {
            var courses         = new Courses();
            return courses.getCoursesEBooks(this.appLocation.urlParts.all[3], this.getLanguage(), {});
        };

        this.handleContentData  = function (ebooks) {
            $.each(ebooks, function (i, item) {
                if(item['ceid'] == that.appLocation.urlParts.all[4]){
                    data.main_ebook = item;
                    return true;
                }
            });
        };
        this.setHandlers        = function() {

        	return true
        };
        this.getEbookMui               = function() {
        	return this.remoteCall( new CallGet( 'mui/0'+this.getPortalName()+'/0'+this.getLanguage(), {
	    		'code' : 'all',
	    		'nested' : true,
	    		'groups' : 'page,Pages-SignUp',
                '_': this.config.LocalStorageStamp
			} ,function(res) {
				if( typeof res.response !== 'undefined' ) {
					data.mui = {};
					data.mui.ebook = res.response.pageContent.ebook;
					data.mui.tryit = res.response.buttonLabel;
					$.extend(data.mui.tryit, res.response.SignUp);
		    		
				}
			}));
        };
        this.getRandomEbooks         = function () {
        	var params = {
        		'ceid_ebook' : that.appLocation.urlParts.all[4],
        		'lang'       : this.getLanguage() 
        	};
        	return this.remoteCall( new CallGet( 'courses/ebooks/' , params, function (resp) {
        		if( resp.response.length  > 0 ) {
                    var rndEbooks = [];
                    $.each(resp.response, function( i, item ) {
                        if(item.preview != '' && item.file !='') {
                            item.previewUrl =  that.config.CDNPortal + 'opencontent/courses/ebook/previews/' +
                                               item.course_id + '/' + item.lang + '/' + item.preview;
                            item.fileUrl    =  that.config.CDNPortal + 'opencontent/courses/ebook/files/' +
                                               item.course_id+ '/' + item.lang + '/' + item.file;
                            if( i > 0 )
                                rndEbooks.push(item);
                            else if( that.config.portal.portal_code !='www' || that.user.isAuth() ) 
                                    data.second_ebook = item;
                        }
                    });
                    if( rndEbooks.length > 0 ){
                        data.rnd = 1;
		    		    data.randomEbooks = rndEbooks;
                    }	
        		}
        	}));
        };
	    this.hideHeaderAndFooter       = function() {
	        this.outContentPromise.done(function () {
	            $('header').addClass('hidden');
	            $('header[data-signup="true"]').removeClass('hidden');
	            $('footer').removeClass('hidden');
	            $('#footer').addClass('hidden');
	        });
	    };


	    this.onLandingEbook             = function ( n, e ) {

            e.preventDefault();
            var ebook_ceid  = $(n).attr('data-ceid');
            var course_id   = $(n).attr('data-course');
            var name        = $(n).closest('.pdf-wrapper').find('.ebook-name').text();
            name            = name.toLowerCase().replace(/\ /g, '-');
            window.history.pushState( {}, '', '/' + this.getLanguage() + '/landingEbook/course/' +course_id + '/' + ebook_ceid + '/' + name );
            this.onChangeLocation();
        };

        this.onChangeToSignUp          = function ( n, e, ) {
            e.preventDefault();
            window.history.pushState( {}, '', '/' + this.getLanguage() + '/signUp/type/individual' );
            this.onChangeLocation();
        }
	}
    promoEbook.prototype               = Object.create(Page.prototype);
    promoEbook.prototype.constructor   = promoEbook;
    return promoEbook;
});