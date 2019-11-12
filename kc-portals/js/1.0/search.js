;define(['jquery', 'lib/Page', 'lib/CallGet'],
    function($, Page, CallGet){

    function Search() {

        var LIMIT = 20;
        var data = {};

        Page.call(this);

        this.getClassName              = function () {
            return 'Search';
        };

        this.defineContent             = function () {

           const that              = this;
            return this.appLocation.cachePromise().then(()=> {
                return $.when(that.getMui(), that.getResults()).then(function () {
                    that.handleContentData(data)
                });
            });
        };

        this.getResults             = function () {


            var query               = decodeURIComponent(this.appLocation.urlParts.all[2]);

            if(!query) {
                return {numFound: 0, data: []};
            }

            var params  = {
                lang:       this.getLanguage(),
                portal:     this.config.portalID,
                type:       'course',
                query:      query ? query.replace(/%20/g, " ") : null,
                rows:       LIMIT,
                start:      this.appLocation.urlParts.all[4] ? LIMIT * (this.appLocation.urlParts.all[4] - 1) : 0
            };

            return this.remoteCall(new CallGet(
                'search',
                params,
                function (res) {
                   return $.extend(data, res.response);

                }));
        };

        this.handleContentData         = function (res, hash) {

            const that              = this;

            var query               = decodeURIComponent(this.appLocation.urlParts.all[2]);

            var content             = {
                courses: $.map(res.data, function(course) {
                        return [{
                            url:            that.generateNewUrl('library/' + course.ceid + '/course/' + that.rewriteTitletoUrl(course.title)),
                            title:          course.title,
                            tagline:        course.tagline,
                            description:    course.description.length > 250 ? course.description.substr(0, 250) + '...' : course.description,
                            img:            that.config.CDNContent + 'previews/' + course.courseID + '/240.jpg',
                            runtime:        that.formatSecondsToHrs(course.time),
                            author:         course.author
                        }];

                }),
                query:      query ? query.replace(/%20/g, " ") : '',
                numFound:   res.numFound ? res.numFound : 0,
                pagination: that.definePagination(res.numFound),
                Search:     res.mui
            };

            that.setContentData(content);
        };

        this.definePagination            = function(results) {

            var parts           = this.appLocation.urlParts.all;
            var totalPages      = Math.ceil(results/LIMIT),
                pages           = [];

            for(var i = 0; i < totalPages; i++) {

                var page        = i > 0  ? '/page/' + (i + 1) : '/';

                pages.push({
                    caption:    i+1,
                    active:     parts[4] == i + 1,
                    url:        this.generateNewUrl('search/' + parts[2] + page)
                });
            }

            if (!parts[4] && pages[0]) pages[0].active = true;

            return pages;
        };

        this.getMui                 = function() {

            return this.remoteCall(new CallGet('mui/0' + this.getPortalName() + '/0' + this.getLanguage() + '/',
                {
                    // all strings
                    'code': 'all',
                    // format to nested arrays
                    'nested': true,
                    // group name
                    'groups': 'Pages-Search',
                    '_': this.config.LocalStorageStamp
                }, function (res) {

                    if(typeof res.response !== 'undefined' && typeof res.response['Search'] !== 'undefined') {

                        return $.extend(data, {mui: res.response['Search']});

                    }
                }
            ).asCached().asLocalCached());
        };

    }

    Search.prototype               = Object.create(Page.prototype);
    Search.prototype.constructor   = Search;

    return Search;
});
