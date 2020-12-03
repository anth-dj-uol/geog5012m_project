// Global variables
let map;											// references the map instance
let maxZoom = 18;							// Maximum map zoom value
let scratchLayerData;					// Temporary GeoJSON layer
let scratchLayer;							// Temporary map layer
let outputLine = 0;						// The current log line number
let numLayers = 0;						// The number of input layers that have been added
let inputLayers = {};					// Reference to the current input layers
let statusTextElement;				// Status message elements
let sourceCode;								// Source code field
let consoleOutput; 						// Console output element
let inputLayerTableBody; 			// Input layer table body element

// Constants
const scratchLayerId = 'scratch';
const allLayersId = 'inputLayers';
const defaultStyle = {
	color: `#222222`,
	fillOpacity: '0.4',
};
const defaultScratchStyle = {
	fillColor: `#ffff25`,
	fillOpacity: '0.95',
};
const tileServer = 'http://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileServerAttribution = 'Map data ©OpenStreetMap contributors, CC-BY-SA, Imagery ©CloudMade';
const fadeOutMillis = 2000;


/**
 * Initialize the map view and element references
 */
function initialize() {

	// Setup map view
	map = L.map('map').setView([25, -5], 2);
	L.tileLayer(tileServer, {
		attribution: tileServerAttribution,
		maxZoom: maxZoom
	}).addTo(map);

	// Add a listener to the console logging events
	addConsoleListener(function(type, logEventContent) {

		// Get the console output content
		const content = typeof logEventContent === 'object' ?
			JSON.stringify(logEventContent, null, 2) :
			logEventContent;

		// Add output to the DOM
		consoleOutput.append(`
			<pre class="log-${type}">[${ (new Date()).toISOString()}] [${type}] ${content}</pre>
		`);
		outputLine++;

		// Scroll to the bottom of the log
		consoleOutput.scrollTop(consoleOutput.innerHeight() * outputLine);
	});

	// Store reference to message elements
	statusTextElement = $('#statusText');

	// Store reference to the source code field
	sourceCode = $('#sourceCode');

	// Store reference to the console output element
	consoleOutput = $('#consoleOutput');

	// Store reference to the input layer table body element
	inputLayerTableBody = $('#inputLayerTableBody');
}

/**
 * Returns global execution context.
 */
function getGlobalObject() {

	const globalObject = {};
	const allLayers = [];

	// Add individual input layers
	for (let layerId in inputLayers) {
		if (inputLayers.hasOwnProperty(layerId)) {
			const layer = inputLayers[layerId];

			// Add global reference to the input layer
			const data = layer.data;
			if (data) {
				globalObject[layerId] = data;
				allLayers.push(data);
			}
		}
	}

	// Add reference to all input layers
	globalObject[allLayersId] = allLayers;

	// Add scratch layer
	globalObject[scratchLayerId] = scratchLayerData;

	return globalObject;
}

/**
 * Generate a random color in Hex format
 */
function genHexColor() {
  colors = new Array(16);
  colors[0] = "0";
  colors[1] = "1";
  colors[2] = "2";
  colors[3] = "3";
  colors[4] = "4";
  colors[5] = "5";
  colors[6] = "6";
  colors[7] = "7";
  colors[8] = "8";
  colors[9] = "9";
  colors[10] = "a";
  colors[11] = "b";
  colors[12] = "c";
  colors[13] = "d";
  colors[14] = "e";
  colors[15] = "f";

  digit = new Array(5);
  color = "";
  for (i = 0; i < 6; i++) {
    digit[i] = colors[Math.round(Math.random() * 15)];
    color = color + digit[i];
  }

  return color;
}


/**
 * Run the current input script
 */
