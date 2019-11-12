;define(['jquery','lib/FormPage','lib/Page', 'lib/CallGet' ,'lib/FormSet'], function($,FormPage,Page, CallGet, FormSet){
    function Feedback() {

        

        var page = this;
        let data = {};
        Page.call(this);
        console.log( Page.call(this));

       this.defineContent          = function() {

            this.outContentPromise.done(() => {
              
            });

            return $.when(
                
            this.getPageMui()

            ).then(( mui) => {
                console.log("this");
                console.log(this);
               
                console.log("mui");
                console.log(mui);
                let data = Object.assign(mui);
                console.log(data);

                this.setContentData(data);
               

            });


        };


    /*    this.defineContent          = function () {
         
                return $.when(this.getPageMui().done((res) => {
                    console.log(res),
                    console.log(this);
                    console.log(that);
                    console.log(this.getContentData(res));
                    console.log(this.setContentData(res));
                this.setContentData(res),
                this.getUrlParts()

            });

            
        };*/

        this.getFeedbackQuestion = function (argument) {
             let prom = $.Deferred();
             this.remoteCall(new CallGet('url' , {}, (res) => {
                        prom.resolve(res);                        
                        
                    })
                    .defineErrorHandler(function (query, status) {
                        prom.reject({});
                    })
                    .asCached().asLocalCached());
                     return prom;
        }


        this.importOptionsFromUrl   = function (url) {

            var parameters          = page.getUrlParameters(url);
            console.log(parameters);
        };

        this.getUrlParts = function(){
            var location        = this.appLocation.urlParts.all
            console.log(location);
        }
    }

    Feedback.prototype               = Object.create(Page.prototype);
    Feedback.prototype.constructor   = Feedback;

    return Feedback;
});