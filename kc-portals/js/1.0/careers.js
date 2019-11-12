;define(['jquery', 'lib/Page', 'lib/CallGet', 'ui/ModalWindow'], function ($, Page, CallGet, ModalWindow) {

    function Careers() {

        const that = this;

        let res = {};
        let page = this;
        let data = {};
        let vacancyId;
        let vlMessages = {};

        Page.call(this);

        this.getClassName = function () {
            return 'Careers';
        };

        this.defineContent = function () {

            let uCountry;

            this.isCountryAllowed().done((isAllowed) => {

                if(!isAllowed){
                    this.redirectHome();
                }

            }).fail(() => {
                this.redirectHome();
            });

            if (typeof this.appLocation.urlParts.all[2] !== 'undefined' && this.appLocation.urlParts.all[2].length > 5) {
                vacancyId = this.appLocation.urlParts.all[2];
            }

            this.outContentPromise.done(() => {
                if(vacancyId){

                    this.scrollTo('#careers-one');

                } else {
                  if( $('#CareersModal').length > 0 ) {
                    $('#CareersModal [rel^=close]').trigger('click');
                  }
                }
            });

            return this.getPageMui().done((mui) => {
                let data = {target_vacancy: null};

                mui.vacancies = this.handleContentData(mui.vacancies);

                if (typeof vacancyId !== 'undefined') {
                    data.target_vacancy = that.ShowOneCareers(vacancyId, mui.vacancies);
                }

                $.extend(data, mui);
                vlMessages = mui.vlMessages;
                this.setContentData(data);
            });
        };

        this.ShowOneCareers = function (id_Careers, vacancies) {

            let targetVacancy;

            for (let i = 0; i < vacancies.length; i++) {

                if (typeof vacancies[i] !== 'undefined' && vacancies[i] != null) {
                    if (vacancies[i].myurl === id_Careers && vacancies[i].myurl != null) {
                        targetVacancy = vacancies[i];
                    }
                }
            }

            targetVacancy.back_btn = this.generateNewUrl('careers');

            return targetVacancy;
        };

        this.handleContentData = (data => {

                let ret = $.map(data, function (value, index) {
                    return [value]
                });

                for (let i = 0; i < ret.length; i++) {
                    ret[i].careersLink = this.generateNewUrl('careers/' + ret[i].myurl);
                }

                return ret
            }
        );

        this.getVlMessages = function () {
            return vlMessages;
        };

        this.onCareersModal = function () {

            var selector = '#CareersModal';
            var $Careers = $(selector);

            var modalWindow = new ModalWindow({
                modalID: selector,
                top: 100,
                overlay: 0.6,
                isBlocking: true
            });

            return modalWindow.show().then(function (resp) {

                var cnt = $('#mContainer #CareersModal');
                cnt.find('[rel^=close]').off('click').on('click', () => {
                    modalWindow.close();
                });

                cnt.find('[rel^=confirm]').off('click').on('click', function () {
                    var vl = that.getVlMessages();
                    var jobemail = cnt.find("#job-email").val();
                    if(cnt.find("#job-name").val().length>3&&cnt.find("#job-phone").val().length>3&&cnt.find("#job-email").val().length>3&&(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(jobemail))&&cnt.find("#job-msg").val().length>3&&cnt.find("#job-file").val().length>3){
                      cnt.find('input, textarea').prop('disabled',true);
                      cnt.find('input, text').prop('disabled',true);
                      cnt.find('input.btn.btn--lg.account_btn').val(vl.wait);
                      var jobpage=cnt.find("#job-page").val();
                      var jobname=cnt.find("#job-name").val();
                      var jobphone=cnt.find("#job-phone").val();
                      var jobmsg=cnt.find("#job-msg").val();
                      var juburl=window.location.href;
                      var formData=new FormData();
                      formData.append(cnt.find('#job-file').attr('name'),cnt.find('#job-file').prop('files')[0]);
                      formData.append('type','portals/www/career');
                      formData.append('content[page]',jobpage+' - '+juburl);
                      formData.append('content[personal_message]','\nFull Name: '+jobname+'\nPhone Number: '+jobphone+'\nEmail: '+jobemail+'\nPersonal message: '+jobmsg+'\n');
                    $.ajax({
                                url: page.config['APIUrl'] + 'message/email',
                                type: 'POST',
                                dataType: 'JSON',
                                data: formData,
                                processData: false,
                                contentType: false,
                                complete: function (d) {
                                    $('.btn-job-resume, #formSubmitResume, .careers-one__header-link--submit').hide();
                                    $("#succesMessage").css('display', 'table');
                                    $('#succesMessage').html('<b>'+vl.success+'</b>');
                                    $('#btnBack').show();
                                    modalWindow.close();
                                    cnt.remove();
                                    // console.log(d);
                                }, error: function (d) {
                                    showMessage(vl.error);
                                    cnt.find('input.btn.btn--lg.account_btn').val(vl.submit);
                                    cnt.find('input, textarea').prop( 'disabled', false );
                                    // console.log(d);
                                }
                            }
                        );
                    } else {
                        showMessage(vl.wrongData);
                    }
                    function showMessage(errorMessage) {
                        cnt.find("#errorMessage").html(errorMessage);
                        cnt.find("#errorMessage").css('display', 'table');
                        cnt.find("#errorMessage").hide();
                        cnt.find("#errorMessage").fadeIn();
                    }
                });
            });
        };

        this.onScrollToVacancy = function (node, event) {

            if(vacancyId){
                this.redirect('careers/');
            }else{
                this.scrollTo('#careers-enum');
            }

        };
    }

    Careers.prototype = Object.create(Page.prototype);
    Careers.prototype.constructor = Careers;

    return Careers;
})
;
