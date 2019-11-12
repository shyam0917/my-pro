
;define(['config!','jquery', 'lib/Page', 'lib/CallPost', 'lib/CallGet', 'lib/CallPostFile', 'lib/DateHelper'],function(config, $, Page, CallPost, CallGet, CallPostFile, DateHelper){

    function Messenger() {

        Page.call(this);

        const that                          = this;

        var promiseCheckMessages            = $.Deferred();

        var activeConvId                    = null;
        var system_conversation             = null;
        var total_messages                  = null;
        var conversation_name               = null;
        var last_message_read_id            = null;
        var last_message_read_date          = null;
        var limit                           = 20;
        var offset                          = 0;
        var lang                            = null;
        var date_handler                    = null;
        var checkActualMessagesIntervalTime = 3;
        var checkConversationsIntervalTime  = 34;

        var conversationsListTemplate;
        var conversationsListId;
        var messagesListTemplate;
        var messagesListId;
        var sendMessageTemplate;
        var sendMessageId;
        var loadMoreMessagesTemplate;
        var loadMoreMessagesId;
        var searchConversationsTemplate;
        var searchConversationsId;

        var messenger_data = {

            'conversations':    {}

        };

        this.getClassName              = function(){
            return 'Messenger';
        };

        this.ctrlconversationsList     = (node) => {

            conversationsListTemplate  = node.html();
            conversationsListId        = node.attr('id');

        };

        this.ctrlmessagesList         = (node) => {

            messagesListTemplate      = node.html();
            messagesListId            = node.attr('id');

        }

        this.ctrlsendMessage          = (node) => {

            sendMessageTemplate         = node.html();
            sendMessageId               = node.attr('id');

        }

        this.ctrlloadMoreMessages     = (node) => {

            loadMoreMessagesTemplate    = node.html();
            loadMoreMessagesId          = node.attr('id');

        }

        this.ctrlsearchConversations  = (node) => {

            searchConversationsTemplate = node.html();
            searchConversationsId       = node.attr('id');

        }

        this.stopMessengerIntervals = function() {

            clearInterval(window.checkActualMessagesInterval);
            clearInterval(window.checkConversationsInterval);

            window.checkActualMessagesInterval = null;
            window.checkConversationsInterval  = null;

        }

        // Define the data at load the page
        this.defineContent = () => {

            var promise         = $.Deferred();

            if(this.user.isAuth() === false) {

                promise.resolve();

                // show login form if user not auth
                this.loadStylesPromise.done(() => {

                    this.showLoginForm({isBlocking:true, redirectHomeOnClose:true});

                });

                return promise;
            }

            var load_messages = true;

            $.when( that.loadConversations(load_messages), that.outMainPromise ).then(function(data) {

                lang                       = that.getLanguage();
                date_handler               = new DateHelper(lang);
                that.whenLoadContainer(data);
                that.changeBookmark(activeConvId);
                that.groupDate();
                that.formatMessageTime();

                var message_box_event = document.querySelector("#message-box");
                var seach_input_event = document.querySelector("#searchConversations");
                var messagesListSelector = $("#messagesList");

                messagesListSelector.on('scroll', function() {
                    that.onMessagesScroll();
                });


                $('#' + messagesListId).ready(function() {

                    that.scrollBottom('#' + messagesListId);

                    message_box_event.addEventListener('keypress', e => {

                        if(event.ctrlKey && e.keyCode == 13)
                            promiseCheckMessages = that.onSendMessage(null, event);
                        });

                    seach_input_event.addEventListener('keypress', e => {

                        if(e.keyCode == 13){
                            that.onSearchConversation(null, event);
                        }
                    });

                });

            });


            promise.resolve();

            return promise;

        };

        this.onSearchConversation = function(node, event) {

            event.preventDefault();

            var conversation_list     = $("#conversationsList a.bookmark");
            var search_text           = $(".seach_conversations").val();
            var found_conversation    = false;
            var found_conevrsation_id = "";

            if(search_text == "" || search_text.length == 0){

                $("#conversationsList a.bookmark").removeClass("hide");
                return false;

            }

            if(conversation_list.length == 0)
                return false;

            $("#conversationsList a.bookmark").addClass("hide");

            $.each(conversation_list, function(index, item) {

                var item_conversation_name = $(item).attr("conversation-name");

                if(item_conversation_name.indexOf(search_text)>-1){

                    if(found_conversation == false){

                        found_conversation = true;
                        found_conevrsation_id = $(item).attr("id");

                    }

                    $(item).removeClass("hide");

                }

            });

            if(found_conevrsation_id != "" && found_conevrsation_id != activeConvId)
                $("#conversationsList a[id='"+found_conevrsation_id+"']").click();

        }

        this.whenLoadContainer = function(data) {

            var title       = data["translations"].messenger;
            var titleConv   = "";
            var no_messages = data["translations"].no_messages;

            var search_input_placeholder = "";
            var send_label = "";
            var type_message_label = "";


            search_input_placeholder = data["translations"].search;
            send_label = data["translations"].send;
            type_message_label = data["translations"].type_message;

            if(data["conversations"].length == 0) {

                titleConv     = data["translations"].empty_conversations;
                // Hide messenger and show mmesage
                that.emptyConversations();
                that.hideMessageBox();

                $("#title-messenger").html(title);
                $("#title-conversations").html(titleConv);
                $("#no-messages").html(no_messages);

                return false;

            }

            $(".messenger-total-messages").html("");

            var conversations = data["conversations"];

            titleConv         = data["translations"].conversations;

            $("#title-conversations").html(titleConv);

            that.updateConversationList(conversations);

            activeConvId           = data["user_params"].conversation_id;
            total_messages         = data["user_params"].total_messages;

            system_conversation    = messenger_data["conversations"][activeConvId].system;
            conversation_name      = messenger_data["conversations"][activeConvId].conversation_name;

            that.setConversationName(conversation_name);

            if( system_conversation )
                that.hideMessageBox();
            else
                that.showMessageBox();

            var last_item = (data["messages"].length)-1;

            last_message_read_date = data["messages"][0].full_date;
            last_message_read_id   = data["messages"][0].id;
            data["messages"]       = data["messages"].reverse();
            data["config"]         = that.config;
            // Render content of conevrsations and messages of last conversation
            that.renderTo(conversationsListTemplate, data, '#' + conversationsListId);
            that.renderPrependTo(messagesListTemplate, data, '#' + messagesListId);
            that.assignPageHandlers('#' + searchConversationsId, that, true);
            that.assignPageHandlers('#' + conversationsListId, that, true);
            that.assignPageHandlers('#' + sendMessageId, that, true);
            //that.assignPageHandlers('#' + loadMoreMessagesId, that, true);
            promiseCheckMessages.resolve();

            window.checkConversationMessages = that.checkActualMessagesInterval();
            window.checkConversations        = that.checkConversationsInterval();
            that.checkActualMessages();

            $("#title-messenger").html(title);
            $("#title-conversations").html(titleConv);

            if((limit + offset) >= total_messages)
                $(".load-more-messages").addClass("hide");

            $("#seach_conversations").attr("placeholder",search_input_placeholder);
            $("#message-box").attr("placeholder",type_message_label);
            $("#btn-send").text(send_label);

        }

        this.onLoadMoreMessages   = function() {

            if((limit + offset) >= total_messages){
                $(".load-more-messages").addClass("hide");
                return false;
            }

            offset += limit;

            $.when( that.loadMessages(activeConvId) ).then(function(data) {

                if(typeof data === 'undefined' || data == null){
                    // Hide messenger and show mmesage
                    return false;
                }

                total_messages      = data["total_messages"];
                system_conversation = messenger_data["conversations"][activeConvId].system;
                conversation_name   = messenger_data["conversations"][activeConvId].conversation_name;

                that.setConversationName(conversation_name);

                if( system_conversation )
                    that.hideMessageBox();
                else
                    that.showMessageBox();

                if(data["messages"].length == 0)
                    return false;

                var last_item    = (data["messages"].length)-1;
                data["messages"] = data["messages"].reverse();
                data["config"]   = that.config;

                if(last_message_read_id != data["messages"][last_item].id){

                    // Render content ofthe messages for the selected conversation
                    that.renderPrependTo(messagesListTemplate, data, '#' + messagesListId);
                    //that.assignPageHandlers('#' + loadMoreMessagesId, that, true);
                    that.groupDate();
                    that.formatMessageTime();

                }

            });

        }

        this.onChangeConversation = function(node, event) {

            event.preventDefault();

            var id = $(node).attr('id');
            offset = 0;

            if(id == activeConvId)
                return false;

            var conversation_list = $("#conversationsList");
            $(node).remove();

            conversation_list.prepend(node);

            that.assignPageHandlers('#' + conversationsListId, that, true);
            that.changeBookmark(id);
            $("#messagesList").html('...');
            $(".msg-conversation-title").html('...');
            $.when( that.loadMessages(id) ).then(function(data) {

                if(typeof data === 'undefined' || data == null || data.length == 0){
                    // Hide messenger and show mmesage
                    return false;
                }

                activeConvId = id;

                messenger_data["conversations"][activeConvId].last_message_read      = data["messages"][0].id;
                messenger_data["conversations"][activeConvId].last_message_read_date = data["messages"][0].full_date;

                total_messages         = data["total_messages"];
                system_conversation    = messenger_data["conversations"][activeConvId].system;
                conversation_name      = messenger_data["conversations"][activeConvId].conversation_name;
                last_message_read_id   = messenger_data["conversations"][activeConvId].last_message_read;
                last_message_read_date = messenger_data["conversations"][activeConvId].last_message_read_date;

                that.setConversationName(conversation_name);

                if( system_conversation )
                    that.hideMessageBox();
                else
                    that.showMessageBox();

                that.cleanContainer(messagesListId);

                var last_item          = (data["messages"].length)-1;

                data["total_messages"] = data["total_messages"];
                data["messages"]       = data["messages"].reverse();
                data["config"]         = that.config;
                // Render content ofthe messages for the selected conversation
                that.renderPrependTo(messagesListTemplate, data, '#' + messagesListId);
                // set the scroll in bottom in the container messages
                //that.assignPageHandlers('#' + loadMoreMessagesId, that, true);
                that.scrollBottom('#' + messagesListId);
                that.groupDate();
                that.formatMessageTime();

                if((limit + offset) < total_messages)
                    $(".load-more-messages").removeClass("hide");
                else
                    $(".load-more-messages").addClass("hide");

            });

        };

        this.onSendMessage = function(node, event) {

            event.preventDefault();

            var promise = $.Deferred();
            var text    = $("#message-box").val();

            if( text == '' || text.length == 0 )
                return false;
            else
                $("#message-box").val('');

            var scroll_in_x = 0;

            promise = $.when( that.sendMessage(text) ).then(( data ) => {

                if(data){

                    var last_item  = (data["messages"].length)-1;
                    data["config"] = that.config;

                    data["messages"]       = data["messages"].reverse();
                    last_message_read_id   = data["messages"][last_item];
                    last_message_read_date = data["messages"][last_item].full_date;

                    that.renderAppendTo(messagesListTemplate, data, '#' + messagesListId);
                    that.scrollBottom('#' + messagesListId);
                    that.groupDate();
                    that.formatMessageTime();

                }

            });

            return promise;

        }

        this.checkActualMessagesInterval = function() {

            window.checkActualMessagesInterval = setInterval(function() {

                if(promiseCheckMessages.state() !== "pending"){

                    promiseCheckMessages = that.checkActualMessages();

                }

            }, 1000 * checkActualMessagesIntervalTime);

        }

        this.checkConversationsInterval = function(){

            window.checkConversationsInterval = setInterval(function(){

                if(promiseCheckMessages.state() !== "pending"){
                    that.checkConversations();
                }

            }, 1000 * checkConversationsIntervalTime);

        }

        this.renderPrependTo = function(template, data, target) {

            var node = $($.parseHTML('<div>' + template + '</div>'));
            this.outPrependTo(this.templater.render(node.html(), data), target);

        };

        this.outPrependTo = function(html, target, handler) {

            if(typeof(target) === 'undefined'){
                target              = this.getContentSelector();
            }
            else if(typeof(target) === 'string'){
                target              = $(target);
            }

            target.prepend(html);

            if(typeof handler === 'function'){
                handler();
            }
        };

        this.renderAppendTo = function(template, data, target) {

            var node = $($.parseHTML('<div>' + template + '</div>'));
            this.outAppendTo(this.templater.render(node.html(), data), target);

        };

        this.outAppendTo = function(html, target, handler) {

            if(typeof(target) === 'undefined'){
                target              = this.getContentSelector();
            } else if(typeof(target) === 'string') {
                target              = $(target);
            }

            target.append(html);

            if(typeof handler === 'function'){
                handler();
            }

        };

        this.scrollBottom = function(target) {
            if(typeof $(target)[0] == 'undefined' || typeof $(target)[0].scrollHeight === 'undefined'){

                that.loadConversations(true);

            }else{

                var scroll_in_x = $(target)[0].scrollHeight;
                $(target).animate( {scrollTop:scroll_in_x} );

            }

        }

        this.setConversationName = function(conversation_name) {

            $(".msg-conversation-title").text(conversation_name);

        }

        this.changeBookmark = function(id) {

            $(".bookmark").removeClass("active");
            $("#"+id).addClass("active");
            $("#"+id+" span.message").remove();
            $("#message-box").val('');

        }


        this.cleanContainer = function(target) {

            $("#"+target).html("");

        }

        this.emptyConversations = function() {

            $(".empty-conversations").removeClass("hide");

        }

        this.hideMessageBox = function() {

            $("#sendMessage").addClass("hide");

        }

        this.showMessageBox = function() {

            $("#sendMessage").removeClass("hide");

        }

        this.formatMessageTime = function() {

            var format_time = $(".hour[format-time]");

            $.each(format_time, function(index, item){

                var mytime = $(item).attr("format-time");
                $(item).text(date_handler.toLocalDate(mytime,"time"));

            });

        }

        this.groupDate = function() {

            var groupDates = $(".date[group-date]");
            var setDate    = "";

            $.each(groupDates, function(index, item) {

                var actualDate = date_handler.toLocalDate($(item).attr("group-date"), "prettydate");
                if(actualDate != setDate) {
                    setDate = actualDate;

                    $(item).text(actualDate);

                }

            });

        }

        // Resource cal
        this.loadConversations = function(load_messages) {

            var promise      = $.Deferred();
            var get_messages = "";

            if(load_messages)
                get_messages = ",load_messages,get_translations";
            if(offset == 0)
                get_messages+=",update_last_message_read";

            const type    = "student";

            this.user.detectUser();

            var sessionId = that.user.getSessionId();
            if(!sessionId) {
                this.showLoginForm({isBlocking:true, redirectHomeOnClose:true});
                return promise;
            }

            var url       = 'messenger/conversations';

            var params = {

                _method        : 'GET',
                valid_token    : sessionId,
                token          : sessionId,
                limit          : limit,
                offset         : offset,
                messages_order : "DESC",
                lang           : that.getLanguage(),
                _extend        : "total_messages"+get_messages,
                messenger_type : type

            };

            this.remoteCall(new CallGet(url, params).defineErrorHandler(function (query, status) {
                    if(status > 400 && status != 404 && status < 500){
                        that.user.logout();
                        that.showLoginForm({isBlocking:true, redirectHomeOnClose:true});
                    }

            })).then(function(res) {

                promise.resolve(res.response);

            }).fail(function(data) {

                that.stopMessengerIntervals();

                if(data.status == 401 || data.status == 498)
                    that.showLoginForm();

            });

            return promise;
        }

        this.loadMessages    = function( conversation_id ) {

            var promise = $.Deferred();

            var sessionId = that.user.getSessionId();
            var apiUserId = that.user.getApiUserId();
            if(!sessionId) {
                this.showLoginForm({isBlocking:true, redirectHomeOnClose:true});
                return promise;
            }

            var url     = 'messenger/conversations/0'+conversation_id+'/messages';
            var extend  = "";

            if(offset == 0)
                extend = "update_last_message_read,total_messages";
            else
                extend = "total_messages";

            var params = {

                _method                  : 'GET',
                valid_token              : sessionId,
                token                    : sessionId,
                _extend                  : extend,
                limit                    : limit,
                offset                   : offset,
                messages_order           : "DESC",
                lang                     : that.getLanguage()

            };

            this.remoteCall(new CallGet(url, params).defineErrorHandler(function (query, status) {
                    if(status > 400 && status != 404 && status < 500){
                        that.user.logout();
                        that.showLoginForm({isBlocking:true, redirectHomeOnClose:true});
                    }

                })).then(function(res){
                promise.resolve(res.response);

            }).fail(function(data) {

                that.stopMessengerIntervals();

                if(data.status == 401 || data.status == 498)
                    that.showLoginForm();

            });

            return promise;

        };

        this.checkActualMessages = function() {

            var promise          = $.Deferred();

            var sessionId        = that.user.getSessionId();
            var apiUserId        = that.user.getApiUserId();
            var extend_string    = "";

            if(!sessionId) {
                this.showLoginForm({isBlocking:true, redirectHomeOnClose:true});
                return promise;
            }

            //last_message_read_date = messenger_data["conversations"][activeConvId].last_message_read_date;
            //last_message_read_id   = messenger_data["conversations"][activeConvId].last_message_read;

            if( last_message_read_date != '' )
                extend_string = "check_for_new_messages";

            var url     = 'messenger/conversations/0'+activeConvId+'/messages';

            var params = {

                _method                  : 'GET',
                valid_token              : sessionId,
                token                    : sessionId,
                _extend                  : extend_string,
                last_message_read_date   : last_message_read_date,
                messages_order           : "DESC",
                lang                     : that.getLanguage()

            };

            promise = this.remoteCall(new CallGet(url, params).defineErrorHandler(function (query, status) {
                    if(status > 400 && status != 404 && status < 500){
                        that.user.logout();
                        that.showLoginForm({isBlocking:true, redirectHomeOnClose:true});
                    }

                })).then(function(res) {
                var data_messages = res.response;
                var length        = data_messages["messages"].length -1;
                var nextCallTimeout = checkActualMessagesIntervalTime;

                if(data_messages["messages"].length > 0){

                    data_messages["messages"] = data_messages["messages"].reverse();

                    if( last_message_read_id != data_messages["messages"][length].id ) {

                        //for(var i=0; i<data_messages["messages"].length; i++)
                        last_message_read_date = data_messages["messages"][length].full_date;
                        last_message_read_id   = data_messages["messages"][length].id;

                        data_messages["config"] = that.config;

                        messenger_data["conversations"][activeConvId].last_message_read = data_messages["messages"][length].id;
                        messenger_data["conversations"][activeConvId].id                = data_messages["messages"][length].id;


                        that.renderAppendTo(messagesListTemplate, data_messages, '#' + messagesListId);
                        that.scrollBottom('#' + messagesListId);
                        that.groupDate();
                        that.formatMessageTime();

                    }
                }else{
                    nextCallTimeout = checkActualMessagesIntervalTime * 2;
                }

                if(window.checkConversationMessages)
                    window.checkActualMessagesTimeoutID = setTimeout(function(){
                        that.checkActualMessages();
                    }, nextCallTimeout * 1000)

            }).fail(function(data) {

                that.stopMessengerIntervals();

                if(data.status == 401 || data.status == 498)
                    that.showLoginForm();

            });

            return promise;

        }

        this.checkConversations = function() {

            var load_messages = true;
            var promise       = $.Deferred();

            $.when( that.loadConversations(false) ).then(function(data) {

                if(data["conversations"].length > Object.keys(messenger_data["conversations"]).length){

                    that.updateConversationList(data["conversations"]);
                    that.renderTo(conversationsListTemplate, data, '#' + conversationsListId);
                    that.assignPageHandlers('#' + conversationsListId, that, true);
                    that.changeBookmark(activeConvId);

                }else{

                    for(var i = 0; i < data["conversations"].length; i++){

                        var conv_id = data["conversations"][i].conversation_id;

                        if(conv_id != activeConvId){

                            var conversation_unread_messages = data["conversations"][i].unread_messages;

                            if(conversation_unread_messages > 0){

                                var name_bookmark = data["conversations"][i].conversation_name;
                                $("a[id='"+conv_id+"']").html(name_bookmark+"<span class='message'>"+conversation_unread_messages+"</span>");

                            }

                        }
                    }

                }

            });

            promise.resolve();

            return promise;

        }

        this.sendMessage = function(text) {

            var promise   = $.Deferred();
            var sessionId = that.user.getSessionId();
            var apiUserId = that.user.getApiUserId();
            var url       = 'messenger/conversations/0'+activeConvId+'';

            if(!sessionId) {
                this.showLoginForm({isBlocking:true, redirectHomeOnClose:true});
                return promise;
            }

            var params = {

                _method         : 'POST',
                valid_token     : sessionId,
                token           : sessionId,
                id_conversation : activeConvId,
                message : text

            }

            this.remoteCall(new CallPost(url, params, (res) => {

                promise.resolve(res.response);

            })).fail(function(data) {

                that.stopMessengerIntervals();

                if(data.status == 401 || data.status == 498)
                    that.showLoginForm();

            });

            return promise;

        }

        this.updateConversationList = function(list) {

            messenger_data["conversations"] = {};

            for(var i = 0; i < list.length; i++){

                var conversation = list[i];
                var id = conversation["conversation_id"];

                messenger_data["conversations"][id] = conversation;

            }

        }

        this.onMessagesScroll = function() {

            var scroll_top = $(".messages-container").scrollTop();

            if(scroll_top == 0){

                $(".fa-plus").click();
                // $(".messages-container").scrollTop(10);
            }

        }
    }

    Messenger.prototype               = Object.create(Page.prototype);
    Messenger.prototype.constructor   = Messenger;

    return Messenger;

});
