;define(['lib/Page', 'lib/CallGet'], function(Page, CallGet){

    function Benefits() {

        Page.call(this);

        this.getClassName           = function () {
            return 'Benefits';
        };

        this.defineContent          = function () {

            return this.getPageMui().done((res) => {

                this.setContentData(this.buildData(res));

            });

        };

        this.buildData          = function(strings) {

            if (!strings.benefitsList) {

                for(var k in strings) {

                    strings[k] = strings[k].replace(/(.*)–(.*)/, "<strong>$1</strong><br><p>$2</p>")

                }

            }

            return strings

        }
    }

    Benefits.prototype               = Object.create(Page.prototype);
    Benefits.prototype.constructor   = Benefits;

    return Benefits;
});