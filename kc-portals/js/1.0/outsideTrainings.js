;define(['lib/Page', 'lib/CallGet'], function(Page, CallGet){

    function OutsideTrainings() {

        Page.call(this);

        this.getClassName           = function () {
            return 'OutsideTrainings';
        };

        this.defineContent          = function () {
            return this.getPageMui().done((res) => {
              this.setContentData(this.buildData(res));
            });
        };

        this.buildData              = function( data ){
            var list  = data.outsideTrainingsList.outsideTrainings;
            if( list ){ data['outsideTrainingsList'] = list; }
            return data;
        };

    }

    OutsideTrainings.prototype               = Object.create(Page.prototype);
    OutsideTrainings.prototype.constructor   = OutsideTrainings;

    return OutsideTrainings;
});
