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

  rootN = addTile(null, "", "");
  rootN.position.y = 1.6;
  addTile(rootN, "Politics", "img/politics.jpg");
  addTile(rootN, "History", "img/history.jpg");
  addTile(rootN, "Business", "img/business.jpg");
  var transportN = addTile(rootN, "Transport", "img/car.jpg");
  var animalN = addTile(rootN, "Animal", "img/animal.jpg");
  addTile(rootN, "Nature", "img/nature.jpg");
  addTile(rootN, "Family", "img/family.jpg");
  var carN = addTile(transportN, "Car", "img/car.jpg");
  addTile(transportN, "Airplane", "img/airplane.jpg");
  addTile(transportN, "Train", "img/train.jpg");
  addTile(transportN, "Ship", "img/pirates.jpg");
  addTile(carN, "Mercedes 300 SL", "img/car.jpg");
  addTile(carN, "Tesla", "img/tesla.jpg");
  addTile(carN, "Aston Martin", "img/astonmartin.jpg");
  addTile(carN, "Corvette 1958", "img/corvette1958.jpg");

  showChildren(rootN);
  highlightTile(animalN);

  render();
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
  var pos = tile.position;
  var tileSize = 1;
  var borderSize = 0.05;
  var x1 = pos.x - tileSize/2 - borderSize;
  var x2 = pos.x + tileSize/2 + borderSize;
  var y1 = pos.y - tileSize/2 - borderSize;
  var y2 = pos.y + tileSize/2 + borderSize;
  /*var x1 = pos.x - borderSize;
  var x2 = pos.x + tileSize + borderSize;
  var y1 = pos.y - borderSize;
  var y2 = pos.y + tileSize + borderSize;*/
  var z = pos.z;
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
  tile.parent.add(node);
  tile.highlightN = node;
}

function removeHighlightFor(tile) {
  tile.parent.remove(tile.highlightN);
}

function highlightTile(tile) {
  if (tile == highlightedN) {
    return;
  }
  var oldN = highlightedN;
  highlightedN = tile;

  createHighlightFor(tile);

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
  // http://soledadpenades.com/articles/three-js-tutorials/object-picking/
  // http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
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
 * @param test {Boolean}
 * @param errorMsg {String}
 */
function assert(test, errorMsg) {
  errorMsg = errorMsg || "assertion failed";
  if ( !test) {
    alert(errorMsg);
  }
}
