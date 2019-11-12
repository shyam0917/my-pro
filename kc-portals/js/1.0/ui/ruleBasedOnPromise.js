function ruleBasedOnPromise(validator, value, element, thePromise, return_message)
{
	var method = 'remote';

	var previous = validator.previousValue(element, method);

	if (!validator.settings.messages[element.name]) {
		validator.settings.messages[element.name] = {};
	}

	previous.originalMessage
		= previous.originalMessage || validator.settings.messages[element.name][method];
	validator.settings.messages[element.name][method] = previous.message;

	var optionDataString = $.param({data: value});
	if (previous.old === optionDataString) {
		return previous.valid;
	}
	previous.old = optionDataString;

	validator.startRequest(element);

	thePromise.then(function (valid) {

		validator
			.settings
			.messages[element.name][method] = previous.originalMessage;

		if (valid) {
			var submitted = validator.formSubmitted;
			validator.resetInternals();
			validator.toHide = validator.errorsFor(element);
			validator.formSubmitted = submitted;
			validator.successList.push(element);
			validator.invalid[element.name] = false;
			validator.showErrors();
		} else {
			var errors = {};
			var message = validator.defaultMessage(element, {
				method: method,
				parameters: value
			});
			errors[element.name] = previous.message = return_message;
			validator.invalid[element.name] = true;
			validator.showErrors(errors);
		}
		previous.valid = valid;
		validator.stopRequest(element, valid);
	});

	return "pending";
}