/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var rootObj;
var highlightedN; // the current tile, which is highlighted and all its ancestors. The user had hovered over this.
var selectedN; // the tile which topic is shown in the main pane. The user had clicked on it.

function onLoad() {
  createScene(document.getElementById("uninav"));
  render();

  showRoot(function(rootObj) {
    rootObj = rootObj;
    showChildren(rootObj);
    var startN = rootN.childTiles[0];
    assert(startN, "Start node not found. Taxonomy file broken?");
    highlightTile(startN);
    setTimeout(function() { // HACK
      cameraLookAt(startN);
    }, 100);

    renderer.domElement.addEventListener("mousemove", onMouseMove, false);
    renderer.domElement.addEventListener("click", onMouseClick, false);
  }, errorCritical);
}
window.addEventListener("load", onLoad, false);


/**
 * Loads and display the root node
 * @successCallback {Function(rootObj {Object3D})}
 */
function showRoot(successCallback, errorCallback) {
  loadRootNode(function(rootNode) {
    var rootObj = new ThreeTile(rootNode, null);
    successCallback(rootObj);
  }, errorCallback);
}




function highlightTile(tile) {
  if (tile == highlightedN || !tile) {
    return;
  }
  var oldN = highlightedN;
  highlightedN = tile;
  ddebug("hovering over " + tile.title);

  if (oldN) {
    forEachAncestor(oldN, function(oldAncestorN) {
      if ( !isAncestor(oldAncestorN, tile)) {
        removeHighlightFor(oldAncestorN);
        hideChildren(oldAncestorN);
      }
    });
  }

  createHighlightFor(tile);
  cameraLookAt(tile);
  showChildren(tile);
}

function showChildren(parentObj) {
  if ( !parentObj) {
    return;
  }
  addTilesForChildren(parentObj);
  parentObj.showChildren();
}

function hideChildren(parentObj) {
  if ( !parentObj) {
    return;
  }
  parentObj.hideChildren();
}

function addTilesForChildren(parentTile) {
  var node = parentTile.node;
  if ( !parentTile || !node || !node.children || node.children.length <= 0) {
    return;
  }
  if (parentTile.childTiles && parentTile.childTiles.length > 0) {
    return;
  }

  node.children.forEach(function(node) {
    node.tile = addTile(parentTile, node.title, node.iconURL);
    node.tile.node = node;
  });
}

function onKeyboard(event) {
  var keyCode = event.which;

  if (keyCode == 38) { // Cursor up
    changeToParent();
  } else if (keyCode == 40) { // Cursor down
    changeToChild();
  } else if (keyCode == 37) { // Cursor left
    changeToSibling(-1);
  } else if (keyCode == 39) { // Cursor right
    changeToSibling(1);
  }
}
window.addEventListener("keydown", onKeyboard, false);

function onMouseMove(event) {
  var tile = pos2DTo3DObject(event);
  if (tile && tile != highlightedN) {
    highlightTile(tile);
  }
}

function onMouseClick(event) {
  var tile = pos2DTo3DObject(event);
  if (tile && tile != selectedN) {
    openTopic(tile);

    var oldN = selectedN;
    selectedN = tile;
    tiltTile(selectedN);
    untiltTile(oldN);
  }
}

/**
 * Changes highlighted tile to another in the same hierarchy level
 * @param relPos {Integer} e.g. 1 for next, -1 for previous etc.
 */
function changeToSibling(relPos) {
  if (highlightedN && highlightedN.parentTile) {
    var siblings = highlightedN.parentTile.childTiles;
    var oldIndex = siblings.indexOf(highlightedN);
    var newIndex = oldIndex + relPos;
    if (oldIndex != -1 && newIndex >= 0 && newIndex < siblings.length) {
      highlightTile(siblings[newIndex]);
    }
  }
}

function changeToParent() {
  if (highlightedN && highlightedN.parentTile) {
    if ( !highlightedN.parentTile.parentTile) {
      return; // HACK: fake root note, don't select it
    }
    highlightTile(highlightedN.parentTile);
  }
}

function changeToChild() {
  if (highlightedN && highlightedN.childTiles[0]) {
    highlightTile(highlightedN.childTiles[0]);
  }
}


/**
 * When: User clicked on a tile
 * Action: Open the DU topic in the content pane
 */
function openTopic(tile) {
  var node = tile.node;
  var target = window.parent;
  target.openTopic(node);
  //target.postMessage(node, "http://www.manyone.zone");
}
