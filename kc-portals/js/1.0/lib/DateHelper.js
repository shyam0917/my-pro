;define(['config!', 'jquery', 'moment'], function (config, $, moment) {

    /**
    * @constructor
    * Antonio Gonzalez Gonzalez
    */

    function DateHelper (lang){
        /* Set the languaje in the library */
        const that     = this;

        var date       = "YYYY-MM-DD, HH:mm:ss";
        var formats    = config.dateFormats;
        var only_date  = false;

        if(!lang || typeof lang == 'undefined')
            moment.locale('en')
        else
            moment.locale(lang);

        /* Format is a optional parammeter */
        this.getDate  = function(format) {

            var invalid_format = that.validateFormat(formats, format);

            if(invalid_format)
                format = formats["date"];
            else
                format = formats[format];

            if(moment().local().isValid())
                return moment().local().format(format);
            else
                console.log("Invalid date: "+date);

        }

        this.getActualDateTime = function(){
            return moment().local().format("Y-M-D H:m:s");
        }

        /* Format is a optional parammeter */
        this.toLocalDate = function (date, format) {

            var invalid_format = that.validateFormat(formats, format);

            if(invalid_format)
                format = formats["date"];
            else
                format = formats[format];

            if(moment(date).local().isValid()){

                if(format != 'HH:mm:ss'){
                    var utc_offset = moment(date).utcOffset(date);
                    return moment(date).utc().format(format);
                }
                else{
                    return moment.parseZone(date).local().format(format);
                }

            }
            else
                console.log("Invalid date: "+date);
        }

        /* Format is a optional parammeter */
        this.fromUnixTimestamp = function (timestamp, format){

            var invalid_format = that.validateFormat(formats, format);

            if(invalid_format)
                format = formats["date"];
            else
                format = formats[format];

            if(moment.unix(timestamp).isValid())
                return moment.unix(timestamp).local().format(format);
            else
                console.log("Invalid date: "+date);

        }

        /* Functions */
        this.help = function (){

            var date = moment();
            console.log("PREDEFINED FORMATS: ");
            for(item in formats){

                let myformat = formats[item];
                console.log("Name:"+item+", Format:"+myformat+", Example:"+date.format(myformat));

            }

        }

        this.validateFormat = function(config_format, format) {

            if(config_format == null || typeof config_format == 'undefined'){

                only_date       = true;

                formats["date"] = "YY-MM-DD, HH:mm:ss";

                return true;

            }

            if(!config_format[format] || typeof config_format[format] === 'undefined'){

                return true;

            }

        }

    }

    return DateHelper;

});