function runScript() {

	// Update status message
	statusTextElement.stop(true, true).html('Running...').fadeIn(0);

	try {

		// Execute the source code and store the result
		const result = execute(sourceCode.val(), getGlobalObject());

		// If a return value is provided, set it as the scratch layer
		if (result) {
			loadScratchLayer(result);
		}

		// Update status text
		statusTextElement.html('Done.');

	} catch(err) {

		// Log the error stack
		console.error(err.stack);
	
		// Display the error status
		statusTextElement.html('Error.');
	}

	// Fade out status message
	statusTextElement.fadeOut(fadeOutMillis);
}

/**
 * Clear the scratch layer
 */
function clearScratchLayer() {

	// Remove scratch layer from the map
	if (scratchLayer) {
		map.removeLayer(scratchLayer);
	}

	// Clear scratch layer references
	scratchLayer = undefined;
	scratchLayerData = undefined;

	// Update status message
	statusTextElement.stop(true, true).html('Cleared.').fadeIn(0).fadeOut(fadeOutMillis);
}

/**
 * Add GeoJSON input layer from the specified URL
 *
 * @param {*} url - the data source URL
 */
function loadGeoJSONInput(url) {
	if (url) {
		$.getJSON(url, function(result) {
			addInputLayer(result, url);
		}).fail(err => console.error(err));
	}
}

/**
 * Clears the console log
 */
function clearConsole() {
	consoleOutput.empty();
}

/**
 * Add a GeoJSON input layer
 *
 * @param {*} geoJsonData 
 */
function addInputLayer(geoJsonData, source) {

	// Get the next input layer number
	const nextIndex = ++numLayers;

	// Generate the layer ID
	const layerId = `layer${nextIndex}`;

	// Generate the layer color
	const layerColor = `#${genHexColor()}`;

	// Load example GeoJSON data from EONET
	const mapLayer = loadGeoJSON(geoJsonData, layerId, nextIndex + 1, layerColor);

	// Store a reference to the map layer
	inputLayers[layerId] = {
		data: geoJsonData,
		mapLayer: mapLayer
	};

	// Generate the input layer table row
	const tableRow = `
		<tr id="inputLayer_${layerId}">
			<td>
				<span class="layer-style-block" style="background-color: ${layerColor};"></span>
			</td>
			<td>
				${layerId}
			</td>
			<td class="source">
				(${source || 'source not available'})
			</td>
			<td>
				<button onclick="removeInputLayer('${layerId}')" title="Remove input layer">
					X
				</button>
			</td>
		</tr>
	`;
	inputLayerTableBody.append(tableRow);
}

/**
 * Remove specified input layer
 *
 * @param {*} layerId - the layer identifier
 */
function removeInputLayer(layerId) {

	// Remove table row
	$(`#inputLayer_${layerId}`).remove();

	// Remove map layer
	const inputLayer = inputLayers[layerId];
	const mapLayer = inputLayer.mapLayer;
	if (mapLayer) {
		map.removeLayer(mapLayer);
	}
	
	// Delete layer reference
	delete inputLayers[layerId];
}

/**
 * Replace the current scratch layer with the specified GeoJSON data
 *
 * @param {*} geoJsonData - the data to be loaded in the scratch layer
 */
function loadScratchLayer(geoJsonData) {
	clearScratchLayer();

	scratchLayerData = geoJsonData;
	scratchLayer = loadGeoJSON(
		geoJsonData,
		scratchLayerId,
		inputLayers.length + 1,
		defaultScratchStyle
	);
}

/**
 * Return the stye object for the provided GeoJSON object
 *
 * @param {*} geoJsonData - the GeoJSON data
 */
function getGeoJsonStyle(geoJsonData) {

	// Return style object, if provided
	if (geoJsonData.properties) {
		return { ...geoJsonData.properties.style };
	}

	// Otherwise return an empty object
	return {};
}

/**
 * Load a GeoJSON layer into the map view
 *
 * @param {*} geoJsonData - the GeoJSON data
 */
