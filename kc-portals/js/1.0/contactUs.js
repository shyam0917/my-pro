;define(['jquery', 'lib/FormPage', 'lib/CallGet'], function($, FormPage, CallGet){

    function ContactUs() {

        FormPage.call(this);

        this.getClassName           = function () {
            return 'ContactUs';
        };

        this.defineContent          = function () {

            return $.when(this.getPageMui()).then((res) => {

                this.setContentData(res);

                this.outContentPromise.done(() => {

                    if(this.user.isAuth()) {

                        $(this.defineSelector() + ' [name=email]').val(this.user.getEmail());
                        $(this.defineSelector() + ' [name=name]').val(this.user.getName());
                    }

                    this.setHandlers();
                });

            });


        };

        this.defineSelector     = function () {

            return '#contactUs';
        };

        this.defineEmailType    = function () {

            return 'portals/' + this.getPortalName() + '/contact_us';
        };

        this.ctrlMap           =  () => {

            this.outContentPromise.done(() => {

                if (document.getElementById('map-script')) {

                    window.initMap();

                } else {

                    let script = document.createElement('script');
                    script.id   = 'map-script';
                    script.type = 'text/javascript';
                    script.src = '//maps.googleapis.com/maps/api/js?key=AIzaSyDkLYsbuW9ABUPq-HAHpkbxW1Z9scVjMMU&callback=initMap&language=' + this.getLanguage();
                    document.body.appendChild(script);
                }

            });

            window.initMap = function() {

                var position = {lat: 33.13482535196783, lng: -117.27973421230314},
                    contactsMap = new google.maps.Map(document.getElementById('map'), {
                        center: position,
                        zoom: 19,
                        mapTypeId: google.maps.MapTypeId.HYBRID,
                        scrollwheel: false
                    }),
                    marker = new google.maps.Marker({
                        position: position,
                        map: contactsMap,
                        title: 'We are here!'
                    });

                marker.setMap(contactsMap);

                contactsMap.addListener('click', function() {

                    contactsMap.set('scrollwheel',true);

                });

                // toMarker.addEventListener('click', function() {
                
                //     event.preventDefault();
                
                //     contactsMap.setCenter(position);
                //     contactsMap.setZoom(19);
                //     scrollToEl(map);
                
                // });

            }

        };

    }

    ContactUs.prototype                 = Object.create(FormPage.prototype);
    ContactUs.prototype.constructor     = ContactUs;

    return ContactUs;
});