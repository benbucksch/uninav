/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var renderer;
var camera;
var scene;
var rootN;
var highlightedN; // the current tile, which is highlighted and all its ancestors. The user had hovered over this.
var selectedN; // the tile which topic is shown in the main pane. The user had clicked on it.
const imageRootURL = "";


function onLoad() {
  createScene();
  render();

  loadAllTiles("taxonomy.json", function(aRootN) {
    rootN = aRootN;
    showChildren(rootN);
    var animalN = rootN.childTiles[4];
    highlightTile(animalN);
    setTimeout(function() { // HACK
      cameraLookAt(animalN);
    }, 100);

    renderer.domElement.addEventListener("mousemove", onMouseMove, false);
    renderer.domElement.addEventListener("click", onMouseClick, false);
  }, errorCritical);
}

window.addEventListener("load", onLoad, false);

function createScene() {
  var parentE = document.getElementById("uninav");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30,
    parentE.clientWidth / parentE.clientHeight, 0.1, 1000);
  //camera = new THREE.OrthographicCamera(-6, 6, 2, -2, 0.1, 1000);
  camera.position.z = 4;
  camera.position.y = 2.25;
  camera.rotation.x = -0.6;
  if (window.WebGLRenderingContext) {
    renderer = new THREE.WebGLRenderer({ antialiasing: true });
  } else {
    renderer = new THREE.CanvasRenderer();
  }
  renderer.setSize(parentE.clientWidth, parentE.clientHeight);
  parentE.appendChild(renderer.domElement);

  renderer.setClearColor(0x000000, 1); // black
  ddebug("camera pos x,y,z = " + camera.position.x + "," + camera.position.y + "," + camera.position.z);

  return scene;
}


function cameraLookAt(tile) {
  var tilePosition = new THREE.Vector3();
  //tile.matrixWorldNeedsUpdate = true;
  tile.updateMatrixWorld();
  tilePosition.setFromMatrixPosition(tile.matrixWorld);

  //camera.position.y = tilePosition.y + 2.5;
  var scrollTween = new TWEEN.Tween(camera.position)
              .to({ y: tilePosition.y + 2.5 }, 1000)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .start();
  //ddebug(tile.title + "\ntile pos x,y,z = " + tilePosition.x + "," + tilePosition.y + "," + tilePosition.z + "\ncamera pos x,y,z = " + camera.position.x + "," + camera.position.y + "," + camera.position.z);
}

/**
 * @param parentTile {THREE.Mesh} another tile created by addTile.
 *     Use |null| for root nodes.
 * @param title {String} user-visible name of the tile
 * @param imageURL {String} relative URL of the image, e.g.
 *     "img/window.png" or "/img/window.jpg"
 * @returns {THREE.Mesh} The resulting tile node.
 *     It's already added to the scene.
 *     You need this as |parentTile| for child tiles.
 */
function addTile(parentTile, title, imageURL) {
  var plane = new THREE.PlaneGeometry(1, 1);
  var texture = new THREE.ImageUtils.loadTexture(imageURL);
  var material = new THREE.MeshBasicMaterial({
    map : texture,
    side : THREE.FrontSide,
  });
  var node = new THREE.Mesh(plane, material);

  node.title = title;
  node.imageURL = imageURL;
  node.childTiles = [];
  node.parentTile = parentTile;

  if (parentTile) {
    parentTile.childTiles.push(node);

    var group = parentTile.childGroup || null;
    if ( !group) {
      parentTile.childGroup = group = new THREE.Object3D();
      group.centerAround = 0;
      group.position.x = 0; // centered below
      group.position.y = -1.3;
      group.position.z = 0;
      // parentTile.add(group); -- done in showChildren()
    }
    node.position.x = parentTile.childTiles.length * 1.2;
    var groupWidth = node.position.x + 1;
    group.position.x = group.centerAround - groupWidth / 2;

    group.add(node);
  } else {
    scene.add(node);
  }

  var label = make2DText(title);
  label.position.set(0, -0.6, 0);
  node.label = label;
  node.add(label);

  return node;
}

