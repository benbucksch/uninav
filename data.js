/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

const kIconRootURL = "../graphics/dunet/";
const kTaxomonyURL = "taxonomy.json";
/**
 * {Array of {Topic}}
 */
var gAllTopics = [];

/**
 * This is an abstract element in our taxonomy or logic.
 * It will usually be represented by an UI item, but this
 * object is *not* an UI item itself, but just the data for it.
 */
function Topic() {
  this._children = [];
  this._parents = [];
  this._childrenIDs = [];
  this._parentIDs = [];
  gAllTopics.push(this);
}
Topic.prototype = {
  /**
   * {string or integer}
   */
  id : null,
  /**
   * The name or label of this node.
   * {string} user-visible
   */
  title : null,
  /**
   * image filename, relative to special image path
   * {string}
   */
  _iconFilename : null,

  /**
   * Child nodes
   * See getChildren()
   * {Array of {Topic}}
   */
  _children : null,
  /**
   * Parent nodes.
   * There can be several (multi-parenting).
   * See getParents()
   *
   * E.g. The movie "A few good men" belongs to
   * both genres "Justice" and "Thriller",
   * and to "Hollywood movies" etc.
   * {Array of {Topic}}
   */
  _parents : null,
  /**
   *
   * {Array of {string}}
   */
  _childrenIDs : null,
  /**
   * {Array of {string}}
   */
  _parentIDs : null,

  /**
   * @returns {URL as string}
   */
  get iconURL() {
    return kIconRootURL + this._iconFilename;
  },

  get children() {
    /* done in loader
    if (this._children.length == 0) {
      this._children = this._childrenIDs.map(getTopicByID);
    }*/
    return this._children;
  },

  get parents() {
    /*if (this._parents.length == 0) {
      this._parents = this._parentIDs.map(getTopicByID);
    }*/
    return this._parents;
  },

  /**
   * After creating a new Topic node,
   * add it to the taxonomy using this function.
   * @param parent {Topic}
   */
  addToParent : function(parent) {
    this._parents.push(parent);
    parent._children.push(this);
  },

  /**
   * @returns {Array of {Topic}} All ancestors
   *     Note: Each topic can have several parents.
   * @param includeThis {Boolean}
   */
  ancestors : function(includeThis) {
    var result = [];
    if (includeThis) {
      result.push(this);
    }
    return this.parents.forEach(function(parent) {
      result.push(parent);
      result = result.concat(parent.ancestors()); // recursion!
      // TODO stop loops, if not DAG
    });
    return result;
  },

  /**
   * @returns {Array of {Topic}} Ancestors, from bottom to top.
   *     For multi-parented nodes, gets only the first parent,
   *     so the result is a straight line from |this| to root.
   * @param includeThis {Boolean}
   */
  primaryAncestors : function(includeThis) {
    var result = [];
    if (includeThis) {
      result.push(this);
    }
    for (var cur = this._parents[0]; cur; cur = cur._parents[0]) {
      result.push(cur);
    }
    return result;
    /* alternate, recursive implementation
    var result = [];
    if (includeThis) {
      result.push(this);
    }
    if (this._parents.length == 0) {
      return result;
    }
    var parent = this._parents[0];
    result.push(parent);
    result = result.concat(parent.primaryAncestors()); // recursion!
    return result;
    */
  },

  /**
   * @returns {Array of {Topic}} all children and grand children,
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
    return this.parents.some(function(parent) {
      if (parent == ancestor) {
        return true;
      }
      return parent.isChildOf(ancestor); // recursion!
    });
  },

  isAncestorOf : function(child) {
    return child.isChildOf(this);
  },

}

/**
 * @param resultCallback {Function(rootTopic)}
 *     rootTopic {Topic} The root node, with |children|
 */
function loadRootTopic(resultCallback, errorCallback) {
  loadTaxonomyJSON(kTaxomonyURL, resultCallback, errorCallback)
}

/**
 * Loads taxonomy from JSON file
 * @param url {String} relative URL to the JSON file
 * @param resultCallback {Function(rootTopic, allByID)}   When server returned
 *     rootTopic {Topic} just the root node, with |children|
 *     allByID {Array of {Topic}} with index == ID, all nodes
 * @param errorCallback {Function(e)} Called when there was an error
 *     Either resultCallback() or errorCallback() will be called.
 */
function loadTaxonomyJSON(url, resultCallback, errorCallback) {
  // util.js
  loadURL({ url: url, dataType: "json" }, function(all) {
    // array -> map
    var allByID = {};
    function getTopicByID(id) {
      var found = allByID[id];
      assert(found, "Topic " + id + " not found");
      return found;
    }
    // JSON -> |Topic| objects
    var allTopics = all.map(function(c) {
      assert(c.id, "ID missing");
      assert(c.title, "Title missing");
      //assert(c.img, "Image missing");
      if (allByID[c.id]) {
        // fix taxonomy!
        assert(false, "Topic ID " + c.id + " appears twice. " +
            allByID[c.id].title + " and " + c.title);
      }
      var topic = new Topic();
      topic.id = c.id;
      topic.lodID = c.lodID;
      topic.title = c.title;
      topic._iconFilename = c.img;
      topic._parentIDs = c.parentIDs;
      topic._childrenIDs = c.childrenIDs;

      allByID[topic.id] = topic;
      return topic;
    });
    // resolve ID -> obj
    allTopics.forEach(function(topic) {
      topic._parents = topic._parentIDs.map(getTopicByID);
      topic._children = topic._childrenIDs.map(getTopicByID);
    });
    var rootTopic = allByID["root"];
    //ddebug(dumpObject(rootTopic, "root", 5));
    resultCallback(rootTopic, allByID, allTopics);
  }, errorCallback);
}

/**
 * Find a topic with |search| as |Topic.title|
 * Direct matches win, then matches at the start,
 * then substring matches later.
 * @param search {String}
 * @returns {Topic}
 */
function findTopicByTitle(search) {
  var directMatch = gAllTopics.filter(function(topic) {
    return topic.title == search;
  })[0];
  if (directMatch) {
    return directMatch;
  }
  var containsMatch = gAllTopics.filter(function(topic) {
    return topic.title.indexOf(search) >= 0;
  });
  containsMatch.sort(function(a, b) {
    // earlier in title wins
    // otherwise, first topic in hierarchy wins
    return a.title.indexOf(search) - b.title.indexOf(search);
  });
  return containsMatch[0];
}


/**
 * @param id {String} |Topic.id|
 * @returns {Topic}
 */
function findTopicByID(id) {
  return gAllTopics.filter(function(topic) {
    return topic.id == id;
  })[0];
}
