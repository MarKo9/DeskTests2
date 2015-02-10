var fs = require("fs");
var https = require('https');

//variables for file reading
var allData = "";
var falseLineEnd = /,"[^"]*$/; // this matches a line that ends with a field starting with a " but which has no closing "
var logging = true;
var testing = true;
var postDataObj = [];
var postDataString;

//variables for posting
var httpsOptions;
var postReq;

// functions
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



log = function(message) {
	if (logging) {
		console.log(message);
	}
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
source = fs.createReadStream('customers_short.csv'); //    './sample_customers.csv');

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


createLineObj = function(nameArray, valueArray) {
	var startQuotes = /^"/;
	var endComma = /"?,?$/;
	var i;
	var result = {};
	
	log('****fieldValues******');
	
	for (i in nameArray) {
		valueArray[i] = valueArray[i].replace(startQuotes,'');
		valueArray[i] = valueArray[i].replace(endComma,'');
		
		log(valueArray[i]);
		
		result[ nameArray[i] ] = valueArray[i]; 
	}
	
	log('**************');
	
	return result;
}


