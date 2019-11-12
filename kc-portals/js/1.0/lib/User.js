;define(['jquery', 'jquery.cookie', 'lib/CallPost', 'lib/CallPut', 'lib/CallGet', 'md5'], function ($, cookies, CallPost, CallPut, CallGet, md5) {

    var tmpToken        = null;
    /**
     *
     * @param   {ServicesIntegrator} remoteService
     * @param   {{}}                config
     * @constructor
     */
    function User(remoteService, config, portalID, APIUrl) {

        /**
         * Unique key for cookie
         * @type {string}
         */
        const cookieKey             = 'LocalUserData';

        /**
         * @type {RemoteService}
         */
        var service                 = remoteService;

        /**
         * @type {String}
         */
        var userId;
        /**
         * @type {String}
         */
        var sessionId;
        /**
         *
         * @type {boolean}
         */
        var isAuth                  = false;

        // used during autologin only
        var isLicensed;
        /**
         * If show first login form for user
         * @type {boolean}
         */

        let needChangePass          = false;

        var isFirstLogin            = false;
        /**
         * If student is test account
         * @type {boolean}
         */
        var isTest                  = false;
        /**
         *
         * @type {*}
         */
        var intervalID              = null;
        var intervalMessengerID     = null;
        /**
         * @type {String}
         */
        var login;
        /**
         * @type {String}
         */
        var fullName;
        /**
         * @type {String}
         */
        var firstName;
        /**
         * @type {String}
         */
        var lastName;
        /**
         * User email
         * @type {String}
         */
        var email;

        var accountId;

        var isMessage;

        var isNotice;

        var isTna                     = 0;
        var tnaCourses                = 10;
        var isTnaBtn                  = false;

        var isMessenger               = false;

        var onlineCheckInterval       = 60;
        var messengerCheckInterval    = 8;

        var hash;

        var accountAdmin;

        var apiUserId;

        var isCoursesConfirmation;

        //tmp force unset old cookies with different paths
        $.removeCookie(cookieKey, {'path': '/en'});
        $.removeCookie(cookieKey, {'path': '/es'});
        $.removeCookie(cookieKey, {'path': '/ar'});

        if(typeof config['onlineCheckInterval'] !== 'undefined' || config['onlineCheckInterval'] !== 0) {
            onlineCheckInterval     = config['onlineCheckInterval'];
        }

        var uCountry;

        if(typeof APIUrl !== 'undefined' || APIUrl !== 0) {

            var visitorLocalsettings = JSON.parse(localStorage.getItem("visitorLocalsettings"));

            if(deepInObject(visitorLocalsettings, 'ipInfo.country')){
                uCountry = visitorLocalsettings.ipInfo.country;
                localStorage.setItem('UserLocation',uCountry);
            } else {
                $.getJSON(APIUrl + "visitor/localsettings/").done(function(myJson) {
                    try {
                        localStorage.setItem("visitorLocalsettings", JSON.stringify(myJson.response));
                        uCountry = myJson.response.ipInfo.country;
                        localStorage.setItem('UserLocation',uCountry);
                    } catch (e) {
                        // console.log(e);
                    }
                });
            }
        }

        /**
         * Public property license
         * @type {{}}
         */
        this.license                = null;

        /**
         * Init method
         */
         this.init                   = function () {

             const that = this;

             this.detectUser();
             this.clearMessengerIntervals();
             this.setupScheduledTasks();

             this.getProfile().then(function(data){

                if(data && typeof data["student"] !== 'undefined' && typeof data["student"].messenger !== 'undefined')
                    isMessenger = data["student"].messenger;

                localStorage.setItem("Messsenger", isMessenger);

                if(that.isAuth() && localStorage.getItem("Messsenger") == "true" && !window.messageCheckInitiated)
                   {
                    that.messageCheck();
                   }

             });

         };

        /**
         *
         * @return {boolean}
         */
        this.isAuth                 = function () {

            return isAuth;
        };

        // used only during autologin to see if authenticated but license expired
        // true means at least one license for this user is active/not expired
        this.isLicensed             = function() {
            return isLicensed;
        };

        this.needChangePass         = function () {

            return needChangePass;
        };


        /**
         *
         * @return {boolean}
         */
        this.isFirstLogin           = function () {

            return isFirstLogin;
        };

        /**
         *
         * @return {boolean}
         */
        this.isTest                 = function () {

            return isTest;
        };

        this.isMessenger            = function () {

            return isMessenger;

        }

        this.logout                 = function () {

            this.stopScheduledTasks();
            this.removeLocalUserData();
            if( localStorage.getItem( 'ebk-lnd-isSended' ) == "true" ) {
                localStorage.removeItem( 'ebk-lnd-name' );
                localStorage.removeItem( 'ebk-lnd-email' );
                localStorage.removeItem( 'ebk-lnd-isSended' );
            }
            isAuth                  = false;
            sessionId               = null;
            isFirstLogin            = false;
        };

        this.getUserId              = function () {

            return userId;
        };

        this.getSessionId           = function () {

            return sessionId;
        };

        this.getLogin               = function () {

            return login;
        };

        this.getName                = function () {

            return fullName;
        };

        this.getFirstName           = function () {

            return firstName;
        };

        this.getLastName            = function () {

            return lastName;
        };

        this.getEmail               = function () {

            return email;
        };

        this.isTna               = function () {

            return isTna * 1;
        };

        this.setTna             = function (value) {

            isTna = value*1;

        };

        this.isTnaBtn               = function () {

            return isTnaBtn;
        };

        this.isCoursesConfirmation  = function () {

            return isCoursesConfirmation;
        };

        this.tnaCourses             = function () {

            return tnaCourses;
        };

        this.getAccountId           = function () {

            return accountId;
        };

        this.showNotice             = function () {

            return isNotice;
        };

        this.getHash                = function () {

            return hash;
        };

        this.getApiUserId           = function () {

            return apiUserId;
        };

        this.getUserLocation        = function () {

           return uCountry;

        };
        this.getUserAccountAdmin    = function () {

            return accountAdmin;

        };


        /**
         * Returns an promise that returns the data of Student.
         *
         * @return {Promise}
         */
        this.getProfile             = function () {

            let promise             = $.Deferred();

            if(!this.isAuth()) {
                return promise.resolve(null);
            }

            service.query(new CallGet('accounts/0' + this.getAccountId() + '/groups/0/students/' + this.getUserId(), {
                    'token' :  this.getSessionId(),
                    _extend: 'license,simple_stats,avatar,messenger'
                },
                function (response) {

                    promise.resolve(response.response);

                }).defineErrorHandler(function (query, status, errorThrown) {

                promise.resolve(null);

            }));

            return promise;
        };

        /**
         *
         * @param   {String}        userLogin
         * @param   {String}        password
         * @return  {Promise}
         */
        this.auth                   = function (userLogin, password, type, params) {

            isAuth                  = false;

            const self              = this;

            var promise             = $.Deferred();

            var authOptions         = {
                'portal_id':        portalID,
                '_extend':          'user,tna'
            };

            if(typeof appV !== 'undefined' && appV)
                authOptions.appV = appV;


            if (type === 'employee') {

                //from user
                authOptions['employee_id'] = userLogin;
                authOptions['national_id'] = password;

            } else if(password === null && type === 'student'){

                authOptions['usertype']   = 'student';
                authOptions['_extend']   += ",licenses";

                //from user
                authOptions['api_secret'] = userLogin;

            } else if(type === 'library'){

                authOptions['usertype']  = 'student';
                authOptions['authid']    = params.authid;

                //from user
                authOptions['libraryid'] = userLogin;
                authOptions['pin']       = password;

                //authOptions['approved']=1;
                authOptions['apiid']='56ea38f1-b825-4745-a352-db7f730bf1e7';

            } else {

                authOptions['usertype'] = 'student';

                //from user
                authOptions['username'] = userLogin;
                authOptions['password'] = password;
            }

            service.query(new CallPost('auth', authOptions, function (response) {

                if (!response) {

                    promise.reject(self.E_WRONG_USERNAME, self);
                    return;

                }

                if(typeof response.response.redirect != 'undefined' ) {

                    self.redirectToUserPortal(response.response); //redirect uses to their portal
                    promise.reject('Redirect', self);
                    return;
                }

                response            = response['response'];

                isAuth              = true;
                login               = response['login'];
                sessionId           = response['token'];

                self.checkUserIsAccountAdmin(response);

                self.applyUserInfo(response);

                self.saveLocalUserData();

                self.setupScheduledTasks();

                promise.resolve(self);

            }).defineErrorHandler(function (query, status, err, res) {

                promise.reject(status, res);

            }));

            return promise;
        };

        this.recoverPass        = (login) => {

            let prom = $.Deferred();

            service.query(new CallGet('users/password/recovery',
                {
                    login: login,
                    type: 'student'
                }, (res) => {

                    prom.resolve(res.code);


                }).defineErrorHandler((query, status) => {

                    prom.reject(status);


                }));

            return prom;

        };

        this.recoverUserName        = (search) => {

            let prom = $.Deferred();

            service.query(new CallGet('users/username/recovery',
                {
                    search
                }, (res) => {

                    prom.resolve(res.code);


                }).defineErrorHandler((query, status) => {

                    prom.reject(status);


                }));

            return prom;

        };

        this.signUp = (options) => {

            let promise             = $.Deferred();

            service.query(new CallPost('accounts/signups', options, (res) => {

                let response = res['response']['session'];
                let imgUrl = "https://www.shareasale.com/sale.cfm?tracking="+response['accounts']['id']+"&amount=0.00&merchantID=56244&transtype=lead";
                $("<img>").attr("src", imgUrl);

                isAuth = true;
                login               = response['login'];
                sessionId           = response['token'];

                this.applyUserInfo(response);

                this.saveLocalUserData();

                this.setupScheduledTasks();

                promise.resolve(this);

            }).defineErrorHandler((query, status, thrown, message) => {

                promise.reject(message)

            }));

            return promise;

        };

        this.authByHash             = function (apiUserId, hash) {

            isAuth                  = false;

            const self              = this;

            var promise             = $.Deferred();

            var authOptions         = {
                'usertype':         'student',
                'api_user_id':      apiUserId,
                'api_hash':         hash,
                'portal_id':        portalID,
                '_extend':          'user,tna'
            };
            if(typeof appV !== 'undefined' && appV)
                authOptions.appV = appV;

            service.query(new CallPost('auth', authOptions, function (response) {

                response            = response['response'];

                isAuth              = true;
                needChangePass          = response['need_change_password'] || false;
                login               = response['login'];
                sessionId           = response['token'];

                self.applyUserInfo(response);

                self.saveLocalUserData();

                self.setupScheduledTasks();

                promise.resolve(self);

            }).defineErrorHandler(function (query, status, err, res) {

                promise.reject(status, res);

            }));

            return promise;
        };

        this.autoLogin=function(studentId){/*NOTE, md5() must be loaded to use this (maybe should be in autologin.js*/

            var _this=this;
            var prom=$.Deferred();

            var kp = window['kcpack'];
            if(!kp)
                return prom.reject();

            var accountId=kp['accountId'], productGroupId=kp['productGroupId'], isAutoLicense=kp['isAutoLicense'], isAutoRenew=kp['isAutoRenew'];

            //alert("student: " + md5(studentId));
            //return prom.resolve(true)

            console.log('autologin',studentId);
            if (this.isAuth()){ //no need to autologin
                console.log('already logged in with session:', this.getSessionId());
                prom.resolve(true);
                return prom;
            }

            accountId = accountId || '';
            productGroupId = productGroupId || '';

            if(!accountId || !studentId){ //need at least client secret and student id
                console.log('could not uniquely identify account/user');
                prom.reject();
                return prom;
            }

            //generate a uid that will be unique for this user in this company for this product group
            var usec = md5(accountId+md5(studentId+productGroupId)); //done exactly this way to seamlessly transition from old account secrets (prepended to productGroupIds)
            kp['usec'] = usec;

            //return prom.resolve(true)
            this.auth(usec, null, 'student')
            .then(function(){

                //we successfully logged in, but we might have an old expired subscription
                console.log('successfully logged in, checking subscription');

                if(_this.isLicensed()){
                    console.log('subscription ok');
                    prom.resolve(true);
                    return;
                }

                // user ok but license not ok, so request a license, if set to autoRenew
                if(kp['autoRenew'])
                {
                    //they have an expired subscription, and their account can autoRenew, so let's try
                    console.log('attempting to get new license');

                    _this.registerUser({usec: usec, accountId: accountId, renew: true})
                    .done(function(){
                        console.log('got new license, attempting to log in');
                        _this.auth(usec, null, 'student')
                        .done(function(){
                            console.log("logged in with new license");
                            if(_this.isLicensed()){
                                console.log('new license ok');
                                prom.resolve(true);
                            }else{
                                console.log('problem with new license');
                                prom.reject();
                            }
                        })
                        .fail(function(){
                            console.log("unable to log in with new license");
                            prom.reject();
                        });
                    })
                    .fail(function(){
                        console.log('unable to get new license');
                        prom.reject()
                    });
                }else{
                    console.log('Your license has expired and is not configured to renew. Contact your provider for access.');
                    prom.resolve(false);
                }

            })
            .fail(function(status, res){//the login failed, so if it's because the user doesn't exist (101= Bad credetials), we can create a user
                console.log('autologin unable to log in user');
                if(res && res['fail_code'] == 101  && kp['autoLicense']) {
                    console.log("autologin attempting to register new user");
                    _this.registerUser({usec: usec, accountId: accountId})
                    .done(function(){
                        console.log("autologin registered new user, attempting to log in");
                        _this.auth(usec, null, 'student')
                        .done(function(){
                            console.log("autologin completed");
                            if(_this.isLicensed()){
                                console.log('new license ok');
                                prom.resolve(true);
                            }else{
                                console.log('problem with new license');
                                prom.reject();
                            }
                        })
                        .fail(function(){
                            console.log('unable to log in with newly registered user');
                            prom.reject()
                        });
                    })
                    .fail(function(){
                        console.log("autologin was not able to register new user");
                        prom.reject()
                    });
                }else{
                    console.log("autoLicense:", kp['autoLicense']);
                    console.log("unable to complete autologin:",res);
                    prom.reject();
                }
            });

            return prom;
        };

        this.registerUser=function(data){
            //create a new user using external api
            var _this=this;
            var prom=$.Deferred();

            service.query(new CallPost('accounts/'+data.accountId+'/students', data, (r) => {
                var license = (((r||{}).response||{}).student||{}).license;
                if(license){
                    console.log("successfully registered user. confirmation: ", license.id);
                    prom.resolve(license);
                }else{
                    console.log("unexpected response from register user:",r)
                    prom.reject();
                }
            })
            .defineErrorHandler((query, status, errorThrown, res) => {
                console.log("unsuccessful request to register user",res);
                prom.reject()
            }));

            return prom;
        };



        /**
         * Update student profile on server
         *
         * @param   {{}}            newProfile
         * @return  {Promise}
         */
        this.updateProfile          = function (newProfile) {

            if(typeof newProfile !== 'object' || newProfile === null) {

                throw new Error("User Profile is have invalid type");
            }

            if(typeof newProfile['password'] === 'undefined' || newProfile['password'] === null) {

                //throw new Error("User Profile error: password undefined or null");
            }

            // token auto define
            if(typeof newProfile['token'] === 'undefined') {

                newProfile['token'] = typeof tmpToken  != 'undefined' ? tmpToken :  this.getSessionId();
            }

            var promise             = $.Deferred();

            // check password 1 and password 2
            // If password defined
            if(isNotEmpty(newProfile['password']) && (typeof newProfile['password2'] === 'undefined'
            || newProfile['password2'] !== newProfile['password'])) {

                promise.reject(this.E_PASSWORDS_DONT_MATCH);

                return promise;
            }


            service.query(new CallPost('portals/student', newProfile, (response) => {

                //only if the profile update is successful
                if(typeof newProfile.username !== 'undefined') {

                    login = newProfile.username;
                }

                // Reset flag and save to session
                isFirstLogin        = 0;
                this.saveLocalUserData();

                promise.resolve();


                /*
                // update session info with new data
                this.auth(this.getLogin(), newProfile['password'])
                .done(() => {

                    promise.resolve();

                    tmpToken    = null;

                }).fail((res) => {

                    promise.reject(this.E_SERVER, res);
                });
                */

            }).defineErrorHandler((query, status, errorThrown, res) => {

                console.error('Error update profile: ' + status + ', error: ' + errorThrown);

                promise.reject(status, res);
            }));

            return promise;
        };

        this.applyNewUserInfo          = function (userInfo) {

            fullName = userInfo['first_name'] + ' ' + userInfo['last_name'];
            firstName = userInfo['first_name'];
            lastName = userInfo['last_name'];

            this.saveLocalUserData();
        };

        this.applyUserInfo          = function (info) {

            var userInfo            = info['user'];

            fullName                = userInfo['first_name'] + ' ' + userInfo['last_name'];
            firstName               = userInfo['first_name'];
            lastName                = userInfo['last_name'];
            isFirstLogin            = userInfo['first_login'] == 1;

            isTest                  = userInfo['is_test'] == 1;
            userId                  = userInfo['id'];

            isTna                   = (userInfo['isTna']*1) ? 1 : 0;

            isNotice                = userInfo['isNotice'] ? userInfo['isNotice'] : 0;

            accountId               = info['accounts']['id'];

            hash                    = info['hash'] ? info['hash'] : false;

            apiUserId               = info['api_user_id'] ? info['api_user_id'] : false;

            // isCoursesConfirmation
            isCoursesConfirmation   = isNotEmpty(userInfo['isCoursesConfirmation']);
            config['isCoursesConfirmation'] = isCoursesConfirmation;

            if(typeof userInfo['email'] !== 'undefined') {
                email               = userInfo['email'];
            }


            if (info['accounts'] && info['accounts']['tna']) {

                isTnaBtn              = info['accounts']['tna']['tnaGetRecommendation'];
                tnaCourses            = info['accounts']['tna']['limit'];
            }

            needChangePass            = info['need_change_password'] || false;

            if (userInfo['licenses']) { // currently only used during autologin so we don't keep license data
                isLicensed = false;
                for(var i = 0; i < userInfo.licenses.length; i++)
                    if(!userInfo.licenses[i]['is_expired'])
                        isLicensed = true;
            }
            accountAdmin             = info['accountAdmin'] ? info['accountAdmin'] : false;

        };

        this.setupScheduledTasks    = function () {

            const that    = this;
            /**
             * if the user is logged we set the task onlineCheck
             */
            if(this.isAuth() === false || window['isUserTaskSetup'] === true) {

                intervalID    = window['UserTaskIntervalID'];

                return;
            }

            window['isUserTaskSetup'] = true;

            intervalID          = setInterval(function () {

                that.onlineCheck();

            //}, 1000);
            }, 1000 * onlineCheckInterval);

            window['UserTaskIntervalID'] = intervalID;
        };

        this.checkTotalMessagesTask    = function() {

            /**
                * if the user is logged we set the task onlineCheck
            */

            const that = this;

            if(this.isAuth() === false)
                return false;

            this.clearMessengerIntervals();

            window.intervalMessengerID = setInterval(function () {

                that.messageCheck();

            }, 1000 * messengerCheckInterval);


        }

        this.clearMessengerIntervals = function() {

            if(window.intervalMessengerID !== null || typeof window.intervalMessengerID !== 'undefined'){
                clearInterval(window.intervalMessengerID);

                window.intervalMessengerID = null;

            }

            if(window.checkConversationMessages !== null || typeof window.checkConversationMessages !== 'undefined'){

                clearInterval(window.checkConversationMessages);

                window.checkConversationMessages = null;

            }

            if(window.checkConversations !== null || typeof window.checkConversations !== 'undefined'){

                clearInterval(window.checkConversations);

                window.checkConversations = null;

            }

        }

        this.stopScheduledTasks      = function () {

            if(intervalID !== null || typeof intervalID !== 'undefined') {

                clearInterval(intervalID);

                intervalID          = null;
            }

            window['isUserTaskSetup'] = false;
        };

        /**
         * The method attempts to define the current user,
         * if possible, and initializes the object according to the environment
         */
        this.detectUser             = function () {

            var data                = this.getLocalUserData();
            if(data === null) {
                isAuth              = false;
                return;
            }

            isAuth                  = true;
            userId                  = data.userId;
            sessionId               = data.sessionId;
            login                   = data.login;
            fullName                = data.name;
            firstName               = data.firstName;
            lastName                = data.lastName;
            isFirstLogin            = data.isFirstLogin;
            isTna                   = data.isTna*1;
            isTnaBtn                = data.isTnaBtn;
            tnaCourses              = data.tnaCourses;
            accountId               = data.accountId;
            isNotice                = data.isNotice;
            needChangePass          = data.needChangePass;
            hash                    = data.hash;
            apiUserId               = data.apiUserId;
            accountAdmin            = data.accountAdmin;
            isCoursesConfirmation   = isNotEmpty(data['isCoursesConfirmation']);
            config['isCoursesConfirmation'] = isCoursesConfirmation;

            if(typeof data['email'] !== 'undefined') {
                email               = data['email'];
            }

            if(typeof data['isTest'] !== 'undefined') {
                isTest              = data.isTest;
            }

            // update date expire
            this.saveLocalUserData();
        };

        /**
         * The method returns local data or null if not exists
         *
         * @return {{}|null}
         */
        this.getLocalUserData       = function () {

            $.cookie.json           = true;

            var data                = $.cookie(cookieKey);

            if(typeof data === 'undefined' || typeof data !== 'object') {

                return null;
            }

            var isValid             = true;

            // validate data
            $.each(['userId', 'login', 'sessionId', 'name', 'isFirstLogin'], function (key, value) {

                if(typeof data[value] === 'undefined' || data[value] === null || data[value] === '') {

                    isValid         = false;
                }
            });

            if(isValid) {
                return data;
            }

            this.removeLocalUserData();

            return null;
        };

        this.saveLocalUserData      = function () {

            var data                = {

                'userId':           this.getUserId(),
                'login':            this.getLogin(),
                'sessionId':        this.getSessionId(),
                'name':             this.getName(),
                'firstName':        this.getFirstName(),
                'lastName':         this.getLastName(),
                'isFirstLogin':     this.isFirstLogin(),
                'email':            this.getEmail(),
                'isTest':           this.isTest(),
                'isTna':            this.isTna(),
                'tnaCourses':       this.tnaCourses(),
                'isTnaBtn':         this.isTnaBtn(),
                'accountId':        this.getAccountId(),
                'isNotice':         this.showNotice(),
                'needChangePass':   this.needChangePass(),
                'hash':             this.getHash(),
                'apiUserId':        this.getApiUserId(),
                'userLocation':     this.getUserLocation(),
                'accountAdmin':     this.getUserAccountAdmin(),
                'isCoursesConfirmation': isCoursesConfirmation
            };



            $.cookie.json           = true;

            // calc expires date
            var date                = new Date();
            var minutes             = 30;

            if(typeof config['localExpires'] !== 'undefined') {
                minutes             = config['localExpires'];
            }

            date.setTime(date.getTime() + (minutes * 60 * 1000));

            $.cookie(cookieKey, data, {'expires': date, 'path': '/'});

            if(data.isFirstLogin) {

                tmpToken            = data.sessionId;
            }

        };

        this.removeLocalUserData    = function () {

            $.removeCookie(cookieKey, {'path': '/'});

        };

        this.onlineCheck            = function () {

            const self              = this;

            service.query(new CallPut('auth', {'token': sessionId}, function (response) {
                // nothing to do
            }).defineErrorHandler(function () {

                self.logout();
                location.reload();
            }));

            this.saveLocalUserData();
        };

        this.messageCheck               = function() {
            window.messageCheckInitiated = true;
            var api_user_id             = null;
            const that                  = this;

            if(!localStorage.getItem('Messsenger') || localStorage.getItem('Messsenger') != 'true' || !this.isAuth())
               return false;

            this.detectUser();

            api_user_id = this.getApiUserId();

            var url                       = "messenger/messages/info/";

            var params                    = {
                valid_token    : sessionId,
                token          : sessionId
            };

          service.query(new CallGet(url, params, function (res) {

              var total = res.response;

              that.showUnreadMessagesBulb(total)

               if(total > 0)
                   messengerCheckInterval = 8;
               else
                   messengerCheckInterval = 30;

               window.messageCheckTimeoutID = setTimeout(function(){
                    that.messageCheck();
                }, messengerCheckInterval * 1000)


          }).defineErrorHandler(function (query, status) {
                // if response code more than 400 then user is not authorized anymore so I need to clear local user info and redirect user to home page
                if(status > 400 && status != 404 && status < 500){
                    that.logout();
                }
            }));
        }
        this.showUnreadMessagesBulb    = function (total) {
            const that                  = this;
            // // kind of cheesy solution but what it does is if page is not renderred yet and block ".messenger-total-messages" not there yet try to apply the changes in half a second and keep trying until success.
            if(!$(".messenger-total-messages").length){
                setTimeout(function(){
                    that.showUnreadMessagesBulb(total)
                }, 500)
                return false;
            }
            $(".messenger-total-messages").text(total);

            if( total > 0 )
                  $(".messenger-total-messages").removeClass("hide");
              else
                  $(".messenger-total-messages").addClass("hide");
        }

        this.checkUserIsAccountAdmin    = function (data) {

            if(typeof data['user_type'] != 'undefined' && data['user_type'] == 'accountAdmin') {

                var portalURL           = data.portalURL || '';
                window.location         = portalURL + '/admin/#!login|hash=' + data['hash'] + '&api_user_id=' + data['api_user_id'];
            }
        };

        this.redirectToUserPortal       = function (data) {

            var portalURL           = '//' + this.defineUserPortal(data);

            if( portalURL && data.user_type == 'accountAdmin') {

                 data['portalURL'] = portalURL;

                this.checkUserIsAccountAdmin(data);

            } else if (portalURL  && data.user_type == 'student' ) {

                  window.location         = portalURL + '/#autoLogin/' + data.hash + '/' + data.api_user_id;
            }

        };

        this.defineUserPortal       = function(data){

            if( data.portalDomain ) {
                return data.portalDomain;
            }

            var portalURL           = $(location).attr('hostname');

            var parts               = portalURL.split('.');

            return                  parts.length == 3 ? data.portalCode + '.' + parts[1]+ '.' + parts[2] : portalURL;

        };

        this.getExtendInfo          = function () {

            return  service.query(new CallGet(
                'accounts/'+this.getAccountId()+'/groups/0/students/' + this.getUserId(), {'token' :  this.getSessionId()}))
                .then((res) => {
                    return res.response.student
                });
        };

    }

    User.prototype.AUTH_SUCCESS             = 200;
    User.prototype.ACCOUNT_CHANGE_SUCCESS   = 201;
    /**
     * User not found
     * @type {number}
     */
    User.prototype.E_WRONG_USERNAME         = 401;
    User.prototype.E_PASSWORDS_DONT_MATCH   = 402;
    User.prototype.E_INVALID_EMAIL          = 403;
    User.prototype.E_DUPLICATE_USERNAME     = 409;
    User.prototype.E_NEED_CHANGE_PASSWORD   = 'need_change_password';
    User.prototype.E_REDIRECT_TO_PORTAL     = 'Redirect';


    /**
     * Server error
     * @type {number}
     */
    User.prototype.E_SERVER         = 500;

    return User;
});
