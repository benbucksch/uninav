/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var renderer;
var camera;
var scene;

/* text settings */
var wrapLength = 10;
var labelTextColor = "#ddeeff";
var labelTextShadowColor = "#112233";
var labelTextShadowBlur = 40;

function createScene(parentE) {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30,
    parentE.clientWidth / parentE.clientHeight, 0.1, 1000);
  //camera = new THREE.OrthographicCamera(-6, 6, 2, -2, 0.1, 1000);
  camera.position.z = 4;
  camera.position.y = 2.25;
  camera.rotation.x = -0.6;
  camera.rotationBaseX = -0.6;
  camera.rotationBaseY = 0;
  camera.rotationBaseZ = 0;
  if (window.WebGLRenderingContext) {
    try {
      renderer = new THREE.WebGLRenderer({ antialiasing: true, alpha: true });
    } catch (e) {
      renderer = new THREE.CanvasRenderer();
    }
  } else {
    renderer = new THREE.CanvasRenderer();
  }
  renderer.setSize(parentE.clientWidth, parentE.clientHeight);
  parentE.appendChild(renderer.domElement);

  renderer.setClearColor(0x000000, 0); // transparent
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
              .to({ x: camera.position.x + (0.4 * (tilePosition.x - camera.position.x)),
                    y: tilePosition.y + 2.5 }, 1000)
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
      group.position.y = -1.5;
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
function make2DText(text) {
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  ctx.font = "bold 42pt Arial";
  // detect size of incoming text
  // this is all really rickety and not good
  if (text.length > wrapLength) {
    // break text and attempt wrap at index
    // find convenient space or force hyphen replace
    // search for last space before desired break, if no space-> hyphen
    var idx = text.search(" ");
    if (idx !== -1 && idx <= wrapLength) {
      // found space, make sure it is the closest to break
      var oldIdx = idx;
      do {
        oldIdx = idx;
        idx = text.indexOf(" ", oldIdx + 1);
      } while (idx !== -1 && idx <= wrapLength);
      var text01 = text.substring(0, oldIdx);
      var text02 = text.substring(oldIdx, text.length);
    } else {
      // no space, use hyphen
      var text01 = text.substring(0, idx) + "-";
      var text02 = text.substring(idx, text.length);
    }
    var compensate = Math.floor((wrapLength - oldIdx) / 2);
    var spaces = " ";
    for (var i = 0; i < compensate; i++) {
      spaces += spaces;
    }
    text01 = spaces + text01;
    /* ctx.fillStyle = 'rgb(64,64,64)';
    ctx.fillText(text01, 2, 102);
    ctx.fillText(text02, 2, 142); */

    //var width = ctx.measureText(text, 0, 0).width;
    ctx.fillStyle = labelTextColor;
    ctx.shadowColor = labelTextShadowColor;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = labelTextShadowBlur;
    ctx.fillText(text01, 0, 100);
    ctx.fillText(text02, 0, 140);
  } else {
    //var width = ctx.measureText(text, 0, 0).width;
    ctx.fillStyle = labelTextColor;
    ctx.shadowColor = labelTextShadowColor;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = labelTextShadowBlur;
    ctx.fillText(text, 2, 100);
  }

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
