;define(['lib/FormPage', 'lib/CallGet', 'owl'], function(FormPage, CallGet){

    function contentCreation() {

        FormPage.call(this);
        const that                  = this;
        this.getClassName           = function () {
            return 'contentCreation';
        };

        this.defineContent          = function () {

            $.when (this.outContentPromise, this.loadStylesPromise).done(() => {
                this.renderClientsCarousel();
                // this.setHandlers();
            });
            return $.when( 
                this.getPageMui(), this.getClientsData() 
            ).then(( mui, clients ) => {
                $.extend( mui, {'clients': clients} );
                let data = mui;
                this.setContentData(data);

            });
        };

        this.defineEmailType    = function () {

            return 'portals/' + this.getPortalName() + '/contact_us';
        };

        this.defineFormData             = function ( form ) {
             var formData        = {};

            // get all form data
            $(form).find('input[type="text"],input[type="email"],textarea,select').each(function () {
                formData[$(this).prop('name')] = $(this).val();
            });
            formData['comments']+= '<br><br>Categories of interest:';
            $(form).find('input[type="checkbox"]').each( function () {
                if($(this).prop('type') == 'checkbox' && $(this).prop('checked')){
                    formData['comments'] += '<br>';
                    formData['comments'] +=  $(this).val();
                    return true;
                }
                if($(this).prop('type') == 'checkbox' && !$(this).prop('checked')){
                    return true;
                }
            })
            return formData;
        };

        this.defineSelector     = function () {

            return '#cc-contact';
        };

        this.getClientsData             = function () {
            let prom = $.Deferred();
         
            $.get(this.config.pathTemplate + '/json/clients--v'+this.config.LocalStorageStamp+'.json',

                clients => {


                    if (typeof  clients === 'string') {
                     
                        clients =  $.parseJSON(clients);
                    }

                    prom.resolve(this.handleClientsData(clients))
                }).fail(() => {
                    prom.resolve({});
                });

            return prom;

        };

        this.handleClientsData          = function (clients) {

            return clients.map(client => {

                let data = {
                    logo: `${this.getMainData().IMG}clients/logos/${client.name}${!client.company || typeof client.company === 'undefined' ? '' : '-' + this.getLanguage()}--v${this.config.LocalStorageStamp}.png`,

                };

                if(client.company){
                    data.name   = client.company[page.getLanguage()];
                    data.height = 50;
                }

                if (client.title) {
                    data.title = typeof client.title === 'string' ? client.title : client.title[this.getLanguage()]
                }

                return data;

            });

        };
        this.renderClientsCarousel = () => {

            const target = '#clientsCarousel';
        
            $(target).owlCarousel({
                loop: true,
                margin: 20,
                speed: 1500,
                dots: true,
                slideBy: 'page',
                responsive: {
                    0:{
                        items: 2
                    },
                    400: {
                        items: 3
                    },
                    700: {
                        items: 5
                    },
                    1000 : {
                        items: 6
                    }
                }
            });
        };

        this.onPrevClients = function() {
            $('#clientsCarousel').trigger('prev.owl.carousel');
        };

        this.onNextClients = function() {
            $('#clientsCarousel').trigger('next.owl.carousel');
        };

    }

    contentCreation.prototype               = Object.create(FormPage.prototype);
    contentCreation.prototype.constructor   = contentCreation;

    return contentCreation;
});