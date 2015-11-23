/**
 * This implements TopicNav in a 2D UI.
 *
 * (c) 2015 Ben Bucksch
 * License: GPL3, see LICENSE
 */

var gScene;

/**
 * Represents a |Topic| on the screen, using an icon and label.
 *
 * @param topic {Topic}
 * @param parentObj {Obj3D}  where to add this to as child
 *     Use |null| for the root obj.
 */
function FlatTile(topic, parentObj) {
  Obj3D.call(this, topic, parentObj);
  this._create();
}
FlatTile.prototype = {
  _create : function() {
    var el = cE("div", "topic");
    var self = this;
    var icon = cE("img", "icon", {
      src : self.topic.iconURL,
    });
    var label = cE("div", "label");
    label.appendChild(cTN(this.topic.title));
    el.appendChild(icon);
    el.appendChild(label);

    var self = this;
    el.addEventListener("click", function(event) {
      gScene._onMouseClickHandler(self);
    }, false);
    el.addEventListener("mousemove", function(event) {
      gScene._onMouseMoveHandler(self);
    }, false);

    this._element = el;
    this._element.tile = this;
  },

  /**
   * Create a new Obj3D for |Topic|,
   * as a child obj of this topic.
   *
   * @param childTopic {Topic}
   * @returns {Obj3D}
   */
  makeChild : function(childTopic) {
    assert(arrayContains(this.topic.children, childTopic),
        childTopic.title + " isn't a child topic of " + this.topic.title);
    return new FlatTile(childTopic, this);
  },


  /**
   * Show topics underneath the current one.
   *
   * The implementation should call this.makeChild()
   * as necessary.
   */
  showChildren : function() {
    this._addChildren();
    return; // TODO implement browse mode
    throw NotReached("Override");
  },
  /**
   * Hide topics underneath the current one.
   *
   * You might just hide them instead of deleting
   * the UI representation.
   */
  hideChildren : function() {
    return; // TODO implement browse mode
    throw NotReached("Override");
  },

  /**
   * User mouses over the topic.
   * He didn't click on it yet.
   *
   * Normally, this is followed by a call to showChildren().
   */
  highlight : function() {
    this._element.classList.add("hover");
  },
  removeHighlight : function() {
    this._element.classList.remove("hover");
  },

  /**
   * This topic is currently active and shown in the
   * content pane.
   * Usually, because the user clicked on it,
   * or because he selected the topic from the content pane.
   */
  select : function() {
    //var ancestorsOnScreen = gScene.ancestors();
    this.ancestors().forEach(function(ancestor) {
      /* optimization:
      if (arrayContains(ancestorsOnScreen, ancestor)) {
        return;
      }*/
      moveElement(ancestor._element, gScene.ancestorsE);
    });

    cleanElement(gScene.childrenE);
    this.children.forEach(function(child) {
      moveElement(child._element, gScene.childrenE);
    });

    // Save old topic in history, if it's not in the other lists
    var old = gScene.current();
    if ( old &&
         !arrayContains(gScene.ancestors(), old) &&
         !arrayContains(gScene.children(), old) &&
         !arrayContains(gScene.history(), old)) {
      moveElement(gScene.current._element, gScene.historyE);
    }

    cleanElement(gScene.currentE);
    moveElement(this._element, gScene.currentE);
  },
  unselect : function() {
    cleanElement(gScene.currentE);
  },

  addAsRoot : function() {
    this._create();
    gScene.currentE.appendChild(this._element);
  },

}
extend(FlatTile, Obj3D);

var TileImplemention = FlatTile;


function createScene(sceneParentE) {
  var scene = {
    _onMouseClickHandler : function(tile) {},
    _onMouseMoveHandler : function(tile) {},

    onMouseClick : function(handler) {
      this._onMouseClickHandler = handler;
    },
    onMouseMove : function(handler) {
      this._onMouseMoveHandler = handler;
    },

    /**
     * @returns {FlatTile} Currently selected tile (and topic)
     * As shown on screen.
     */
    current : function() {
      return this._tiles(this.currentE)[0];
    },
    /**
     * @returns {Array of FlatTile} All parents of this.current
     * up to (and including) root node.
     * As shown on screen.
     */
    ancestors : function() {
      return this._tiles(this.ancestorsE);
    },
    /**
     * @returns {Array of FlatTile} Direct children of this.current.
     * As shown on screen.
     */
    children : function() {
      return this._tiles(this.childrenE);
    },
    /**
     * @returns {Array of FlatTile} Previously selected tiles,
     * which are not ancestors of this.current .
     * As shown on screen.
     */
    history : function() {
      return this._tiles(this.historyE);
    },
    _tiles : function(containerE) {
      return nodeListToArray(containerE.childNodes).map(function(el) {
        return el._tile;
      });
    },
  };
  scene.ancestorsE = cE("div", null, { id: "ancestors" });
  scene.currentE = cE("div", null, { id: "current" });
  scene.childrenE = cE("div", null, { id : "children" });
  scene.historyE = cE("div", null, { id: "history" });
  sceneParentE.appendChild(scene.ancestorsE);
  sceneParentE.appendChild(scene.currentE);
  sceneParentE.appendChild(scene.childrenE);
  sceneParentE.appendChild(scene.historyE);
  gScene = scene;
  return scene;
}



// Generic DOM utils

/**
 * Shortcut for document.getElementById()
 */
function E(id) {
  return doc.getElementById(id);
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

function cleanElement(el) {
  while (el.hasChildNodes())
    el.removeChild(el.firstChild);
}

function removeElement(el) {
  if (el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

function moveElement(el, newParentE) {
  removeElement(el);
  newParentE.appendChild(el);
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
 * @param insertAfterInfo {String or DOMElement}  Element or ID of the node
 *     that should be before (left to) |newElement|.
 *     This must be a child of |parentElement|.
 *     If it does not exist, the |newElement| is added to the end.
 * @returns {node} the node that was inserted
 */
function insertAfter(parentElement, newElement, insertAfterInfo) {
  var afterEl = null;
  if (insertAfterInfo) {
    if (typeof(insertAfterInfo) == "string") {
      afterEl = parentElement.ownerDocument.getElementById(insertAfterInfo);
    } else if (insertAfterInfo.ownerDocument) {
      afterEl = insertAfterInfo;
    } else {
      throw new NotReached("insertAfterInfo has the wrong type");
    }
    if (afterEl.parentNode != parentElement) {
      throw new NotReached("insertAfterInfo has the wrong parent element");
    }
  }
  if (afterEl && afterEl.nextSibling) {
    parentElement.insertBefore(newElement, afterEl.nextSibling);
  } else {
    parentElement.appendChild(newElement);
  }
  return newElement;
}
