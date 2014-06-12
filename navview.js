/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var renderer;
var camera;
var scene;
var highlightN;

function onLoad() {
  createScene();
  createHighlightTile();
  //addTile(null, "Earth", "img/car.jpg");
  var transportN = addTile(null, "Transport", "img/car.jpg");
  highlightTile(transportN);
  addTile(null, "Animal", "img/animal.jpg").position.x = 1.2;
  addTile(null, "Nature", "img/nature.jpg").position.x = 2.4;
  addTile(null, "Family", "img/family.jpg").position.x = 3.6;
  addTile(null, "Business", "img/business.jpg").position.x = -1.2;
  addTile(null, "History", "img/history.jpg").position.x = -2.4;
  addTile(null, "Politics", "img/politics.jpg").position.x = -3.6;
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
function addTile(parentTile, title, imageURL, clickCallback) {
  var tile = new THREE.PlaneGeometry(1, 1);
  var texture = new THREE.ImageUtils.loadTexture(imageURL);
  var material = new THREE.MeshBasicMaterial({
    map : texture,
    side : THREE.FrontSide,
  });
  var node = new THREE.Mesh(tile, material);
  //node.rotation.x = -0.9;
  scene.add(node);
  return node;
}

function createHighlightTile() {
  var cube = new THREE.PlaneGeometry(1.1, 1.2);
  var material = new THREE.MeshBasicMaterial({
    color : 0xFFFF00, // red
  });
  var node = new THREE.Mesh(cube, material);
  //node.rotation.x = -0.9;
  scene.add(node);
  highlightN = node;
}

function highlightTile(tile) {
  highlightN.position.x = tile.position.x;
  highlightN.position.y = tile.position.y + 0.1;
  highlightN.position.z = tile.position.z - 0.1;
}

function render() {
  requestAnimationFrame(render);
  //cube.rotation.x += 0.1; cube.rotation.y += 0.1;
  renderer.render(scene, camera);
}
