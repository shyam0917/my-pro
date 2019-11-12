;define(['jquery', 'lib/FormPage', 'lib/CallGet' ], 
    function ($, FormPage, CallGet) {
    	
    	function SignUpContentCreation (){
    		FormPage.call(this);
    		
    		const that                  = this;

    		this.getClassName           = function () {
    			return 'SignUpContentCreation';
    		};

    		this.defineContent          = function () {
    			return $.when(
    				this.getPageMui()
    			).then( (mui) => {
        			this.setContentData(mui);
    			}); 

    		};
    		
	        this.defineEmailType    = function () {

	            return 'portals/' + this.getPortalName() + '/contact_us';
	        };

	        this.defineFormData             = function ( form ) {
	             var formData        = {};

	            // get all form data
	            $(form).find('input[type="text"],input[type="email"],textarea,select').each(function () {
	                formData[$(this).prop('name')] = $(this).val();
	            });
	            formData['comments']+= '<br><br>Categories of interest:';
	            $(form).find('input[type="checkbox"]').each( function () {
	                if($(this).prop('type') == 'checkbox' && $(this).prop('checked')){
	                    formData['comments'] += '<br>';
	                    formData['comments'] +=  $(this).val();
	                    return true;
	                }
	                if($(this).prop('type') == 'checkbox' && !$(this).prop('checked')){
	                    return true;
	                }
	            })
	            return formData;
	        };

	        this.defineSelector     = function () {

	            return '#cc-contact';
	        };

    	}

        SignUpContentCreation.prototype = Object.create(FormPage.prototype);
        SignUpContentCreation.prototype.constructor = SignUpContentCreation;
    	return SignUpContentCreation
    }
);