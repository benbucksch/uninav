/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var renderer;
var camera;
var scene;
var rootN;
var highlightedN; // the current tile, which is highlighted and all its ancestors


function onLoad() {
  createScene();
  createHighlightTile();
  rootN = addTile(null, "Root", "");
  rootN.position.y = 1.5;
  addTile(rootN, "Politics", "img/politics.jpg");
  addTile(rootN, "History", "img/history.jpg");
  addTile(rootN, "Business", "img/business.jpg");
  var transportN = addTile(rootN, "Transport", "img/car.jpg");
  var animalN = addTile(rootN, "Animal", "img/animal.jpg");
  addTile(rootN, "Nature", "img/nature.jpg");
  addTile(rootN, "Family", "img/family.jpg");
  addTile(transportN, "Car", "img/car.jpg");
  addTile(transportN, "Airplane", "img/airplane.jpg");
  addTile(transportN, "Train", "img/train.jpg");
  addTile(transportN, "Ship", "img/ship.jpg");

  showChildren(rootN);
  highlightTile(animalN);

  render();
}

window.addEventListener("load", onLoad, false);

function createScene() {
  var parentE = document.getElementById("navview");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30,
    parentE.clientWidth / parentE.clientHeight, 0.1, 1000);
  //camera = new THREE.OrthographicCamera(-6, 6, 2, -2, 0.1, 1000);
  camera.position.z = 3;
  camera.position.y = -4;
  camera.rotation.x = 0.8;
  if (window.WebGLRenderingContext) {
    renderer = new THREE.WebGLRenderer();
  } else {
    renderer = new THREE.CanvasRenderer();
  }
  renderer.setSize(parentE.clientWidth, parentE.clientHeight);
  parentE.appendChild(renderer.domElement);

  renderer.setClearColor(0x000000, 1); // black

  return scene;
}

/**
 * @param parentTile {THREE.Mesh} another tile created by addTile.
 *     Use |null| for root nodes.
 * @param title {String} user-visible name of the tile
 * @param imageURL {String} relative URL of the image, e.g.
 *     "img/window.png" or "/img/window.jpg"
 * @param clickCallback {Function} Called when the user
 *     clicks on the node
 * @returns {THREE.Mesh} The resulting tile node.
 *     It's already added to the scene.
 *     You need this as |parentTile| for child tiles.
 */
function addTile(parentTile, title, imageURL, hoverCallback, clickCallback) {
  var tile = new THREE.PlaneGeometry(1, 1);
  var texture = new THREE.ImageUtils.loadTexture(imageURL);
  var material = new THREE.MeshBasicMaterial({
    map : texture,
    side : THREE.FrontSide,
  });
  var node = new THREE.Mesh(tile, material);

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
      group.position.y = -1.2;
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

  return node;
}

function createHighlightTile() {
  var cube = new THREE.PlaneGeometry(1.1, 1.2);
  var material = new THREE.MeshBasicMaterial({
    color : 0xFFFF00, // yellow
  });
  var node = new THREE.Mesh(cube, material);
  //node.rotation.x = -0.9;
  scene.add(node);
  highlightN = node;
}

function highlightTile(tile) {
  var oldN = highlightedN;
  highlightedN = tile;

  highlightN.position.x = tile.position.x;
  highlightN.position.y = tile.position.y + 0.1;
  highlightN.position.z = tile.position.z - 0.1;

  highlightN.parent.remove(highlightN);
  tile.parent.add(highlightN);

  if (oldN) {
    forEachAncestor(oldN, function(oldAncestorN) {
      if ( !isAncestor(oldAncestorN, highlightedN)) {
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
}

function hideChildren(parentTile) {
  if (parentTile && parentTile.childGroup) {
    parentTile.remove(parentTile.childGroup);
  }
}

function render() {
  requestAnimationFrame(render);
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

function onMouseClick(event) {
  var canvasE = event.target;
  var curE = canvasE;
  var offsetX = 0, offsetY = 0;
  do {
      offsetX += curE.offsetLeft - curE.scrollLeft;
      offsetY += curE.offsetTop - curE.scrollTop;
  } while (curE = curE.offsetParent)
  var mouseX = event.clientX - offsetX;
  var mouseY = event.clientY - offsetY;
  var mouseVec = new THREE.Vector3();
  mouseVec.x = 2 * (mouseX / canvasE.clientWidth) - 1;
  mouseVec.y = 1 - 2 * (mouseY / canvasE.clientHeight);

  var allTiles = allChildren();

  var projector = new THREE.Projector();
  var raycaster = projector.pickingRay(mouseVec.clone(), camera);
  var intersections = raycaster.intersectObjects(allChildren());
  if (intersections.length == 0) {
    return;
  }
  var nearestTile = intersections[0].object;
  highlightTile(nearestTile);
}
window.addEventListener("mousemove", onMouseClick, false);

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
 * @param test {Boolean}
 * @param errorMsg {String}
 */
function assert(test, errorMsg) {
  errorMsg = errorMsg || "assertion failed";
  if ( !test) {
    alert(errorMsg);
  }
}
