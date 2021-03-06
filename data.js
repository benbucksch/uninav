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
var gAllTopicsByID = {};

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
   * {URI string or integer}
   */
  lodID : null,
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

  get parent() {
    /*if (this._parents.length == 0) {
      this._parents = this._parentIDs.map(getTopicByID);
    }*/
    return this._parents[0];
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

  /**
   * For lazy-loaded taxonomies, e.g. LOD, you must call
   * this function before this.children will be populated.
   */
  loadChildren : function(successCallback, errorCallback) {
    // implement in subclass
    successCallback();
  },

  get dbpediaID() {
    if (this.lodID && this.lodID.substr(0, 8) == "dbpedia:") {
      return this.lodID;
    }
    return dbpediaIDForTitle(this.title);
  },
}

/**
 * Loads taxonomy from triple store - RDF via SPARQL
 *
 * @topicID @see |LODTopic| ctor
 * @graphID @see |LODTopic| ctor
 * @param resultCallback {Function(topic)}   When server returned
 *     topic {Topic} The new Topic. Same as |this|. topic.id == topicID.
 * @param errorCallback {Function(e)}
 */
function loadTopicFromLOD(topicID, graphID, resultCallback, errorCallback) {
  var existing = gAllTopicsByID[topicID];
  if (existing) {
    resultCallback(existing);
    return;
  }
  var topic = new LODTopic(topicID, graphID);
  topic.loadProperties(function() {
    gAllTopicsByID[topic.id] = topic;
    resultCallback(topic);
  }, errorCallback);
}

/**
 * Loads Topic from triple store - RDF via SPARQL
 *
 * The children will not be populated, not even childrenIDs,
 * you need to call this.loadChildren() for that.
 *
 * @param topicID {URI as string} LOD identifer (URL) of the topic to load,
 *    e.g. "http://dmoz.org/rdf/cat/Top/Arts/People/"
 * @param graphID {URI as string} LOD namespace, e.g. "http://dmoz.org/rdf/"
 */