function loadGeoJSON(geoJsonData, layerId, zIndex, layerColorOrStyle) {

	// Load the GeoJSON layer
	const layer = L.geoJSON(geoJsonData, {

		// Define the mapping from GeoJSON point to map feature
		pointToLayer: function(geoJsonPoint, latlng) {
			return L.circleMarker(latlng, {
				radius: 7,
				weight: 1,
				...getGeoJsonStyle(geoJsonPoint)
			});
		},

		// Define the style for the GeoJSON data
		style: function(geoJsonData) {

			// Get the provided layer style
			const layerStyle = typeof layerColorOrStyle === 'string' ?
				{ fillColor: layerColorOrStyle } :
				layerColorOrStyle;

			// Peice together the resulting style object
			const style = {
				...defaultStyle,
				...layerStyle,
				zIndex: zIndex,
				...getGeoJsonStyle(geoJsonData)
			};
			return style;
		}
	});

	// Bind tooltip to display layer
	layer.bindTooltip(`${layerId}`);

	// Bind a popup with basic information
	layer.bindPopup(function (layer) {

		// Get GeoJSON properties
		const properties = layer && layer.feature && layer.feature.properties;

		// Define the header row elements
		const headerRow = `
			<tr class="title">
				<td>
					Layer ID:
				</td>
				<td>
					${layerId}
				</td>
			</tr>
		`

		// Store popup table rows
		const tableRows = [];
		if (properties) {

			// Iterate through each object property
			for (var key in properties) {
				if (properties.hasOwnProperty(key)) {
					let value = properties[key];

					// If an object is provided, convert to string value
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }

					// Add object key-value pair to the property table
					tableRows.push(`<tr><td>${key}</td><td>${value}</td></tr>`)
				}
			}
		}

		// Return the popup table element
		return `
			<table class="property-table">
				${headerRow}
				${tableRows.join('')}
			</table>`;
	});

	// Add layer to the map
	layer.addTo(map);

	// Return a reference to the GeoJSON layer data
	return layer;
}

/**
 * Load example data into the UI
 */
function loadExample() {

	// Load example input data
	loadGeoJSONInput('eonet_test_data.json');

	// Prefill the URL input field
	$('#layerUrl').val('eonet_test_data_2.json');

	/**
	 * Define the example script.
	 *
	 * Note that the indentation has been adjusted to maintain proper
	 * formatting in the UI.
	 */
	const exampleScript =
`// Below is an example script that demonstrates some possible operations

const eventFeatures = inputLayers // Access all input layers

	// Collect all layer features
	.reduce((prev, curr) => prev.concat(curr.features || []), [])

	// Filter features by certain criteria
	.filter(feature => {
		return feature.geometry.type === 'Point' &&
			feature.properties.id === 'EONET_5104';
	})
	
	// Create custom feature points
	.map(feature => {
		return {
			type: "Feature",
			geometry: feature.geometry,
			properties: feature.properties
		};
	});

// Sort event points by date
eventFeatures.sort((a, b) => a.properties.date > b.properties.date);

// Record the first and last events
const firstEvent = eventFeatures[0];
const lastEvent = eventFeatures[eventFeatures.length - 1];

// Log information about the selected events
console.info("Number of selected events: " + eventFeatures.length);
console.info("Event started at: " + firstEvent.properties.date);
console.info("Event ended at: " + lastEvent.properties.date);

// Color code the start and end events
firstEvent.properties.style = { fillColor: '#53d453' }; // Green
lastEvent.properties.style = { fillColor: '#ea6868' }; // Red

// Build the event path line string
const eventPath = eventFeatures.map(f => f.geometry.coordinates);

// Add a new GeoJSON layer for the event path
eventFeatures.unshift({
	type: "LineString",
	coordinates: eventPath
});

// Return the layer to display it on the map
return {
	type: 'FeatureCollection',
	features: eventFeatures
};
`;

	// Prefill the script
	sourceCode.val(exampleScript);
}


