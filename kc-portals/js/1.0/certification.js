;define(['jquery', 'lib/Page', 'lib/CallGet'], function($, Page, CallGet){

    function Certification() {

        Page.call(this);

        this.getClassName           = function () {
            return 'Certification';
        };

        this.defineContent          = function () {

            this.assignPageHandlers();

            return this.getPageMui().done((res) => {
              if(this.getLanguage() != 'en') {
                $.extend(res, {'lang': this.getLanguage().toUpperCase()})
              }
              if(typeof res.steps != 'undefined') {
                res.steps = this.handleStepsData(res.steps);
              }
              this.setContentData(res);

              this.setEndCertificationHandler();

            });
        };
        // function to create an array for certification steps on mewa
        this.handleStepsData        = function (steps) {

          let ret = $.map(steps, function (value, index) {
            return [value]
          });
          return ret;
        };
        this.onImgLoadError         = function (node, event) {

            $(node).attr('src', this.getMainData().IMG + 'main-course.jpg')

        };
        // function to adjust steps of certification
        this.setEndCertificationHandler   = function () {

              this.loadStylesPromise.done( () => {
                var maxH = 0;
                $('.certification-end-content .items-description').each( function () {
                    if ( $(this).outerHeight() > maxH ) {
                      maxH = $(this).outerHeight();
                    }
                });
                $('.certification-end-content .items-description').css( 'height', maxH+'px' );
              });
        };
    }

    Certification.prototype               = Object.create(Page.prototype);
    Certification.prototype.constructor   = Certification;

    return Certification;
});
