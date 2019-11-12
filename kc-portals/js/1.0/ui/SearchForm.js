;define(['jquery', 'lib/CallGet'], function ($, CallGet) {

    function SearchForm(page, node) {

        const that = this;

        var formSelector     = '[data-id=search-form]',
            form             = $(node).parent(formSelector),
            input            = form.find('[data-id=search-input]'),
            searchBtn        = form.find('[data-id=search-find]'),
            closeBtn         = form.find('[data-id=search-close]'),
            openBtn         =  $('[data-id=search-open]');

        this.show                   = function () {

            var menuWidth = $('#usermenu').outerWidth();
            form.addClass('active');

            if (form.data('size') != 'fixed') {

                input
                    .css({
                        width: menuWidth - searchBtn.outerWidth() - closeBtn.outerWidth()
                    });

            } else {
                openBtn.hide();
            }

            input.focus();
            that.setHandlers();

        };

        this.search                 = function (e) {

            e.preventDefault();
            if (!input.val().length) return;

            page.redirect('search/' +  input.val().replace(/\s/g, '%20'));
            input.blur();
            that.close();

        };

        this.close                  = function() {

            form.removeClass('active');

            input.val('').width(0);
            openBtn.show();

            $(document).unbind('click', this.documentClick);

            closeBtn.unbind();
            searchBtn.unbind();
            input.unbind();

        };

        this.documentClick          = function (e) {


            if (!e.target.closest(formSelector) && !e.target.closest('#' + $(node).data('id')) ) {

                that.close(e);

            }

        };

        this.setHandlers            = function () {

            $(document).on('click', this.documentClick);

            closeBtn.on('click', (e) => {

                e.preventDefault();
                this.close()

            });

            searchBtn.on('click', this.search);

            input.on('keydown', (event) => {

                if (event.keyCode === 13) {
                    this.search(event);
                }
            });

        };


    }

    return SearchForm;

});
