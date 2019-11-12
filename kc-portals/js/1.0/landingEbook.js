;define(['jquery', 'lib/Page', 'lib/CallGet', 'lib/CallPost', 'ui/ModalWindow', 'lib/SendForm', 'courses', 'ui/LoginForm'],
    function ($, Page, CallGet, CallPost, ModalWindow, SendForm, Courses, LoginForm) {

        function LandingEbook() {

            SendForm.call(this);
            Page.call(this);

            const that              = this;
            var lang                = this.getLanguage();
            var data                = {};
            var chapters            = [];

            this.defineSelector     = function () {
                return '#sendContactEbookForm';
            };

            this.defineEmailType     = function(){
               return 'ebooks_sendlink';
            };

            this.defineSuccessMsg    = function(){
                return 'Ebook Success';
            };

            this.defineContent      = function () {

                return $.when(
                        this.getCoursesEBooks(),
                        this.getSignUpMui()
                        ).then( ( ebooks, singup_mui ) => {

                        that.handleContentData(ebooks);
                        that.handleMuiSignup( singup_mui );

                        that.setContentData(data);
                        that.hideHeaderAndFooter();
                    });
            };

            this.getCoursesEBooks   = function () {
                var courses         = new Courses();
                return courses.getCoursesEBooks(this.appLocation.urlParts.all[3], this.getLanguage(), {});
            };

            this.getSignUpMui       = function () {
                var prom            = $.Deferred();
                this.remoteCall( new CallGet( 'mui/0www/0'+ this.getLanguage() +'/',
                    {   groups: 'page,Pages-SignUp',
                        code: 'all',
                        nested: true,
                        '_': this.config.LocalStorageStamp
                    },
                    function( res ) {
                        prom.resolve( res.response );
                     }).defineErrorHandler( ( res, status ) => {
                        prom.reject();
                    }));
                return prom;

            }

            this.handleContentData  = function (ebooks) {

                $.each(ebooks, function (i, item) {
                    if(item['ceid'] == that.appLocation.urlParts.all[4]){
                        data       = item;
                        that.handleMuiChapters(data.chapters);
                        return true;
                    }
                });
                this.checkUserAuth();
                if( localStorage.getItem( 'ebk-lnd-isSended' ) == "true" ) {
                    data.isAuth = localStorage.getItem( 'ebk-lnd-isSended' );
                    data.emailSended = localStorage.getItem( 'ebk-lnd-isSended' ); 
                }
            };

            this.checkUserAuth      = function () {
                if( that.user.isAuth() ) {
                    localStorage.setItem( 'ebk-lnd-name', that.user.getName() );
                    localStorage.setItem( 'ebk-lnd-email', that.user.getEmail() );
                    localStorage.setItem( 'ebk-lnd-isSended', true );
                }
            };

            this.handleMuiChapters  = function (muiChapters) {

                $.each(muiChapters, function (i, chapter) {

                    
                    chapters[i]            = {};
                    chapters[i]['lessons'] = [];
                    chapters[i]['number']  = i+1;
                    chapters[i]['isEven']  = that.isEven(i);
                    chapters[i]['title']        = chapter.chapter_name;
                    chapters[i]['description']  = chapter.chapter_description;

                    $.each(chapter.lessons, function (j, item) {
                        chapters[i]['lessons'][j]  = {
                                                                        title:item.lesson_name,
                                                                        number: j
                                                                     };
                     });

                    data.chapters   = chapters;
                });
            };
            this.handleMuiSignup    = function ( mui ) {
                data.labels = mui.buttonLabel;
                data.landing = mui.pageContent.ebook.landing;
                $.extend( data.labels,mui.SignUp );
            };
            this.explodeMuiValue    = function(value) {

                var result          = {
                    key:    null,
                    value:  null
                };

                if(value && value.search(':') > 0) {

                    var parts       = value.split(':');
                    result.key      = parts[0];
                    result.value    = parts[1];
                }
                return result
            };

            this.isEven             = function(value) {

                return value % 2 == 1;
            };


            this.hideHeaderAndFooter       = function () {
                this.outContentPromise.done( function () {
                    $('header').removeClass('hidden');
                    $('#header').addClass('hidden');
                    $('footer').removeClass('hidden');
                    $('#footer').addClass('hidden');
                });
            };

            /**
             * To send E-book link to user 
             * @param formData
             */
            this.onSubmitForm       = function( form, event ) {
                // local storage is usted to know if the user has logged in or used ebooks landing page form to download an e-book before 
                if( localStorage.getItem( 'ebk-lnd-isSended' ) != "true" ) { 

                    event.preventDefault();
                    that.lockForm(form);
                    var formData        = that.defineFormData(form);
                    localStorage.setItem( 'ebk-lnd-name', formData.f_name );
                    localStorage.setItem( 'ebk-lnd-email', formData.email );
                    localStorage.setItem( 'ebk-lnd-isSended', "true" );
                }

                var params          = {
                    'type'    :     this.defineEmailType(),
                    'lang'    :     this.getLanguage(),
                    'content' :     {
                        'name'               :   localStorage.getItem( 'ebk-lnd-name' ),
                        'email'              :   localStorage.getItem( 'ebk-lnd-email' ),
                        'eBook'              :   data.name,
                        'link'               :   data.fileURL,
                        'file'               :   data.file,
                        'preview'            :   data.previewURL,
                        'body'               :   data.email_body,
                        'signature'          :   data.signature,
                        'signature_name'     :   data.signature_name,
                        'signature_position' :   data.signature_position,
                        'note_blow'          :   data.note_blow
                    }
                };

                const self          = this;

                that.showProgressOverlay();

                this.remoteCall(new CallPost('portals/' + this.config.portal.portal_id + '/marketing/contacts', params, function (response) {

                    let closeOnSend = $(form).data('close'),
                    timeout     = closeOnSend ? 1000 : 5000;

                    self.unlockForm(form);

                    $(form).find("input[type!='hidden'],input[type!='submit'],textarea").val('');
                    // fix for IE
                    if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/)) || (typeof $.browser !== "undefined" && $.browser.msie == 1)) {
                        $(form).find("input[type!='hidden'],textarea").val('');
                        $(form)[0].reset();
                        if($('#partnership').hasClass('form')) {
                            $('.form').addClass('submitted');
                            $(form).find("input,textarea").val('');
                        }
                    }
                    self.onSend(formData);

                }).defineErrorHandler(function (query, status, errorThrown) {

                    console.error('Error send email: ' + status + ', error: ' + errorThrown);
                    // self.showAlert(self.getMessageByCode(self.ERROR), true).then(function () {
                    //     self.unlockForm(form);
                    // });
                    self.unlockForm(form);
                })).always(function () {
                    self.hideProgressOverlay();
                });
            };

            this.onSend             = function(formData) {
                var name = data.name.toLowerCase().replace(/\ /g, '-');
                window.history.pushState( {}, '', '/' + that.getLanguage() + '/promoEbook/course/' + data.course_id + '/' + data.ceid  + '/' + name );
                that.onChangeLocation();
                
            };

            this.onGetEbook           = function () {
                if( localStorage.getItem( 'ebk-lnd-isSended' ) == "true" ) {
                     that.onSubmitForm( {}, window.event );
                } else {

                var name = data.name.toLowerCase().replace(/\ /g, '-');
                window.history.pushState( {}, '', '/' + that.getLanguage() + '/promoEbook/course/' + data.course_id + '/' + data.ceid  + '/' + name  );
                that.onChangeLocation();
                }
            };

            this.updateUserView             = function () {
                that.invalidateMain();
                $.when( this.getCoursesEBooks() ).then( function( ebook ) {
                    if( !that.user.needChangePass() ) {
                        that.checkUserAuth();
                        that.onSubmitForm({}, window.event );
                    } else {
                        that.redirect( 'myAccount' );    
                    }
                });
            };
        }
        LandingEbook.prototype              = Object.create(Page.prototype);
        LandingEbook.prototype.constructor  = LandingEbook;

        return LandingEbook;

    });