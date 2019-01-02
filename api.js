var request = require("request"),
  _ = require("underscore")._,
  libxmljs = require('libxmljs'),
  unzip = require('unzip')
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

  var result, error;

  // Parse an XML stream, either a unzipped KML or regular XML response.
  var parseXml = function(stream) {
    var xml = '';
    stream.on('data', function (chunk) {
      xml += chunk;
    });
    stream.on('end', function() {
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
    });
  }

  var handleResponse = function(res) {
    if (res.statusCode == 200) {
      var contentType = res.headers['content-type'];
      if (contentType.indexOf('.kmz') > -1) {
        res
        .pipe(unzip.Parse({verbose: true}))
        // unzip.Parse emits `entry` event with a Stream
        .on('entry', parseXml);
      } else {
        parseXml(res);
      }
    } else {
      // Non-OK status code
      var xml = '', err = null;
      res.on('data', function (chunk) {
        xml += chunk;
      });
      res.on('end', function() {
        try {
          result = JSON.parse(xml);
          result.size = xml.length;
          error = err;
        } catch(e) {
          error = err || { statusCode: res.statusCode };
          error.parseError = e;
          result = {size: 0, errnum: 1, errtxt: "Request failed"}
        } finally {
          cb( error, result );
        }
      });
    }
  }

  request({url: reqString, headers: params.headers || {}})
  .on('error', cb)
  .on('response', handleResponse)
}