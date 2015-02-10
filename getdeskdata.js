var fs = require("fs");
var curl = require("curlrequest");


// Note: this is the base64 encoding of the user:pass string 'simon@adaptivemusicfactory.com:mb2uFVS2nbtB'
// c2ltb25AYWRhcHRpdmVtdXNpY2ZhY3RvcnkuY29tOm1iMnVGVlMybmJ0Qg==
curl.request(
	{ 
		url: 'https://zzz-simon.desk.com/api/v2/cases?fields=id,subject,description,status',
		headers: {
			Authorization: 'Basic c2ltb25AYWRhcHRpdmVtdXNpY2ZhY3RvcnkuY29tOm1iMnVGVlMybmJ0Qg==',
			Accept: 'application/json'
		}
	}, function (err, dataString, meta) {
		var jData;
		var i;
		var line;
		var fieldSeparator = ',';
		var lineSeparator = '\n';
		var outputFile = 'cases.csv';
		var writeableStream;
		
		if (err) {
			console.log(err);
		} else {
			try {
				
				writeableStream = fs.createWriteStream(outputFile);
				console.log('opened ' + outputFile + ' for writing');
				//write out the header line
				line = 'Case Number (Id)' + fieldSeparator + 'Subject' + fieldSeparator + 'Description' + fieldSeparator + 'Status' + lineSeparator;
				writeableStream.write(line);
				
				// Get the id, subject, description & status entries for each line.
				// Note 1. This is written so it is very specific to this particular problem. Depending on future requests for similar data
				// it might be worth abstracting this to handle arbitrary different combinations of fields.
				// Note 2. This is for a small amount of data. If there was a large amount of data involved it might be worth
				// doing some more fancy stuff with the writableStream - e.g. checking when each chuhk of data is flushed and being more asynchronous
				// Note 3. If the fields might contain either the line or field separators, then they should be replaced by something. What that something is 
				// would depend on the client's needs.
				jData = JSON.parse( dataString );
				for (i=0; i<jData['_embedded']['entries'].length; i++) {
					
					line  = jData['_embedded']['entries'][i]['id'] + fieldSeparator +
					jData['_embedded']['entries'][i]['subject'] + fieldSeparator +
					jData['_embedded']['entries'][i]['description'] + fieldSeparator +
					jData['_embedded']['entries'][i]['status'] + lineSeparator;
					
					writeableStream.write(line);
					console.log('wrote line ' + i);
				}
				writeableStream.end();
				writeableStream.on('finish', function() {
					console.log('finished writing ' + outputFile);
				});
				
			} catch (writeErr) {
				console.log('Error writing to ' + outputFile + ' : ' + writeErr);
			}
		}
		
});