/**
 * Creates a node that highlights another node.
 *
 * @returns {THREE.Mesh} a node that highlights
 *    the given tile. It's already added to the scene.
 */
function createHighlightFor(tile) {
  var tileSize = 1;
  var borderSize = 0.05;
  var x1 = - tileSize/2 - borderSize;
  var x2 = tileSize/2 + borderSize;
  var y1 = - tileSize/2 - borderSize;
  var y2 = tileSize/2 + borderSize;
  var z = 0;
  var line = new THREE.Geometry();
  line.vertices.push(new THREE.Vector3(x1, y1, z));
  line.vertices.push(new THREE.Vector3(x1, y2, z));
  line.vertices.push(new THREE.Vector3(x2, y2, z));
  line.vertices.push(new THREE.Vector3(x2, y1, z));
  line.vertices.push(new THREE.Vector3(x1, y1, z));
  line.computeLineDistances();
  var material = new THREE.LineBasicMaterial({
    color : 0xFFFF00, // yellow
  });
  var node = new THREE.Line(line, material);
  tile.add(node);
  tile.highlightN = node;
}

function removeHighlightFor(tile) {
  tile.remove(tile.highlightN);
}

function highlightTile(tile) {
  if (tile == highlightedN) {
    return;
  }
  var oldN = highlightedN;
  highlightedN = tile;

  createHighlightFor(tile);
  cameraLookAt(highlightedN);

  if (oldN) {
    forEachAncestor(oldN, function(oldAncestorN) {
      if ( !isAncestor(oldAncestorN, highlightedN)) {
        removeHighlightFor(oldAncestorN);
        hideChildren(oldAncestorN);
      }
    });
  }

  showChildren(highlightedN);
}

function showChildren(parentTile) {
  if (parentTile && parentTile.childGroup) {
    parentTile.add(parentTile.childGroup);
  }
  if (parentTile && parentTile.node &&
      parentTile.node.children && parentTile.node.children.length > 0) {
    addTilesForChildren(parentTile.node, parentTile);
  }
}

function hideChildren(parentTile) {
  if (parentTile && parentTile.childGroup) {
    parentTile.remove(parentTile.childGroup);
  }
}

/**
 * Action: orient tile so that it faces directly into camera,
 * orthogonally, so that the image is displayed like in 2D.
 * When: user clicked on tile
 */
