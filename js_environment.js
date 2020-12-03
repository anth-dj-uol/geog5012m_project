/**
 * Execute the provided JavaScript code.
 *
 * @param {*} sourceCode 
 * @param  {...any} args 
 */
function execute(sourceCode, globalObject) {

	// Store list of variable names
	var globalVariables = [];
	var globalIdentifiers = [];

	// Iterate through each global variable
	for (let identifier in globalObject) {
		if (globalObject.hasOwnProperty(identifier)) {

			// Add identifier to list of global variables
			globalIdentifiers.push(identifier);

			// Add global variable to argument list
			globalVariables.push(globalObject[identifier])
		}
	}

	// Create the executable script from the provided source code
	const strictSourceCode = `"use strict"; ${sourceCode}`
	const script = new Function(...globalIdentifiers, strictSourceCode);

	// Execute the script and store the result
	const result = script.call(globalObject, ...globalVariables);

	// Return the execution result
	return result;
}

const consoleFunctions = ['log', 'info', 'warn', 'error'];
const consoleListeners = [];

// Iterate through each console function and pipe data to listeners
consoleFunctions.forEach(functionName => {

	// Store reference to original console function
	const originalFunction = window.console[functionName];

	// Send log events to the original functions and any listeners
	window.console[functionName] = function(...args) {

		// Call original console function
		originalFunction.call(null, ...args);

		// Call attached console functions
		consoleListeners.forEach(listener => {
			listener.call(null, functionName.toUpperCase(), ...args);
		});

	};

});

/**
 * Register a function that handles log events
 * @param {*} listenerFn a function that accepts 2 arguments:
 * 	1. eventType - the log event type (e.g. 'info')
 * 	2. message - the log message
 */
function addConsoleListener(listenerFn) {
	consoleListeners.push(listenerFn);
}