var fs = require("fs");
var https = require('https');

//variables for file reading
var allData = ""; // will be reading the data from the csv file into this
var falseLineEnd = /,"[^"]*$/; // this matches a line that ends with a field starting with a " but which has no closing "
var logging = true; // if false all the output to the console and to the log file won't happen
var testing = true; // if true instead of posting data to desk.com from the csv file, we the testData object below
var logFileStream; // for writing the log

var postDataObj = []; // the json object to be posted to desk.com goes in here
var postDataString; // the stringified version of postDataObj goes in here

//variables for posting
var httpsOptions; // options object for the https request
var postReq; // the https request 

// functions - see descriptions above each function
var log; 
var testLineEnd;
var createLineObj;

var testData = {
	first_name:	'Ceasar',
	last_name: 'Huel',
	company: 'Prohaska-Bergstrom',
	title: 'Central Factors Executive',
	email_1: 'ceasar_huel@harber.org',
	email_2: 'ceasar_huel@hoppe.info',
	email_3: 'ceasar.huel@becker.info',
	email_4: 'huel.ceasar@mclaughlin.org',
	email_5: 'huel.ceasar@vonruedenfriesen.net',
	phone_number_1: '1-772-985-7797',
	address_1: "878 Kareem Dale Waelchistad, Indiana 98726-0192",
	address_2: "7151 Price Glen Parisianshire, South Dakota 21901",
	address_3: 	"89855 Assunta Plain Port Einochester, Delaware 26264-6449",
	address_4: "",
	address_5: ""
}


// if logging is true this outputs log messages to the console and to the log file
log = function(message) {
	if (logging) {
		console.log(message);
		logFileStream.write(message);
		logFileStream.write('\n');
	}
} 

// set up the log file for writing if we're logging
if (logging) {
	logFileStream = fs.createWriteStream('postdeskdata_log.txt');
}

// set up the options for the https request to post some new customers to the Desk.com API
httpsOptions = {
	hostname: 'zzz-simon.desk.com',
	port: 443,
	path: '/api/v2/customers',
	method: 'POST',
	headers: {
		Authorization: 'Basic c2ltb25AYWRhcHRpdmVtdXNpY2ZhY3RvcnkuY29tOm1iMnVGVlMybmJ0Qg==',
		Accept: 'application/json',
		'Content-Type': 'application/json'
	}
};

// create the https request
postReq = https.request(httpsOptions, function(response) {
	response.on('data', function(chunk) {
		log('Response:\n' + chunk);
	});
	
	response.on('end', function() {
		log('\nThat\'s all folks!');
		logFileStream.end();
	});
});

postReq.on('error', function(err) {
	console.log('tried to post, but got this error: ' + err);
});



// helper function used in source.on(end) below 
// recursively glues together lines if they end with a newline that is inside double quotes		
testLineEnd = function recursiveTestLineEnd(inputArray,index) {
	var result;
	log('recursiveTestLineEnd index is ' + index);
	if ( falseLineEnd.test(inputArray[index]) ) {
		result = recursiveTestLineEnd(inputArray,index+1);
		log('recursiveTestLineEnd returning next index ' + result.index);
		return {
			data: inputArray[index] + result.data,
			index: result.index
		}
	} else {
		log('recursiveTestLineEnd returning next index ' + (index+1) + ' and data: \n' + inputArray[index]);
		return {data: inputArray[index], index: index+1};
	}
};


// read the csv file
source = fs.createReadStream('customers_short.csv'); //  real file is  'sample_customers.csv');

// get all the data into one variable (since we have a small amount of data)
source.on('data', function(chunk) {
	allData = allData + chunk.toString();
});

// after we have allData filled up, parse the data, create an appropriate json object, then post that object using the postReq
source.on('end', function() {
	var linesFirstPass;
	var i;
	var realLines = [];
	var lineTestResult;
	var fieldValues;
	var fieldValuesRegex = /[^,"]*(,|$)|"[^"]*"(,|$)/g; // matches fields separated by commas taking into account fields within double quotes
	var lineObj = {};
	
	//start by naievely splitting the lines up based on the \n
	linesFirstPass = allData.split('\r\n');
	
	// however some of the \n are inside "" which means they are not really the end of a line and should be glued back together
	i=0;
	while (i<linesFirstPass.length) {
		log('while loop: i=' + i);
		lineTestResult = testLineEnd(linesFirstPass,i);
		realLines.push( lineTestResult.data );
		i = lineTestResult.index;
		log('end while loop: i=' + i);
	}
	
	// this is just console logging, that can be commented out
	log('realLines is:\n***\n');
	for (i in realLines) {
		log(realLines[i] + '\n\n');
	}
	log('***\n');
	
	// get the fieldNames from the first row of the array
	fieldNames = realLines[0].split(',');
	log('fieldNames=\n' + fieldNames);
	
	if (testing) {
		postDataString = JSON.stringify(testData); 
		postReq.write(postDataString);
	} else {
		// make up a json object structured like 
		// {
		// 	fieldName: fieldValue,
		// 	fieldName: fieldValue,
		// 	etc
		// }
		for (i=1; i<realLines.length; i++) {
			// create a json object with the fieldNames as keys and the fieldValues as values
			fieldValues = realLines[i].match(fieldValuesRegex);
			lineObj = createLineObj(fieldNames, fieldValues);
			postDataString = JSON.stringify(lineObj);
			
			log('*******json data to post************');
			log(postDataString);
			log('**************');
			
			httpsOptions['headers']['Content-Length'] = postDataString.length;
			postReq.write(postDataString);
		}
	}
	
	postReq.end();
		
});

// helper function to take the an array with keys and an array with values and create a json object
createLineObj = function(keyArray, valueArray) {
	var startQuotes = /^"/; // identifies a double quote at the beginning of a line in order to strip it out
	var endComma = /"?,?$/; // identifies a double quote and/or at the end of the line in order to strip it out
	var i;
	var result = {}; // this is the object we're building
	
	log('****fieldValues******');
	
	for (i in keyArray) {
		// strip out the " and , (see regexes above)
		valueArray[i] = valueArray[i].replace(startQuotes,'');
		valueArray[i] = valueArray[i].replace(endComma,'');
		
		log(valueArray[i]);
		
		// put the key-value pair into the result object
		result[ keyArray[i] ] = valueArray[i]; 
	}
	
	log('**************');
	
	return result;
}


