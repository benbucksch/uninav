/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var renderer;
var camera;
var scene;
var gAllMeshes = []; // for pos2DTo3DObject() only

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
  //ddebug("camera pos x,y,z = " + camera.position.x + "," + camera.position.y + "," + camera.position.z);

  scene.onMouseClick = function(listener) {
    assert(typeof(listener) == "function");
    renderer.domElement.addEventListener("click", function(event) {
      try {
        var obj3D = pos2DTo3DObject(event);
        listener(obj3D);
      } catch (e) { errorCritical(e); }
    }, false);
  };
  scene.onMouseMove = function(listener) {
    assert(typeof(listener) == "function");
    renderer.domElement.addEventListener("mousemove", function(event) {
      try {
        var obj3D = pos2DTo3DObject(event);
        listener(obj3D);
      } catch (e) { errorCritical(e); }
    }, false);
  };

  render();
  return scene;
}


/**
 * @param tile {ThreeTile}
 */
function cameraLookAt(tile) {
  var tilePosition = new THREE.Vector3();
  //tile.mesh.matrixWorldNeedsUpdate = true;
  tile.mesh.updateMatrixWorld();
  tilePosition.setFromMatrixPosition(tile.mesh.matrixWorld);

  //camera.position.y = tilePosition.y + 2.5;
  var scrollTween = new TWEEN.Tween(camera.position)
              .to({ x: camera.position.x + (0.4 * (tilePosition.x - camera.position.x)),
                    y: tilePosition.y + 2.5 }, 1000)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .start();
  //ddebug(tile.title + "\ntile pos x,y,z = " + tilePosition.x + "," + tilePosition.y + "," + tilePosition.z + "\ncamera pos x,y,z = " + camera.position.x + "," + camera.position.y + "," + camera.position.z);
}


/**
 * Represents a |Topic| on the screen using a tile,
 * rendered using ThreeJS
 */
function ThreeTile(topic, parentObj) {
  Obj3D.call(this, topic, parentObj);
  this._create();
}
ThreeTile.prototype = {
  /**
   * Group (in THREE) that contains all the child objects.
   */
  childGroup : null,

  /**
   * @returns {THREE Mesh}
   */
  _create : function() {
    if (this.mesh) {
      return this.mesh;
    }
    var plane = new THREE.PlaneGeometry(1, 1);
    var texture = new THREE.ImageUtils.loadTexture(this.topic.iconURL);
    var material = new THREE.MeshBasicMaterial({
      map : texture,
      side : THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(plane, material);

    var label = make2DText(this.topic.title);
    label.position.set(0, -0.6, 0);
    this.label = label;
    this.mesh.add(label);

    // for pos2DTo3DObject() only
    this.mesh.obj3D = this;
    gAllMeshes.push(this.mesh);

    return this.mesh;
  },

  /**
   * Add a child obj of this obj, for |Topic|
   * @param childTopic {Topic}
   */
  makeChild : function(childTopic) {
    assert(arrayContains(this.topic.children, childTopic),
        childTopic.title + " isn't a child topic of " + this.topic.title);
    return new ThreeTile(childTopic, this);
  },

  showChildren : function() {
    this._addChildren();
  },

  hideChildren : function() {
    if (this.childGroup) {
      this.mesh.remove(this.childGroup);
      this.childGroup = null;

      // for pos2DTo3DObject()
      this.children.forEach(function(child) {
        arrayRemove(gAllMeshes, child.mesh);
      });
      this.children = []; // TODO: keep them? If so, adapt _addChildren()
    }
  },

  // TODO move to |Object3D|
  _addChildren : function() {
    if (this.childGroup) {
      return; // already added
    }
    /*if (this.children && this.children.length > 0) {}*/
    if ( ! this.topic.children || ! this.topic.children.length) {
      return; // no children
    }

    var parent = this;
    this.children = this.topic.children.map(function(childTopic) {
      return parent.makeChild(childTopic);
    });
    this.childGroup = arrangeBelow(this, this.children);
  },

  select : function() {
    this.tilt();
  },
  unselect : function() {
    this.untilt();
  },

  /**
   * Action: orient tile so that it faces directly into camera,
   * orthogonally, so that the image is displayed like in 2D.
   * When: user clicked on tile
   */
  tilt : function() {
    this.oldRotation = this.mesh.rotation.clone();
    //tile.rotation.copy(camera.rotation);
    var tiltTween = new TWEEN.Tween(this.mesh.rotation)
              .to({ x : camera.rotation.x }, 1000)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .start();

    // HACK: Move dependent objs, too. Correct: Re-organize scene graph
    this.oldLabelRotation = this.label.rotation.clone();
    var textTween = new TWEEN.Tween(this.label.rotation)
              .to({ x : 0 }, 1000)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .start();
  },

  /**
   * Action: Undo tilt()
   * When: user clicked on another tile
   */
  untilt : function() {
    if ( !this.oldRotation) {
      return;
    }
    var self = this;
    //this.mesh.rotation.copy(this.oldRotation);
    var tiltTween = new TWEEN.Tween(this.mesh.rotation)
              .to({ x : self.oldRotation.x }, 250)
              .start();
    this.oldRotation = null;
    //this.label.rotation.copy(this.oldLabelRotation);
    var textTween = new TWEEN.Tween(this.label.rotation)
              .to({ x : self.oldLabelRotation.x }, 250)
              .start();
    this.oldLabelRotation = null;
  },

  /**
  * Creates an obj that highlights |this| obj.
  */
  highlight : function() {
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
    var mesh = new THREE.Line(line, material);
    this.mesh.add(mesh);
    this._highlightMesh = mesh;
  },

  removeHighlight : function() {
    if ( !this._highlightMesh) {
      return;
    }
    this.mesh.remove(this._highlightMesh);
    this._highlightMesh = null;
  },

}
extend(ThreeTile, Obj3D);

/**
 * @param tile {ThreeTile}
 */
function setRootObj(tile) {
  scene.add(tile._create());
}

/**
 * @param parentObj {ThreeTile}
 * @param childObjs {Array of {ThreeTile}}
 * @returns {THREE Object3D}
 */
function arrangeBelow(parentObj, childObjs) {
  const centerAround = 0;
  const itemWidth = 1;
  const paddingWidth = 0.2;

  var group = new THREE.Object3D();
  group.position.x = centerAround - (childObjs.length * (itemWidth + paddingWidth) - paddingWidth) / 2;
  group.position.y = -1.5;
  group.position.z = 0;

  var i = 0;
  childObjs.forEach(function(childObj) {
    var mesh = childObj._create();
    mesh.position.x = i++ * (itemWidth + paddingWidth);
    group.add(mesh);
  });
  parentObj.mesh.add(group); // TODO this.parent.mesh?
  return group;
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
  var intersections = raycaster.intersectObjects(gAllMeshes);
  if (intersections.length == 0) {
    return;
  }
  var meshClicked = intersections[0].object;
  return meshClicked.obj3D;
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
 * Creates a 3D obj with 2D text.
 * It uses <canvas> to render text to an image,
 * then puts that image as texture on a new 3D object.
 *
 * @returns {THREE.Mesh} A 3D obj with no depth
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
  var mesh = new THREE.Mesh(plane, material);
  mesh.rotation.copy(camera.rotation);

  /* Black background
  var bgmaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
  });
  var bgplane = new THREE.PlaneGeometry(1, 0.6);
  var bgmesh = new THREE.Mesh(bgplane, bgmaterial);
  mesh.add(bgmesh);
  */

  return mesh;
}
