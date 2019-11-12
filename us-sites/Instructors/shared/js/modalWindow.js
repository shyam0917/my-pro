function ModalWindow(options) {

    var defaults                = {
        top:                    100,
        overlay:                0.5,
        closeButton:            null,
        // no closed
        isBlocking:             false,
        isConfirming:           false,
        // Closed by Enter or Esc
        isAlert:                false,
        // handlers
        onBeforeOpen:           function(){},
        onOpen:                 function(){},
        onBeforeClose:          function(){},
        onClose:                function(){}
    };

    var body                    = $('body');
    const header                = $('#header');

    let headerCss;

    var overlay;
    var modalContainer;
    var modalID                 = null;
    var initialScrollTop        = 0;
    var modalNode               = null;

    var modalHeight             = 0;
    var modalWidth              = 0;
    var top                     = 0;
    var marginTop               = 0;
    var marginBottom            = 0;

    /**
     * Shift to Y axis
     * {int}
     */
    var shiftY                  = 0;

    /**
     * Available margin to vertical scrolling
     * {int}
     */
    var MODAL_MARGIN            = 20;

    var self                    = this;
    var onResizeHandler         = function (event) {
        return self.onResize(event);
    };
    var onKeyUpHandler          = function (event) {
        return self.onKeyUp(event);
    };

    this.init                   = function () {

        modalContainer          = body.find('#mContainer');

        if(modalContainer.length > 0) {

            overlay             = body.find('#leanOverlay');

            return;
        }

        body.append($('<div id="leanOverlay"></div>'));
        body.append($('<div id="mContainer"></div>'));

        overlay                 = $('#leanOverlay');
        modalContainer          = $('#mContainer');
    };

    this.init();

    options                     =  $.extend(defaults, options);

    if(typeof options['modalID'] !== 'undefined') {
        modalID                 = options['modalID'];
    }

    /**
     *
     * @param handler
     * @return {ModalWindow}
     */
    this.bindOnClose            = function (handler) {

        options.onClose         = handler;

        return this;
    };

    this.getModalNode           = function(){
        return modalNode;
    };

    /**
     *
     * @return {Promise}
     */
    this.show                   = function () {

        $(window).on('mousewheel', function (event) {
            self.calcShift(event.deltaFactor * event.deltaY);
            self.reposition();
        });

        initialScrollTop        = 0;
        modalHeight             = 0;
        modalWidth              = 0;
        top                     = 0;
        marginTop               = 0;
        marginBottom            = 0;
        shiftY                  = 0;

        const self              = this;
        var promise             = $.Deferred();

        modalContainer.click(function(event) {

            if(modalContainer.attr( 'id' ) === $(event.target).attr('id')
            && options.isBlocking !== true) {
                self.close();
            }
        });


        headerCss                 = header.attr('style');

        if(typeof headerCss === 'undefined') {
            headerCss             = '';
        }

        if(typeof options.onBeforeOpen == 'function') {
            options.onBeforeOpen(this);
        }

        modalNode               = ( modalID != '#loginPopUp' && modalID != '#requestAppModal'  && modalID != '#previewModal' && modalID != '#confirmWindow' && modalID != '#abuseModal' ) ? $(modalID).clone() : $(modalID);
        modalNode.addClass('cloned');
        if( modalID.lastIndexOf('.cloned') == -1 ){

            modalID += ".cloned";
        }

        if(modalNode.length == 0) {

            promise.resolve();

            console.error('ModalWindow: Selector modalID: ' + modalID + ' is not found in the DOM');

            return promise;
        }

        initialScrollTop        = $(document).scrollTop();

        if( modalContainer.children( modalID ).length > 0 && ( modalID == '#CareersModal' || modalID == '#videoWindow' ) ) {
            modalContainer.children( modalID ).remove();
        }
        modalNode.attr( 'data-shown', 'true' );
        modalContainer.append( modalNode );

        // modalContainer.find( modalID ).prop( 'data-shown', 'true' );
        modalContainer.find( modalID ).find( 'input' ).prop('disabled', '');

        if(options.closeButton !== null) {

            $(modalID + ' ' + options.closeButton).click(function() {
                self.close();
            });
        }

        var widthBefore         = body.width();

        body.height($(window).height()).css({
            'overflow': 'hidden',
            'position': 'relative'
        }).scrollTop(initialScrollTop);

        var widthAfter          = body.width();
        var scrollBarWidth      = widthAfter - widthBefore;

        body.css({'margin-right': scrollBarWidth + 'px'});
        header.css({'padding-right': scrollBarWidth + 'px'})

        modalContainer.css({
            'display' :         'block',
            'height':           $(window).height(),
            'left':             0,
            'width':            '100%',
            'position':         'fixed',
            'overflow':         'auto',
            'top':              0,
            'bottom':           0,
            'z-index':          350
        });

        modalHeight             = modalNode.outerHeight();
        modalWidth              = modalNode.outerWidth();

        overlay.css({
            'display': 'block',
            'opacity': 0
        });

        overlay.fadeTo(200, options.overlay);

        if ($(window).height() >= modalHeight + 16) {
            top                 = '50%';
            marginTop           = -(modalHeight / 2) + 'px';
            if( modalNode.hasClass( 'no-translate-y' ) ) {
                modalNode.removeClass('no-translate-y');
            }
        } else {
            top                 = 0;
            marginTop           = '20px';
            marginBottom        = '20px';
            if( modalNode.hasClass( 'preview--course' ) ) {
                modalNode.addClass('no-translate-y');
            }
        }

        modalNode.css({
            "display"       : "block",
            "position"      : "absolute",
            "opacity"       : 0,
            "z-index"       : "auto",
            "left"          : 50 + "%",
            "margin-left"   : -(modalWidth / 2) + "px",
            "top"           : top,
            "margin-top"    : marginTop,
            'margin-bottom' : marginBottom
        });
        // fix
        // var real_doc_width = $(window).width();
        // if (modalWidth == 0 || modalWidth == 'null') {
        //     if (real_doc_width >= 770) {
        //         modalWidth = '575';
        //         modal.css({
        //             "margin-left": -(modalWidth / 2) + "px"
        //         });
        //     } else if (real_doc_width < 770) {
        //         modalWidth = widthAfter - 20;
        //         modal.css({
        //             "margin-left": "-5px",
        //             "width": '90%',
        //             "left": '5%',
        //             "top": '40%'
        //         });
        //     }
        // }

        $(window).bind('orientationchange resize', onResizeHandler);
        $(document).bind('keyup', onKeyUpHandler);

        modalNode.fadeTo(200, 1, function () {
            if(typeof options.onOpen == 'function') {
                options.onOpen(this);
            }

            promise.resolve(self);
        });

        return promise;
    };
    this.onRepositionModal      = function ( modal ) {

        initialScrollTop        = 0;
        modalHeight             = 0;
        modalWidth              = 0;
        top                     = 0;
        marginTop               = 0;
        marginBottom            = 0;
        shiftY                  = 0;

        modalHeight             = modal.outerHeight();
        modalWidth              = modal.outerWidth();

        if ($(window).height() >= modalHeight + 16) {
            top                 = '50%';
            marginTop           = -(modalHeight / 2) + 'px';
            if( modal.hasClass( 'no-translate-y' ) ) {
                modal.removeClass('no-translate-y');
            }
        } else {
            top                 = 0;
            marginTop           = '20px';
            marginBottom        = '20px';
            if( modal.hasClass( 'preview--course' ) ) {
                modal.addClass('no-translate-y');
            }
        }

        modal.css({
            "display"       : "block",
            "position"      : "absolute",
            "z-index"       : "auto",
            "left"          : 50 + "%",
            "margin-left"   : -(modalWidth / 2) + "px",
            "top"           : top,
            "margin-top"    : marginTop,
            'margin-bottom' : marginBottom
        });

    };

    this.onResize               = function () {

        var newWidth            = parseInt($(window).width());
        var newHeight           = parseInt($(window).height()) - 16 - 44 - 16;

        var modal               = $(modalID);

        modalHeight             = modal.outerHeight();
        modalWidth              = modal.outerWidth();

        if ($(window).height() >= modalHeight + 16) {
            top                 = '50%';
            marginTop           = '15px';//-(modalHeight / 2) + 'px';
            if( modal.hasClass('preview--course') && modal.hasClass('no-translate-y') ) {
                modal.removeClass('no-translate-y');
            }
        } else {
            top                 = '0%';
            marginTop           = '20px';
            marginBottom        = '20px';
            if( modal.hasClass('preview--course') && !modal.hasClass('no-translate-y') ) {
                modal.addClass('no-translate-y');
            }
        }

        if (modalContainer.height() != 0) {
            modalContainer.css({
                'height':       $(window).height(),
                'left':         0,
                'width':        '100%'
            });
        }

        modal.css({
            "top":              top,
            "margin-left":      -(modalWidth / 2) + "px",
            "margin-top":       marginTop,
            'margin-bottom':    marginBottom,
            'left':             '50%'
        });
    };

    this.onKeyUp             = function (event) {

        if((event.which === 13 && options.isAlert === true)
        || (event.which === 27 && options.isBlocking !== true)) {

            event.preventDefault();
            this.close();
            return true;
        }

        return false;
    };

    this.close                  = function() {

        // unbind
        $(window).unbind('orientationchange resize', onResizeHandler);
        $(window).off('mousewheel');
        $(document).unbind('keyup', onKeyUpHandler);
        if( modalContainer.children('[data-shown="true"]').length > 1 ) {

            modalContainer.children( modalID ).find( '[rel^="text"]' ).empty();
            modalContainer.children().find('input').prop( 'disabled', '' );
            modalContainer.children( modalID ).find( '[rel*=""]' ).unbind('click');
            modalContainer.children( modalID ).css ( 'display', 'none' );
            modalContainer.children( modalID ).attr( 'data-shown' , 'false' );


            return false;
        }
        modalContainer.children( modalID ).attr( 'data-shown' , 'false' );
        modalContainer.unbind('click');

        if(options.closeButton !== null) {
            $( modalID + ' ' + options.closeButton ).unbind('click');
        }

        if(typeof options.onBeforeClose == 'function') {
            options.onBeforeClose(this);
        }

        overlay.fadeOut(200);

        modalContainer.css({ 'display' : 'none' });
        $(modalID).css({ 'display' : 'none' });

        if( modalID != '#confirmWindow.cloned' && modalID != '#abuseModal.cloned'  ) {
            $(modalID).remove();
        }

        header.attr('style', headerCss);
        body.attr('style', '');

        if(typeof options.onClose == 'function') {
            options.onClose(this);
        }
    };

    /**
     *
     * @param   {HtmlElement|string}    node
     * @param   {string=}               id
     *
     * @return  {ModalWindow}
     */
    this.bind                   = function (node, id) {

        if(typeof node === 'string') {
            node                = $(node)[0];
        }

        if(typeof id === 'undefined') {
            id             = $(node).attr('href');

            if(typeof id === 'undefined') {
                id         = $(node).attr('data-modal-id');
            }
        }

        if(typeof id === 'undefined') {
            return this;
        }

        modalID                 = id;
        const self              = this;

        $(node).bind('click', function (event) {

            event.preventDefault();

            self.show();
        });

        return this;
    };

    this.reposition             = function () {

        var $modal              = this.defineModalContent();

        if(!$modal.hasClass('content_courses')) {
            $modal.css({
                //'marginLeft':       $modal.width() / -2,
                'marginTop':        shiftY
            }).css({
                //'left': '50%',
                //'top': '50%'
            });
        }
        return this;
    };

    this.calcShift                  = function (offsetY) {

        var modelH                  = this.defineModalContent().outerHeight() + MODAL_MARGIN;
        var windowH                 = $(window).height();
        var scrollRange             = (modelH - windowH);

        if(scrollRange <= 0) {
            shiftY                  = 0;
            return;
        }

        shiftY                      += offsetY;

        if(shiftY < -scrollRange) {
            shiftY                  = -scrollRange;
        }

        if(shiftY > MODAL_MARGIN) {
            shiftY                  = MODAL_MARGIN;
        }

    };

    this.defineModalContent         = function () {
        return   $(modalID).find('.content');
    };
}
