/**
 * Loads taxonomy data and gives convenient access to it.
 * This is pure data, independent from any UI or display.
 *
 * (c) 2014 Ben Bucksch
 * License: GPL3, see LICENSE
 */

const kIconRootURL = "/graphics/dunet/";
const kContentRootURL = "/content/";
const kTaxomonyURL = "taxonomy.json";

/**
 * Only for topics loaded from LOD.
 * Map topicID -> {Topic}
 */
gAllTopicsByID = {};

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
  _exploreURL : null,
  _descriptionURL : null,

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
    return this._iconFilename
      ? (this._iconFilename.substr(0, 4) == "http"
         ? this._iconFilename
         : kIconRootURL + this._iconFilename)
      : null;
  },

  /**
   * The animation to load in the center pane
   * when the topic is being loaded.
   * @returns {URL as string}
   */
  get exploreURL() {
    if ( !this._exploreURL) {
      return undefined;
    }
    if (this._exploreURL.substr(0, 4) == "http") {
      return this._exploreURL;
    }
    return kContentRootURL + this._exploreURL;
  },

  /**
   * The description to load in the center pane
   * when the topic is being loaded.
   * @returns {URL as string}
   */
  get descriptionURL() {
    if ( !this._descriptionURL) {
      return undefined;
    }
    if (this._descriptionURL.substr(0, 4) == "http") {
      return this._descriptionURL;
    }
    return kContentRootURL + this._descriptionURL;
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
   *
   * TODO multi-parented: avoid adding the same node multiple times
   */
  ancestors : function(includeThis) {
    var result = [];
    if (includeThis) {
      result.push(this);
    }
    this.parents.forEach(function(parent) {
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
   *
   * TODO multi-parented: avoid adding the same node multiple times
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
      if (gAllTopicsByID[c.id]) {
        ddebug("Warning: Topic ID " + c.id + " appears twice. " +
            gAllTopicsByID[c.id].title + " and " + c.title +
            " . Are you merging overlapping or identical taxonomies?");
      }
      var topic = new Topic();
      topic.id = c.id;
      topic.lodID = c.lodID;
      topic.title = c.title;
      topic._iconFilename = c.img;
      topic._exploreURL = c.exploreURL;
      topic._descriptionURL = c.descriptionURL;
      topic._parentIDs = c.parentIDs;
      topic._childrenIDs = c.childrenIDs;

      allByID[topic.id] = topic;
      gAllTopicsByID[topic.id] = topic;
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
 * Creates taxonomy JSON
 * @returns {JSON} flat list with all nodes
 */
function exportTaxonomyJSON(rootTopic) {
  assert(rootTopic instanceof Topic, "Need root node");

  // Map topic.id -> |Topic|
  var allByID = {};
  // recursive function to walk the whole hierarchy
  var addFamily = function(topic) {
    assert(topic.id, "ID missing");
    assert(topic.title, "Title missing");
    allByID[topic.id] = topic;
    topic.children.forEach(function(child) {
      if (allByID[child.id]) { // multi-parenting
        return; // recursion stop buck
      }
      addFamily(child);
    });
    // Parents (above the root) shouldn't be necessary
    /*topic.parents.forEach(function(child) {
      if (allByID[child.id]) { // multi-parenting
        return; // recursion stop buck
      }
      addFamily(child);
    });*/
  };
  addFamily(rootTopic);

  // Convert |Topic| objects -> JSON
  var allJSON = [];
  var isUsed = function(id) {
    return !!allByID[id];
  };
  for (var id in allByID) {
    var topic = allByID[id];
    var json = {};
    json.id = topic.id;
    json.lodID = topic.lodID;
    json.title = topic.title;
    json.img = topic._iconFilename;
    json.exploreURL = topic._exploreURL;
    json.descriptionURL = topic._descriptionURL;
    json.parentIDs = topic._parentIDs.filter(isUsed);
    json.childrenIDs = topic._childrenIDs;
    allJSON.push(json);
  }
  return allJSON;
}

/*function exportTopicJSON(topic) {
  var json = {};
  json.id = topic.id;
  json.lodID = topic.lodID;
  json.title = topic.title;
  json.img = topic._iconFilename;
  json.exploreURL = topic._exploreURL;
  json.descriptionURL = topic._descriptionURL;
  json.parentIDs = topic._parentIDs;
  json.childrenIDs = topic._childrenIDs;
  return json;
}*/


/**
 * Find a topic with |search| as |Topic.title|
 * Direct matches win, then matches at the start,
 * then substring matches later.
 * @param search {String}
 * @returns {Topic}
 */
function findTopicByTitle(search) {
  var allTopics = [];
  for (var id in gAllTopicsByID) {
    var topic = gAllTopicsByID[id];
    if (topic.title == search) {
      return topic;
    }
    allTopics.push(topic);
  }
  var containsMatch = allTopics.filter(function(topic) {
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
  return gAllTopicsByID[id];
}
