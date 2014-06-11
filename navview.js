var renderer;
var camera;
var scene;

function onLoad() {
  createScene();
  addTile(scene);
  render();
}

window.addEventListener("load", onLoad, false);

function createScene() {
  var parentE = document.getElementById("navview");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75,
    parentE.clientWidth / parentE.clientHeight, 0.1, 1000);
  camera.position.z = 5;
  if (window.WebGLRenderingContext) {
    renderer = new THREE.WebGLRenderer();
  } else {
    renderer = new THREE.CanvasRenderer();
  }
  renderer.setSize(parentE.clientWidth, parentE.clientHeight);
  parentE.appendChild(renderer.domElement);
  return scene;
}

function addTile(parentN) {
  var geometry = new THREE.CubeGeometry(1, 1, 1);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  var cube = new THREE.Mesh(geometry, material);
  parentN.add(cube);
}

function render() {
  requestAnimationFrame(render);
  //cube.rotation.x += 0.1; cube.rotation.y += 0.1;
  renderer.render(scene, camera);
}
