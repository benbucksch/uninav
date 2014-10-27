/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
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
   * @param callback {Function(child {3DObject})} Called for each ancestor
   */
  forEachAncestor : function(callback) {
    for (var cur = this; cur.parent; cur = cur.parent) {
      callback(cur);
    }
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
    if ( !this.parent) {
      return false;
    }
    if (this.parent == ancestor) {
      return true;
    }
    return this.parent.isChildOf(ancestor);
  },

  isAncestorOf : function(child) {
    return child.isChildOf(this);
  },


  showChildren : function() {
    throw NotReached("Override");
  },
  hideChildren : function() {
    throw NotReached("Override");
  },
  highlight : function() {
    throw NotReached("Override");
  },
  removeHighlight : function() {
    throw NotReached("Override");
  },
  select : function() {
    throw NotReached("Override");
  },
  unselect : function() {
    throw NotReached("Override");
  },

}

