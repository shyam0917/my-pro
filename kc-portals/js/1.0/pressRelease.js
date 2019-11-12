;define(['jquery', 'lib/Page', 'owl'], function ($, Page, owl) {

    function PressRelease() {

        let res = {};
        let data = {};
        let id_PressRelease;
        let previewLimit = 3;

        Page.call(this);
        var that = this;
        this.getClassName = function () {
            return 'pressRelease';
        };

        this.defineContent = function () {

            let urlParts        = this.appLocation.urlParts.all;

            if (typeof  urlParts[2] !== 'undefined' && urlParts[2].length > 5) {
                id_PressRelease = urlParts[2];
            }


            $.when (this.outContentPromise, this.loadStylesPromise).done(() => {
                this.setHandlers(id_PressRelease);
                this.renderClientsCarousel();
            });

            return $.when(
                this.getPageMui(),
                this.getClientsData()
            ).done( ( pageMui, clients ) => {

                var mainData = that.getMui();
                var botLinks = { 'botlink': ( mainData != "undefined" && mainData.botlink != "undefined"  ) ? mainData.botlink : false };
                let data = {};
                if (typeof id_PressRelease === 'undefined' || urlParts[2].length < 5) {
                    data = this.handleContentData(pageMui);
                } else if (typeof id_PressRelease !== 'undefined' || urlParts[2].length > 5) {
                    data = this.onShowOnePressRelease(id_PressRelease, pageMui);
                }
                $.extend(data, botLinks, {clients: clients});

                this.setContentData(data);
            });
        };

        this.onShowMorePressRelease = function () {
            $('.press-release__item').removeClass('press-release__item--hidden');
            $('#more-release').addClass('hidden');
            localStorage.setItem('show_release', 'all');
        };

        this.onShowOnePressRelease = function (id_PressRelease, data) {

            let act;

            let ret = $.map(data, function (value, index) {
                return [value]
            });

            for (let i = 0; i < ret.length; i++) {

                if (typeof ret[i] !== 'undefined' && ret[i] != null) {
                    if (ret[i].myurl === id_PressRelease && ret[i].myurl != null) {
                        act = i;
                    }
                    //ret[i].added = this.FormatDate(ret[i].added);
                    ret[i].back_btn = this.generateNewUrl('pressRelease');
                }
            }

            if(typeof act === 'undefined'){
                console.log('redirect404() in pressRelease.onShowOnePressRelease');
                this.redirect404();
            }

            return {'press-release-one': ret[act]};
        };

        this.handleContentData = (data => {

                let ret = $.map(data, function (value, index) {
                    return [value]
                });

                ret = ret.reverse();

                for (let i = 0; i < ret.length; i++) {
                    if (ret[i].myurl) {
                        ret[i].myurl = this.generateNewUrl('pressRelease/' + ret[i].myurl);
                    }

                    if(i < previewLimit){
                        ret[i].is_preview = 1;
                    }
                }

                return {'press-release': ret};
            }
        );

        this.setHandlers = function (id_PressRelease) {

            let show_release = localStorage.getItem('show_release');

            if (typeof id_PressRelease !== 'undefined') {
                $('.js-press-release-all').addClass('hidden');
                $('.press-release-one').removeClass('hidden');
            } else {

                if (show_release === 'all') {
                    $('.press-release__item').removeClass('press-release__item--hidden');
                    $('#more-release').addClass('hidden');
                }

                $('.press-release-one').addClass('hidden');
                $('.js-press-release-all').removeClass('hidden');
            }
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
                dots: false,
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

        let _generateMetaData       = this.generateMetaData;
        this.generateMetaData       = (group, type) => {

            let contentData         = this.getContentData();
            let pressRelease        = contentData['press-release-one'] || {};
            let result              = null;

            switch(group){
                case 'pageTitle':
                    result          = pressRelease.title || '';
                    break;
                case 'pageContent':
                    result          = (pressRelease.meta || {}).description || '';
                    break;
                case 'pageKeywords':
                    result          = (pressRelease.meta || {}).keywords || '';
                    break;
            }

            result =  result || _generateMetaData.call(this, group, type);

            /*
             If you get an array instead of a string,
             then it looks like something went wrong according to the plan,
             so we try to retrieve the element with index 0,
             it is this index that gets the elements that were strings,
             but during the merge of groups it was converted to arrays
             */
            if(isObject(result)){
                result = result[0] || result;
            }

            return result;

        };

        this.onPrevClients = function() {
            $('#clientsCarousel').trigger('prev.owl.carousel');
        };

        this.onNextClients = function() {
            $('#clientsCarousel').trigger('next.owl.carousel');
        };

    }


    PressRelease.prototype = Object.create(Page.prototype);
    PressRelease.prototype.constructor = PressRelease;

    return PressRelease;
});
