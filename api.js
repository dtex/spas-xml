var request = require("request"),
	_ = require("underscore")._,
	libxmljs = require('libxmljs')
;

/*
	# Simple XML Request
*/

exports["parse"] = function(params, credentials, cb) {
	
	var reqString = params.url,
		first = reqString.indexOf('?') === -1 ? true : false;
	
	_.each(params, function(val, key) {
		if(key !== 'url' && key !== 'headers' && key !== 'parseFunction') {
			reqString += first ? '?' : '&';
			reqString += key + '=' + val;
			first = false;
		}
	});
	
	var handleResponse = function(err, res, xml) {
		var result, error;
		if (!err && res.statusCode == 200) {
			try {
				var xmlDoc = libxmljs.parseXml(xml);
				result = params.parseFunction(xmlDoc);
				error = null;
			} catch(e) {
				result = {size: xml.length, error:true, response: xml};
				error = { msg: "Unable to parse JSON", detail: e.toString() };
			} finally {
				cb(error, result );	
			}
		} else {
			try {
				result = JSON.parse(xml);
				result.size = xml.length;
				error = err;
			} catch(e) {
				error = err || { statusCode: res.statusCode };
				error.parseError = e;
				result = {size: 0, errnum:1, errtxt:"Request failed"}
			} finally {
				cb(error, result );	
			}
		}
	}
	
	request({url: reqString, headers: params.headers || {}}, handleResponse);
	
}
