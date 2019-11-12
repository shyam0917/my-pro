var tmp = new Templater();
$(document).ready(function () {

  $.when( tmp.getConfig() ).then( function() {
    $.when( tmp.getRedirectUsers() ).then( function (){
      $.when( tmp.getContent() ).then( function() {
        $.when( tmp.getTemplate() ).then( function( html ) {
          tmp.runTemplate( html );
        });
      });
    });
  });

});
