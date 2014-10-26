/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

/**
 * @param tile {Tile}
 *     if null, return all tiles
 * @returns {Array of Tile} all children of |tile|, not including |tile|
 */
function allChildren(tile) {
  tile = tile || rootN;
  var result = [];
  tile.childTiles.forEach(function(child) {
    result.push(child);
    result = result.concat(allChildren(child));
  });
  return result;
}

/**
 * @param ancestor {Tile}
 * @param callback {Function(child {Tile})} Called for each ancestor
 */
function forEachAncestor(ancestor, callback) {
  for (var cur = ancestor; cur.parentTile; cur = cur.parentTile) {
    callback(cur);
  }
}

/**
 * @param ancestor {Tile}
 * @param child {Tile}
 * @returns {boolean} |ancestor| is an ancestor of |child|
 */
function isAncestor(ancestor, child) {
  for (var cur = child; cur.parentTile; cur = cur.parentTile) {
    if (cur.parentTile == ancestor) {
      return true;
    }
  }
  return false;
}

/**
 * Loads taxnomy from JSON and creates all tiles
 * @successCallback {Function(rootTile)}
 */
function loadAllTiles(taxonomyURL, successCallback, errorCallback) {
  loadTaxonomyJSON(taxonomyURL, function(rootNode, allByID) {
    var rootTile = addTile(null, rootNode.title, imageRootURL + rootNode.img);
    rootTile.node = rootNode;
    addTilesForChildren(rootTile);
    successCallback(rootTile);
  }, errorCallback);
}

/**
 * Loads taxonomy from JSON file
 * @param url {String} relative URL to the JSON file
 * @param resultCallback {Function(rootNode, allByID)} Called when server returned
 * rootNode {Node} just the root node, with |children|
 * allByID {Array of Node} with index == ID, all nodes
 * Node {
 *   id {Integer}, ID of node
 *   title {String},
 *   img {String}, image filename, relative to special image path
 *   parents {Array of Node},
 *   children {Array of Node},
 * }
 * @param errorCallback {Function(e)} Called when there was an error
 *    Either resultCallback() or errorCallback() will be called.
 */
function loadTaxonomyJSON(url, resultCallback, errorCallback) {
  // util.js
  loadURL({ url: url, dataType: "json" }, function(allNodes) {
    // array -> map
    var allByID = {};
    allNodes.forEach(function(node) {
      assert(node.id, "ID missing");
      assert(node.title, "Title missing");
      //assert(node.img, "Image missing");
      if (allByID[node.id]) { // TODO fix taxonomy
        assert(false, "Node ID " + node.id + " appears twice. " +
            allByID[node.id].title + " and " + node.title);
      }
      allByID[node.id] = node;
    });
    // resolve ID -> obj
    allNodes.forEach(function(node) {
      node.parents = node.parentIDs.map(function(id) { return allByID[id]; });
      node.children = node.childrenIDs.map(function(id) { return allByID[id]; });
    });
    var rootNode = allByID["root"];
    ddebug(dumpObject(rootNode, "root", 5));
    resultCallback(rootNode, allByID);
  }, errorCallback);
}