function tiltTile(tile) {
  tile.oldRotation = tile.rotation.clone();
  //tile.rotation.copy(camera.rotation);
  var tiltTween = new TWEEN.Tween(tile.rotation)
            .to({ x : camera.rotation.x }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

  // HACK: Move dependent nodes, too. Correct: Re-organize scene graph
  tile.label.oldRotation = tile.label.rotation.clone();
  var textTween = new TWEEN.Tween(tile.label.rotation)
            .to({ x : 0 }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
}

/**
 * Action: Undo tileTile()
 * When: user clicked on another tile
 */
function untiltTile(tile) {
  if ( !tile || !tile.oldRotation) {
    return;
  }
  //tile.rotation.copy(tile.oldRotation);
  var tiltTween = new TWEEN.Tween(tile.rotation)
            .to({ x : tile.oldRotation.x }, 250)
            .start();
  tile.oldRotation = null;
  //tile.label.rotation.copy(tile.label.oldRotation);
  var textTween = new TWEEN.Tween(tile.label.rotation)
            .to({ x : tile.label.oldRotation.x }, 250)
            .start();
  tile.label.rotation = null;
}

function render(time) {
  requestAnimationFrame(render);
  TWEEN.update(time);
  renderer.render(scene, camera);
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
 * @param event {DOMEvent} mouse move/click
 */
function pos2DTo3DObject(event) {
  // http://soledadpenades.com/articles/three-js-tutorials/object-picking/
  // http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
  var canvasPos = elementPos(event.target);
  var mouseVec = new THREE.Vector3();
  mouseVec.x = 2 * ((event.clientX - canvasPos.x) / canvasPos.width) - 1;
  mouseVec.y = 1 - 2 * ((event.clientY - canvasPos.y) / canvasPos.height);

  var projector = new THREE.Projector();
  var raycaster = projector.pickingRay(mouseVec.clone(), camera);
  var intersections = raycaster.intersectObjects(allChildren());
  if (intersections.length == 0) {
    return;
  }
  return intersections[0].object;
}

/**
 * @returns {
 *   x {Integer} Pixels from left of page
 *   y {Integer} Pixels from top of page
 *   width {Integer} width of element (not yet implemented)
 *   height {Integer} height of element (not yet implemented)
 * }
 */
function elementPos(element) {
  var curE = element;
  var offsetX = 0, offsetY = 0;
  do {
      offsetX += curE.offsetLeft - curE.scrollLeft;
      offsetY += curE.offsetTop - curE.scrollTop;
  } while (curE = curE.offsetParent)
  return {
    x : offsetX,
    y : offsetY,
    width : element.clientWidth,
    height : element.clientHeight
  };
}

/**
 * Creates a 3D node with 2D text.
 * It uses <canvas> to render text to an image,
 * then puts that image as texture on a new 3D object.
 *
 * @returns {THREE.Mesh} A 3D node with no depth
 */
function make2DText(text)
{
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  ctx.font = "30pt Arial";
  ctx.fillStyle = "white";
  //var width = ctx.measureText(text, 0, 0).width;
  ctx.fillText(text, 0, 100);

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
  });
  material.transparent = true;
  var plane = new THREE.PlaneGeometry(1, 0.6);
  var node = new THREE.Mesh(plane, material);
  node.rotation.copy(camera.rotation);

  /* Black background
  var bgmaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
  });
  var bgplane = new THREE.PlaneGeometry(1, 0.6);
  var bgnode = new THREE.Mesh(bgplane, bgmaterial);
  node.add(bgnode);
  */

  return node;
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
 * @returns {boolean} |parent| is an ancestor of |child|
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
    var rootTile = addTile(null, "", "");
    rootTile.node = rootNode;
    addTilesForChildren(rootNode, rootTile);
    successCallback(rootTile);
  }, errorCallback);
}

function addTilesForChildren(node, parentTile) {
  node.children.forEach(function(node) {
    node.tile = addTile(parentTile, node.title, imageRootURL + node.img);
    node.tile.node = node;
  });
}

/**
 * Loads taxonomy from JSON file
 * @param url {String} relative URL to the JSON file
 * @param resultCallback {Function(rootNodes, allByID)} Called when server returned
 * rootNodes {Array of Node} just the root nodes, each with |children|
 * allByID {Array of Node} with index == ID, all nodes
 * Node {
 *   id {Integer}, ID of node
 *   title {String},
 *   img {String}, image filename, relative to special image path
 *   parent {Node},
 *   children {Array of Node},
 * }
 * @param errorCallback {Function(e)} Called when there was an error
 *    Either resultCallback() or errorCallback() will be called.
 */
function loadTaxonomyJSON(url, resultCallback, errorCallback) {
  // util.js
  loadURL(url, "json", function(rootNode) {
    var allByID = [];
    function addAll(nodes) {
      nodes.forEach(function(node) {
        assert(node.id, "ID missing");
        assert(node.title, "Title missing");
        assert(node.img, "Image missing");
        if (allByID[node.id])
        assert( !allByID[node.id], "Node ID " + node.id + " appears twice. " +
              allByID[node.id].title + " and " + node.title);
        allByID[node.id] = node;
        if (node.parent) {
          node.parent = allByID[node.parent];
          assert(node.parent, "Node ID " + node.id + " " + node.title +
                " has not (yet) existing parent ID " + node.parent);
          node.parent.children.push(node);
        } else if (node.parent === 0) {
          rootNodes.push(node);
        }
        if (node.children && node.children.length > 0) {
          addAll(node.children);
        } else {
          node.children = [];
        }
      });
    }
    addAll(rootNode.children);
    resultCallback(rootNode, allByID);
  }, errorCallback);
}


/**
 * When: User clicked on a tile
 * Action: Open the DU topic in the content pane
 */
function openTopic(tile) {
  var target = window.parent;
  target.openTopic(tile);
  //target.postMessage(tile, "http://www.manyone.zone");
}
