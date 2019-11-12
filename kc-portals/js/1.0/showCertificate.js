;define(['jquery', 'lib/Page'], function($, Page){

    function ShowCertificate() {

        Page.call(this);

        this.getClassName           = function () {
            return 'ShowCertificate';
        };

        this.out                    = function () {

            var certificateID       = this.getUrlParameter('certificateID');

            if(certificateID === null) {

                return;
            }

            $.when(this.defineMainData()).then((pageMui) => {

                    this.userCourses.getCertificate(certificateID).then(function (response) {

                        if(typeof response['file'] === 'undefined') {

                            console.error('Certificate is failed (id = ' + certificateID + ')');
                            return;
                        }

                        window.location     = response['file'];
                    });
                });


        };

    }

    ShowCertificate.prototype               = Object.create(Page.prototype);
    ShowCertificate.prototype.constructor   = ShowCertificate;

    return ShowCertificate;
});