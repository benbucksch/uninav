/**
 * Abstract interface for the UI objects
 *
 * (c) 2014 Ben Bucksch
 * License: GPL3, see LICENSE
 */


/**
 * Represents a |Topic| on the screen
 * This is the abstract API, used by Three.js and SceneJS
 * implementations.
 *
 * @param topic {Topic}
 * @param parentObj {Obj3D}  where to add this to as child
 *     Use |null| for the root obj.
 */
function Obj3D(topic, parentObj) {
  assert(topic instanceof Topic, "Need |topic| of type |Topic|");
  assert(parentObj instanceof Obj3D || !parentObj,
         "Need |parentObj| of type |Obj3D|, or null");
  this.topic = topic;
  this.parent = parentObj;
  this.children = [];
  if (this.parent) {
    this.parent.children.push(this);
  }
}
Obj3D.prototype = {
  /**
   * {Topic}
   */
  topic : null,

  /**
   * {Obj3D}
   */
  parent : null,
  /**
   * {Array of {Obj3D}}
   */
  children : null,
  /**
   * {Boolean} this.children is populated.
   */
  _childrenAlreadyAdded : false,


  _addChildren : function() {
    if (this._childrenAlreadyAdded) {
      return;
    }
    if ( ! this.topic.children || ! this.topic.children.length) {
      return; // no children
    }
    var self = this;
    this.children = this.topic.children.map(function(childTopic) {
      return self.makeChild(childTopic);
    });
    this._childrenAlreadyAdded = true;
  },

  /**
   * @result {Array of {Object3D}} All ancestors, from bottom up.
   * @param includeThis {Boolean}
   */
  ancestors : function(includeThis) {
    var result = [];
    if (includeThis) {
      result.push(this);
    }
    for (var cur = this.parent; cur; cur = cur.parent) {
      result.push(cur);
    }
    return result;
  },

  /**
   * @returns {Array of Topic} all children and grand children,
   *      not including |this|
   */
  allChildren : function() {
    var result = [];
    this.children.forEach(function(child) {
      result.push(child);
      result = result.concat(child.allChildren());
    });
    return result;
  },

  /**
   * @param ancestor {Topic}
   * @returns {boolean} |ancestor| is an ancestor of |this|
   *     whereby ancestor = parent, grandparent, ... etc.
   */
  isChildOf : function(ancestor) {
    return arrayContains(this.ancestors(), ancestor);
    /*if ( !this.parent) {
      return false;
    }
    if (this.parent == ancestor) {
      return true;
    }
    return this.parent.isChildOf(ancestor);*/
  },

  isAncestorOf : function(child) {
    return arrayContains(child.ancestors(), this);
    //return child.isChildOf(this);
  },

  /**
   * Create a new Obj3D for |Topic|,
   * as a child obj of this topic.
   *
   * @param childTopic {Topic}
   * @returns {Obj3D}
   */
  makeChild : function(childTopic) {
    throw NotReached("Override");
    /* replace Obj3D with your class:
    assert(arrayContains(this.topic.children, childTopic),
        childTopic.title + " isn't a child topic of " + this.topic.title);
    return new Obj3D(childTopic, this);
    */
  },

  addAsRoot : function() {
    throw NotReached("Override");
  },

  /**
   * Show topics underneath the current one.
   *
   * The implementation should call this.makeChild()
   * as necessary.
   */
  showChildren : function() {
    throw NotReached("Override");
  },
  /**
   * Hide topics underneath the current one.
   *
   * You might just hide them instead of deleting
   * the UI representation.
   */
  hideChildren : function() {
    throw NotReached("Override");
  },

  /**
   * User mouses over the topic.
   * He didn't click on it yet.
   *
   * Normally, this is followed by a call to showChildren().
   */
  highlight : function() {
    throw NotReached("Override");
  },
  removeHighlight : function() {
    throw NotReached("Override");
  },

  /**
   * This topic is currently active and shown in the
   * content pane.
   * Usually, because the user clicked on it,
   * or because he selected the topic from the content pane.
   */
  select : function() {
    throw NotReached("Override");
  },
  unselect : function() {
    throw NotReached("Override");
  },

}
