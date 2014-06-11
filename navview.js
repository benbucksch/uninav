/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var renderer;
var camera;
var scene;

function onLoad() {
  createScene();
  //addTile(null, "Earth", "img/car.jpg");
  addTile(null, "Car", "img/car.jpg");
  render();
}

window.addEventListener("load", onLoad, false);

function createScene() {
  var parentE = document.getElementById("navview");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30,
    parentE.clientWidth / parentE.clientHeight, 0.1, 1000);
  camera.position.z = 5;
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
  node.rotation.x = -0.9;
  scene.add(node);
}

function render() {
  requestAnimationFrame(render);
  //cube.rotation.x += 0.1; cube.rotation.y += 0.1;
  renderer.render(scene, camera);
}
