;define(['config!','jquery', 'ui/ModalWindow', 'ui/EmbedVideo'], function (config, $, ModalWindow ) {
  /*
  * DemoVideo constructor
  *
  */
  function DemoVideo ( ) {



    var selector = null;
    var $alert   = null;
    var video    = null;
    var muted    = null;

    /*
    * @params array
    * @that Object
    */
    this.showDemo           = function ( params, that ) {

          var defaults = {
            selector : '#videoWindow',
            source   : 'https://fileshare.knowledgecity.com/opencontent/howToDemo/'+that.getLanguage()+'/1-how-to.mp4'
          };
      if( params == 'undefined' ) params  = {};

      params = $.extend( defaults, params );

      selector            = params['selector'];
      $alert              = $(selector);
      video               = params['source'];
      muted               = ( typeof params['muted'] != 'undefined' ) ? params['muted'] : false;

      if( that.checkMobileNav() ) {
        window.open( video , '_blank');
        return;
      }
      if($alert.length === 0) {

        console.error('Template error: #videoWindow is not defined on the page!');
        alert(message);
        return;
      }

      var modalWindow         = new ModalWindow({
        modalID:        selector,
        top:            100,
        overlay:        0.8,
        isAlert:        false,
        isBlocking:     true,
        isConfirming:   false
      });


      return modalWindow.show().then( function () {

        $alert = $( selector + '.cloned' );
        var component           = new EmbedVideo(that,$alert);
        component.videoResource = video;
        component.ccResource = '';
        component.muted = muted;
        component.player();
        modalWindow.onRepositionModal($alert);

        $alert.find('[rel^=closeModal]').bind('click', function () {
            $alert.find('#welcome_video').empty();
            history.pushState("", document.title, window.location.pathname
                                                       + window.location.search);

            modalWindow.close();
        });
      });
    };
  }
  return DemoVideo;
});
