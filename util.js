/**
 * Util functions
 * Non-UI and UI
 * TODO use util.js from DU
 *
 * (c) 2014 Ben Bucksch
 * License: MIT
 */

/**
 * @param test {Boolean}
 * @param errorMsg {String}
 */
function assert(test, errorMsg) {
  errorMsg = errorMsg || "assertion failed";
  if ( !test) {
    throw new Exception(errorMsg);
  }
}

function errorCritical(e) {
  ddebug(e);
  alert(e);
}

function errorNonCritical(e) {
  ddebug(e);
}

function ddebug(msg) {
  if (console) {
    console.debug(msg);
  }
}

function E(id) {
  return document.getElementById(id);
}


/**
 * Create a subtype.
 */
function extend(child, supertype)
{
  child.prototype.__proto__ = supertype.prototype;
}



/**
 * Parses a URL query string into an object.
 *
 * @param queryString {String} query ("?foo=bar&baz=3") part of the URL,
 *     with or without the leading question mark
 * @returns {Object} JS map { name1 : "value", name2: "othervalue" }
 */
function parseURLQueryString(queryString)
{
  var queryParams = {};
  if (queryString.charAt(0) == "?" || queryString.charAt(0) == "#")
    queryString = queryString.substr(1); // remove leading "?" or "#", if it exists
  var queries = queryString.split("&");
  for (var i = 0; i < queries.length; i++) {
    try {
      if ( !queries[i]) {
        continue;
      }
      var querySplit = queries[i].split("=");
      var value = querySplit[1].replace(/\+/g, " "); // "+" is space, before decoding
      queryParams[querySplit[0]] = decodeURIComponent(value);
    } catch (e) {
      // Errors parsing the query string are not fatal, we should just continue
      errorNonCritical(e);
    }
  }
  return queryParams;
}


function getLang() {
  return "en";
}


/**
 * Removes |element| from |array|.
 * @param array {Array} to be modified. Will be modified in-place.
 * @param element {Object} If |array| has a member that equals |element|,
 *    the array member will be removed.
 * @param all {boolean}
 *     if true: remove all occurences of |element| in |array.
 *     if false: remove only the first hit
 * @returns {Integer} number of hits removed (0, 1 or more)
 */
function arrayRemove(array, element, all)
{
  var found = 0;
  var pos = 0;
  while ((pos = array.indexOf(element, pos)) != -1)
  {
    array.splice(pos, 1);
    found++
    if ( ! all)
      return found;
  }
  return found;
}

/**
 * Check whether |element| is in |array|
 * @param array {Array}
 * @param element {Object}
 * @returns {boolean} true, if |array| has a member that equals |element|
 */
function arrayContains(array, element)
{
  return array.indexOf(element) != -1;
}

/**
 * Return the contents of an object as multi-line string, for debugging.
 * @param obj {Object} What you want to show
 * @param name {String} What this object is. Used as prefix in output.
 * @param maxDepth {Integer} How many levels of properties to access.
 *    1 = just the properties directly on |obj|
 * @param curDepth {Integer} internal, ignore
 */
function dumpObject(obj, name, maxDepth, curDepth)
{
  if (curDepth == undefined)
    curDepth = 1;
  if (maxDepth != undefined && curDepth > maxDepth)
    return "";

  var result = "";
  var i = 0;
  for (var prop in obj)
  {
    i++;
    if (typeof(obj[prop]) == "xml")
    {
      result += name + "." + prop + "=[object]" + "\n";
      result += dumpObject(obj[prop], name + "." + prop, maxDepth, curDepth+1);
    }
    else if (typeof(obj[prop]) == "object")
    {
      if (obj[prop] && typeof(obj[prop].length) != "undefined")
        result += name + "." + prop + "=[probably array, length " + obj[prop].length + "]" + "\n";
      else
        result += name + "." + prop + "=[object]" + "\n";
      result += dumpObject(obj[prop], name + "." + prop, maxDepth, curDepth+1);
    }
    else if (typeof(obj[prop]) == "function")
      result += name + "." + prop + "=[function]" + "\n";
    else
      result += name + "." + prop + "=" + obj[prop] + "\n";
  }
  if ( ! i)
    result += name + " is empty\n";
  return result;
}



/*
 * Creates a download URL for file contents in a JS string,
 * and loads it in the current window,
 * which triggers the "Save As..." dialog in the browser.
 * This allows to download a file that you have constructed in a JS variable.
 * It's a HACK, though.
 *
 * @param contents {String}   the file contents
 * @param mimetype {String}   the file type
 */
function downloadFromVariable(contents, mimetype) {
  assert(contents && typeof(contents) == "string", "need file contents");
  assert(mimetype && typeof(mimetype) == "string", "need mimetype");
  assert(mimetype.indexOf("/") > 0 && mimetype.indexOf(" ") == -1, "mimetype is malformed");
  var file = new Blob([ contents ], { type : mimetype });
  var reader = new FileReader();
  reader.onload = function(e) { window.location = e.target.result; };
  reader.readAsDataURL(file);
}


/**
 * @param url {String}   http[s]:// or file:///
 * @dataType {String-enum}  Expected type of file contents
 *    "text", "json", "xml" or "html"
 * @param successCallback {Function(result)}
 *    result {String or Object or DOMDocument}
 * @param errorCallback {Function(e {Exception or Error})}
 */
function loadURL(params, successCallback, errorCallback) {
  var url = params.url;
  assert(typeof(url) == "string" && url, "need type");
  for (var name in params.urlArgs) {
    url += (url.indexOf("?") == -1 ? "?" : "&") +
            name + "=" + encodeURIComponent(params.urlArgs[name]);
  }
  var dataType = params.dataType;
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

  /*if (params.lib == "jquery") {
    $.getJSON(url, {
      dataType : dataType,
      success : successCallback,
      error : errorCallback,
    });
    return;
  }*/

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
      if (data.substr(0, 5) == "load(") {
        data = data.substr(5, data.length - 6);
      }
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

function Exception(msg)
{
  this._message = msg;

  // get stack
  try {
    not.found.here += 1; // force a native exception ...
  } catch (e) {
    this.stack = e.stack; // ... to get the current stack
  }
  //ddebug("ERROR (exception): " + msg + "\nStack:\n" + this.stack);
}
Exception.prototype =
{
  get message()
  {
    return this._message;
  },
  set message(msg)
  {
    this._message = msg;
  },
  toString : function()
  {
    return this._message;
  }
}

function ServerException(serverMsg, code, uri)
{
  var msg = serverMsg;
  if (code >= 300 && code < 600) { // HTTP error code
    msg += " " + code;
  }
  msg += "\n\n<" + uri + ">";
  Exception.call(this, msg);
  this.rootErrorMsg = serverMsg;
  this.code = code;
  this.uri = uri;
}
ServerException.prototype =
{
}
extend(ServerException, Exception);
