/**
 * Util functions for the UI, or page manipulation
 *
 * (c) 2014 Ben Bucksch
 * License: MIT
 */


function errorCritical(e) {
  e = convertException(e); // util.js
  errorDebug(e);
  alert(e);
}

function errorNonCritical(e) {
  e = convertException(e); // util.js
  errorDebug(e);
}

function errorDebug(e) {
  ddebug(e);
  ddebug("Stack:\n" + (e.stack ? e.stack : "none"));
}




function E(id) {
  return document.getElementById(id);
}

/**
 * Remove |el| from document
 */
function removeElement(el)
{
  el.parentNode.removeChild(el);
}

/**
 * Remove all content of |el|
 */
function cleanElement(el)
{
  while (el.hasChildNodes())
    el.removeChild(el.firstChild);
}

/**
 * createElement()
 * @param tagname {String} <tagname>
 * @param classname {String} class="classname"
 * @param attributes {Array of String}
 */
function cE(tagname, classname, attributes) {
  var el = document.createElement(tagname);
  if (classname)
    el.classList.add(classname);
  for (var name in attributes)
    el.setAttribute(name, attributes[name]);
  return el;
}

/**
 * createTextNode()
 */
function cTN(text) {
  return document.createTextNode(text);
}

/**
 * Turns a DOM |NodeList| into a JS array that you can |for each| on
 * - convenience
 * - makes a copy, which is needed when you remove the elements
 */
function nodeListToArray(nodeList)
{
  var result = [];
  for (var i = 0, l = nodeList.length; i < l; i++)
    result.push(nodeList.item(i));
  return result;
}

/**
 * Like parentElement.insertBefore(newElement, insertBefore), just insert
 * after some other element.
 *
 * @param parentElement {node} Insert |newElement| as child of |parentElement|.
 * @param newElement {node} new node that you want to insert
 * @param insertAfterEl {String or DOMElement}  Element or ID of the node
 *     that should be before (left to) |newElement|.
 *     This must be a child of |parentElement|.
 *     If it does not exist, the |newElement| is added to the end.
 * @returns {node} the node that was inserted
 */
function insertAfter(parentElement, newElement, insertAfterEl) {
  var afterEl = null;
  if (insertAfterEl) {
    if (typeof(insertAfterEl) == "string") {
      afterEl = parentElement.ownerDocument.getElementById(insertAfterEl);
    } else if (insertAfterEl.ownerDocument) {
      afterEl = insertAfterEl;
    } else {
      throw new NotReached("insertAfterEl has the wrong type");
    }
    if (afterEl.parentNode != parentElement) {
      throw new NotReached("insertAfterEl has the wrong parent element");
    }
  }
  if (afterEl && afterEl.nextSibling) {
    parentElement.insertBefore(newElement, afterEl.nextSibling);
  } else {
    parentElement.appendChild(newElement);
  }
  return newElement;
}

function Dropdown(selectE) {
  selectE.o = this;
  this.e = selectE;
}
Dropdown.prototype = {
  addOptions : function(optionsMap) {
    var first = true;
    for (var id in optionsMap) {
      var label = optionsMap[id];
      var option = cE("option", null, {dataID : id, value: label });
      option.appendChild(cTN(label));
      this.e.appendChild(option);
      if (first) {
        option.setAttribute("selected", "true");
        first = false;
      }
    }
  },
  getOption : function() {
    var option = this.e.querySelector("option[selected]");
    return option.dataID;
  },
}