function LODTopic(topicID, graphID) {
  assert(topicID, "ID missing");
  assert(graphID, "Graph missing");
  Topic.call(this);

  this.id = this.lodID = topicID;
  this._graphID = graphID;
  this.categoryPath = topicID.replace(/.*Top\//, "");

  // Generate title from dmoz category URL
  var title = decodeURIComponent(topicID
      .replace(/\/$/, "") // strip trailing slash
      .replace(/.*\//, "")) // only last path component
      .replace(/_/g, " ") // _ is space
      .trim();
  assert(title, "Title missing");
  this.title = title;
}
LODTopic.prototype = {
  _kTopicPropertiesSPARQL :
      //"OPTIONAL { ?topic dc:title ?title } " + // dmoz has no proper one
      "OPTIONAL { ?topic dc:description ?description } " +
      "OPTIONAL { ?topic foaf:img ?iconURL } " +
      "OPTIONAL { ?topic du:explorePage ?exploreURL } " +
      "OPTIONAL { ?topic du:descriptionPage ?descriptionURL } ",
  _setPropertiesFromSPARQLResult : function(r) {
      //this.title = r.title ? r.title.trim() : null;
      this.description = r.description ? r.description.trim() : null;
      this._iconFilename = r.iconURL;
      this._exploreURL = r.exploreURL;
      this._descriptionURL = r.descriptionURL;

      this._loaded = true;
  },
  get graphID() {
    return this._graphID;
  },
  /**
   * Load properties from server
   *
   * @param resultCallback {Function(topic)}   When server returned
   *     topic {Topic} The new Topic. Same as |this|. topic.id == topicID.
   * @param errorCallback {Function(e)} Called when there was an error
   *     Either resultCallback() or errorCallback() will be called.
   */
  loadProperties : function(successCallback, errorCallback) {
    if (this._loaded) {
      successCallback();
      return;
    }
    var query = "SELECT * FROM <" + this._graphID + "> WHERE { " +
      this._kTopicPropertiesSPARQL +
    "}";
    query = query.replaceAll("?topic", "<" + this.id + ">");
    var self = this;
    sparqlSelect1(query, {}, function(r) {
      self._setPropertiesFromSPARQLResult(r);
      successCallback();
    }, errorCallback);
  },

  /**
   * Load subtopics from server
   */
  loadChildren : function(successCallback, errorCallback) {
    if (this._loadedChildren) {
      successCallback();
      return;
    }
    var self = this;
    var query = "SELECT * FROM ?graph WHERE { " +
      "{ ?parent dmoz:narrow ?topic } " +
      "UNION { ?parent dmoz:narrow1 ?topic } " +
      "UNION { ?parent dmoz:narrow2 ?topic } " +
      // Optimize: Load child properties immediately,
      // saving one server call per child.
      this._kTopicPropertiesSPARQL +
    "} LIMIT 100";
    query = query.replaceAll("?parent", "<" + this.id + ">")
        .replaceAll("?graph", "<" + this._graphID + ">");
    sparqlSelect(query, {}, function(results) {
      // Create child topic nodes from the properties we fetched
      self._children = results.map(function(r) {
        var id = r.topic;
        assert(id, "Need child topic URI");
        var existing = gAllTopicsByID[id];
        if (existing) {
          return existing;
        }
        var topic = new LODTopic(id, self._graphID);
        topic._setPropertiesFromSPARQLResult(r);
        topic._parents.push(self);
        gAllTopicsByID[topic.id] = topic;
        return topic;
      });
      self._childrenIDs = self._children.map(function(child) {
        return child.id;
      });
      self._loadedChildren = true;
      successCallback();

      /* Load children one by one:
      self._childrenIDs = results.map(function(r) {
        assert(r.child, "Need child URI");
        return r.child;
      });
      var w = new Waiter(successCallback, errorCallback);
      self._childrenIDs.forEach(function(childID) {
        var success = w.success();
        loadTopicFromLOD(childID, self._graphID, function(child) {
          self._children.push(child);
          child._parents.push(self);
          self._loadedChildren = true;
          success();
        }, w.error());
      });
      */
    }, errorCallback);
  },

  /**
   * Load ancestors from server.
   * Uses only the first parent.
   * But traverses the whole hierarchy up to root.
   *
   * You only need to call this, if this object wasn't loaded top-down
   * using loadChildren().
   */
  loadPrimaryParent : function(successCallback, errorCallback) {
    if (this._loadedParent) {
      successCallback();
      return;
    }
    assert(this.id);
    assert(this._graphID);
    var self = this;
    var query = "SELECT * FROM ?graph WHERE { " +
      " ?topic dmoz:narrow ?child " +
      // Optimize: Load parent properties immediately,
      // saving one server call
      this._kTopicPropertiesSPARQL +
    "}";
    query = query.replaceAll("?child", "<" + this.id + ">")
        .replaceAll("?graph", "<" + this._graphID + ">");
    sparqlSelect1(query, {}, function(result) {
      var parentID = result.topic;
      alert(self.id + " has parent " + parentID);
      assert(parentID, "Need parent topic URI");
      var existing = gAllTopicsByID[parentID];
      if (existing) {
        // we connected up to the existing topics, so we're done loading
        successCallback();
        return;
      }
      var parent = new LODTopic(parentID, self._graphID);
      parent._setPropertiesFromSPARQLResult(result);

      self._parents.push(parent);
      self._parentIDs.push(parent.id);
      parent._children.push(self);
      parent._childrenIDs.push(self.id);

      gAllTopicsByID[parent.id] = parent;
      self._loadedParent = true;

      parent.loadPrimaryParent(successCallback, errorCallback); // recurse up
      // recursion stop-gaps:
      // a) error handler nothing found
      // b) _loadedParent (intentionalled called before recursing)
      // expected end: existing above
    }, function(e) {
      if (e.code == 0) { // Nothing found
        // no parent = this is root
        // but root wasn't loaded yet, so that's an error anyways
        errorCallback(self.title + " goes to a root that wasn't loaded");
        return;
      }
      errorCallback(e);
    });
  },

  /**
   * Returns this topic as triples
   * @param withFamily {Boolean} include children and parents
   * @returns {Array of { s, p, o }}
   */
  saveTriples : function(withFamily) {
    var triples = [];
    var s = "<" +this.lodID + ">";
    var t = this;
    triples.push({ s : s, p : "dc:title", o : t.title });
    triples.push({ s : s, p : "dc:description", o : t.description });
    triples.push({ s : s, p : "foaf:img", o : t._iconFilename });
    triples.push({ s : s, p : "du:explorePage", o : t._exploreURL });
    triples.push({ s : s, p : "du:descriptionPage", o : t._descriptionURL });
    if (withFamily) {
      this.parents.forEach(function(parent) {
        triples.push({ s : parent.lodID, p : "dmoz:narrow", o : s });
      });
      this.children.forEach(function(parent) {
        triples.push({ s : s, p : "dmoz:narrow", o : parent.lodID });
      });
    }
    return triples;
  },
}
extend(LODTopic, Topic);


/**
 * @param resultCallback {Function(rootTopic)}
 *     rootTopic {Topic} The root node, with |children|
 */
function loadRootTopic(resultCallback, errorCallback) {
  //loadTaxonomyJSON(kTaxomonyURL, resultCallback, errorCallback)
  loadTopicFromLOD("http://dmoz.org/rdf/cat/Top", "http://dmoz.org", resultCallback, errorCallback)
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
      topic.lodID = c.lodID || dbpediaIDForTitle(c.title);
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
 * Finds a topic that is already loaded,
 * and returns the |Topic| object for the topic URI
 *
 * @param id {String} |Topic.id|
 * @returns {Topic}
 */
function findTopicByID(id) {
  return gAllTopicsByID[id];
}


/**
 * Same as findTopicByID(), but if not yet loaded,
 * loads it from the LOD graph server, including all ancestors.
 *
 * @param id {String} |Topic.id|
 * @param resultCallback {function(topic {Topic})}
 */
function loadTopicByID(id, resultCallback, errorCallback) {
  var existing = gAllTopicsByID[id];
  if (existing) {
    resultCallback(existing);
    return;
  }

  var graphID; // HACK - take graph from first existing topic
  for (var randomID in gAllTopicsByID) {
    graphID = gAllTopicsByID[randomID]._graphID;
    if (graphID) {
      break;
    }
  }

  loadTopicFromLOD(id, graphID, function(topic) {
    topic.loadPrimaryParent(function() {
      resultCallback(topic);
    }, errorCallback);
  }, errorCallback);
}
