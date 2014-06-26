
/**
 * @param test {Boolean}
 * @param errorMsg {String}
 */
function assert(test, errorMsg) {
  errorMsg = errorMsg || "assertion failed";
  if ( !test) {
    alert(errorMsg);
  }
}

function errorCritical(msg) {
  alert(msg);
}

function ddebug(msg) {
  if (console) {
    console.debug(msg);
  }
}


/**
 * @param url {String}   http[s]:// or file:///
 * @dataType {String-enum}  Expected type of file contents
 *    "text", "json", "xml" or "html"
 * @param successCallback {Function(result)}
 *    result {String or Object or DOMDocument}
 * @param errorCallback {Function(e {Exception or Error})}
 */
function loadURL(url, dataType, successCallback, errorCallback) {
assert(typeof(dataType) == "string" && dataType, "need type");
  var mimetype = null;
  //if (url.substr(0, 7) == "file://") {
    if (dataType == "text") {
      mimetype = "text/plain";
    } else if (dataType == "xml") {
      mimetype = "text/xml";
    } else if (dataType == "html") {
      mimetype = "text/html";
    } else if (dataType == "json") {
      //mimetype = "text/plain";
      mimetype = "text/javascript";
    } else {
      assert(false, "unknown dataType");
    }
    mimetype += "; charset=UTF-8";
  //}

  // <copied from="FetchHTTP">
  console.log("trying to open " + url);
  var callStack = Error().stack;

  function statusToException(req) {
    try {
      var errorCode = req.status;
      var errorStr = req.statusText;
      if (errorCode == 0 && errorStr == "" || errorStr == "Failure") {
        errorCode = -2;
        var sb = new StringBundle("appui.properties");
        errorStr = sb.get("cannot_contact_server.error");
      }
      var ex = new ServerException(errorStr, errorCode, url);
      ex.stack = callStack;
      return ex;
    } catch (e) {
      return e;
    }
  }

  function response(req) {
    try {
      var result = null;
      var ex = null;

      // HTTP level success
      var isHTTP = window.location.href.substr(0, 4) == "http";
      if ( !isHTTP ||
          (req.status >= 200 && req.status < 300)) {
        try {
          result = req.responseText;
        } catch (e) {
          var sb = new StringBundle("appui.properties");
          var errorStr = sb.get("bad_response_content.error") + ": " + e;
          ex = new ServerException(errorStr, -4, url);
          ex.stack = callStack;
        }
      } else {
        ex = statusToException(req);
      }

      // Callbacks
      if ( !ex) {
        return result;
      } else {
        errorCallback(ex);
      }
    } catch (e) { errorCallback(e); }
  }
  // </copied>

  var req = new XMLHttpRequest();
  req.onerror = function() {
    errorCallback(statusToException(req));
  };
  req.onload = function() {
    var data = response(req);
    if ( !data) { // errorCallback called
      return;
    }
    if (dataType == "xml") {
      data = req.responseXML;
    } else if (dataType == "html") {
      data = new DOMParser().parseFromString(data, "text/html");
    } else if (dataType == "json") {
      data = JSON.parse(data);
    }
    successCallback(data);
  };
  req.overrideMimeType("text/plain; charset=UTF-8");
  try {
    req.open("GET", url, true); // async
    req.send();
  } catch (e) { // send() throws (!) when file:// URL and file not found
    errorCallback(e);
  }
}
