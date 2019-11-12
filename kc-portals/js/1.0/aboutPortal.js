;define(['jquery', 'lib/Page', 'lib/CallGet', 'ui/ModalWindow', 'ui/PreviewModal', 'owl', 'ui/EmbedVideo'], function($, Page, CallGet, ModalWindow, PreviewModal){

    function AboutPortal() {

        Page.call(this);
        const that                  = this;
        this.getClassName           = function () {
            return 'AboutPortal';
        };

        this.defineContent          = function () {

            $.when (this.outContentPromise, this.loadStylesPromise).done(() => {
                this.renderClientsCarousel();
                // this.setHandlers();
            });
            return $.when( 
                this.getPageMui(),
                this.getClientsData()
            ).then((mui, clients) => {
                let data = {};
                $.extend(data, mui);
                $.extend(data, {'clients': clients});

                this.setContentData(data);

            });

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
                'loop': true,
                'margin': 20,
                'speed': 1500,
                'dots': true,
                'slideBy': 'page',
                'responsive': {
                    0:{
                        'items': 2
                    },
                    400: {
                        'items': 3
                    },
                    700: {
                        'items': 5
                    },
                    1000 : {
                        'items': 6
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

        this.onShowVideo        = function ( node, event ) {

            var selector            = '#videoWindow';
            var $alert              = $(selector);
            if( this.checkMobileNav() ) {
                window.open('https://fileshare.knowledgecity.com/opencontent/introvideos/knowledgecity/'+this.getLanguage()+'/About_Us_Education.mp4', '_blank');
                return;
            }
            if($alert.length === 0) {

                console.error('Template error: #videoWindow is not defined on the page!');
                alert(message);
                return;
            }

            var modalWindow         = new ModalWindow({
                'modalID':        selector,
                'top':            100,
                'overlay':        0.8,
                'isAlert':        false,
                'isBlocking':     true,
                'isConfirming':   false
            });

            
            modalWindow.show().then( function () {
                $alert = $( selector + '.cloned' );
                var component           = new EmbedVideo(that,$alert);
                component.videoResource = 'https://fileshare.knowledgecity.com/opencontent/introvideos/knowledgecity/'+that.getLanguage()+'/About_Us_Education.mp4';
                component.player();
                modalWindow.onRepositionModal($alert);

                $alert.find('[rel^=closeModal]').bind('click', function () {
                    $alert.find('#welcome_video').remove();
                    modalWindow.close();
                });
            });
        };
    }

    AboutPortal.prototype               = Object.create(Page.prototype);
    AboutPortal.prototype.constructor   = AboutPortal;

    return AboutPortal;
});