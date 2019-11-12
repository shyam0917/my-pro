;define(['lib/Page', 'lib/CallGet'], function(Page, CallGet){

    function OurClients() {

        var data = {};

        Page.call(this);

        this.getClassName           = function () {
            return 'OurClients';
        };

        this.defineContent          = function () {

            const that              = this;


            return $.when(that.getMui(), that.getClients()).then(function(){

                that.setContentData(data)

            });
        };

        this.getMui                 = function() {

            return this.remoteCall(new CallGet('mui/0' + this.getPortalName() + '/0' + this.getLanguage() + '/',
                {
                    // all strings
                    'code': 'all',
                    // format to nested arrays
                    'nested': true,
                    // group name
                    'groups': 'Pages-OurClients',
                    '_': this.config.LocalStorageStamp
                }, function (res) {

                    if(typeof res.response !== 'undefined' && typeof res.response['OurClients'] !== 'undefined') {



                        return $.extend(data, res.response['OurClients']);

                    }
                }
            ).asCached().asLocalCached());
        };

        this.getClients         = function() {

            var component       = new ClientsList(this);

            return component.get();
        };

        function ClientsList(page) {

            var clients                    = {},
                deferreds               = [];

            this.get                = function() {

                var deferred        =   new $.Deferred();

                $.when(
                    this.defineData()
                ).then(
                    function(){

                        $.when.apply(null, deferreds).then(function(){

                            deferred.resolve(clients)

                        });


                    }

                );

                return deferred.done(function(res){

                    return $.extend(data, res);

                })
            };

            this.defineData         = function() {

                var that = this;

                return $.get(page.config.pathTemplate + '/json/clients--v'+page.config.LocalStorageStamp+'.json',
                    function (res) {

                        return that.buildData(res);

                    });

            };

            this.buildData              = function (list) {

                var maxHeight = 50,
                    maxWidth  = 140;

                clients  = {'clients': []};

                $.each( list, function(index, client){

                    client.logo = page.config.pathTemplate + '/images/clients/logos/' + client.name + '-' + page.getLanguage() + '--v' + page.config.LocalStorageStamp + '.png';
                    client.name = client.company[page.getLanguage()];

                    deferreds.push(function(){

                        // var defClient = $.Deferred();
                        // var img = new Image();
                        // img.onload = function() {
                        //
                        //     var oldHeight = img.height,
                        //         oldWidth = img.width,
                        //         ratio = maxHeight/oldHeight;
                        //
                        //     if (oldWidth*ratio > maxWidth) {
                        //         ratio = maxWidth/oldWidth;
                        //     }
                        //
                        //     client.width = oldWidth * ratio;
                        //     client.height = oldHeight * ratio;
                        //
                        //     clients.clients.push(client);
                        //
                        //     defClient.resolve();
                        // };
                        // img.src = client.logo;
                        // return defClient.promise();
                        clients.clients.push(client);
                        return client;

                    }())

                });

            };

        }
    }

    OurClients.prototype               = Object.create(Page.prototype);
    OurClients.prototype.constructor   = OurClients;

    return OurClients;
});
