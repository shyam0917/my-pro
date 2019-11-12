;define(['jquery', 'lib/Page', 'lib/CallGet','ui/player', 'videoplayer'],
    function ($, Page, CallGet,  Player, videojs) {

    function HowItWorks() {

        Page.call(this);

        var data                    = {};

        data.content                = {
            en: [
                    {
                        id: 'how-video-en-1',
                        title: 'The training library',
                        img: 'video-how-1.png',
                        video: 'en/1-the-training-library'
                    },
                    {
                        id:'how-video-en-2',
                        title: 'The user experience',
                        img: 'video-how-2.png',
                        video: 'en/2-the-user-experience'
                    },
                    {
                        id:'how-video-en-3',
                        title: 'The training needs analysis',
                        img:'video-how-3.png',
                        video: 'en/3-the-training-needs-analysis'
                    },
                    {
                        id:'how-video-en-4',
                        title: 'The admin tool',
                        img:'video-how-4.png',
                        video:'en/4-the-admin-tool'
                    }
                ],

            es: [
                    {
                        id:'how-video-es-1',
                        title: 'La biblioteca',
                        img:'video-how-1-es.png',
                        video: 'es/1-LaBlibioteca'
                    },
                    {
                        id:'how-video-es-2',
                        title: 'Experiencia de formación',
                        img:'video-how-2-es.png',
                        video: 'es/2-EsperienciaDeFormacion'
                    },
                    {
                        id:'how-video-es-3',
                        title: 'El análisis',
                        img:'video-how-3-es.png',
                        video: 'es/3-ElAnalisis'
                    },
                    {
                        id:'how-video-es-4',
                        title: 'Herramienta de administración',
                        img:'video-how-4-es.png',
                        video:'es/4-HeramientaDeAdministracion'
                    }
            ]
        };

        this.getClassName           = function () {
            return 'howItWorks';
        };


        this.defineContent          = function () {

            return this.getPageMui().done((res) => {

                data.video          = data.content[this.getLanguage()];

                this.setContentData(data)

            });

        };

        
        this.onPlayVideo            = function (node, event) {

            this.showAllPreview();

            var playerId            = 'howvideo';

            $('#' + playerId).remove();


            var fileURL             = 'https://fileshare.knowledgecity.com/opencontent/how_it_works_walkthrough/' +
                                       $(node).attr('data-filename') + '.mp4';

            var nodeID              = $(node).attr('data-id');

            $(node).addClass('hidden');

            const videoJsPlayerhtml =
                '<video crossdomain crossorigin="anonymous" id="'+ playerId +'" class="video-js vjs-default-skin video-static video-permanent-bar" controls preload="auto" width="100%" autoplay="true">' +
                '<source src="' + fileURL +'" type="video/mp4">' +
                '</video>';

            $('#' + nodeID).append(videoJsPlayerhtml);

            var player = videojs(document.getElementById(playerId), {
                autoplay: true,
                controls: true,
                aspectRatio: '16:9',
                playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
            });

            return true;
        };


        this.showAllPreview         = function () {

            $('.embedvideo__player').removeClass('hidden');

        };

}

    HowItWorks.prototype = Object.create(Page.prototype);
    HowItWorks.prototype.constructor = HowItWorks;

    return HowItWorks;

});