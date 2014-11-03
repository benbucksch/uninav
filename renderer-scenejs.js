/**
 * This is the SceneJS implementation of UniNav
 * (just the view in MVC).
 *
 * It uses tiles or 3D models to represent topics.
 *
 * There are 3 types of objects and hierarchies here:
 * - |Topic|s from data.js
 * - |Obj3D| and |SceneObj| here
 * - SceneJS |Node|
 * A |Topic| is represented by one (1) |SceneObj|, and a
 * |SceneObj| uses a SceneJS |Node| subtree to render itself.
 * The |SceneObj| holds references to both |Topic| and SceneJS |Node|.
 *
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
 */

var gScene;
var gCamera;

function createScene(parentE) {
  SceneJS.setConfigs({
    pluginPath: "./lib/scenejs-plugins/"
  });
  gScene = SceneJS.createScene({
    nodes: [{
        type: "material",
        id: "black",
        color: { r: 0, g: 0, b: 0, },

        nodes: [{
            type: "cameras/pickFlyOrbit",
            id: "camera",
            look: { x: 0, y:150, z: 0 }, // what to look at (POI)
            // pos y: 2.25, z: 4.0,
            // rotate x: -0.6,
            yaw: -40, // degrees of rotation around POI on Y axis
            pitch: -20, // degrees of rotation around POI on X axis
            zoom: 80, // distance from POI
            zoomSensitivity: -5.0, // mouse wheel multiplier
            showCursor: false, // show dot on object when clicked

            nodes: [],
        }],
    }],
  });
  gScene.getNode("camera", function(n) { gCamera = n; });
}

/**
 * @param obj {SceneObj}
 */
function cameraLookAt(obj) {
  if ( !gCamera) { return; }
  gCamera.setLook(obj.node);
}

function SceneObj(topic, parent) {
  Obj3D.call(this, topic, parent);
}
SceneObj.prototype = {
  /**
   * {SceneJS node, already added to scene}
   */
  node : null,
  /**
   * Group (in Scene) that contains all the child objects.
   */
  childGroup : null,

  /**
   * @param parentNode {SceneJS Node}
   */
  addNodeTo : function(parentNode) {
    var self = this;
    return this.node = parentNode.addNode({
        type: "translate",
        x: -3.0,
        y: 1.0,
        z: 5.0,

        nodes: [{
            type: "texture",
            src: self.topic.iconURL,
            nodes: [{
                type: "geometry/plane",
                width: 1,
                height: 1,
                widthSegments: 1,
                heightSegments: 1,
            }],
        }],
    });
  },

  showChildren : function() {
    this._addChildren();
  },

  hideChildren : function() {
    if (this.childGroup) {
      this.childGroup.destory();
      this.childGroup = null;
      this.children = []; // TODO: keep them? If so, adapt _addChildren()
    }
  },

  // TODO move to |Object3D|, but need current ctor this.__proto__.call()
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
      return new SceneObj(childTopic, parent);
    });
    this.childGroup = arrangeBelow(this, this.children);
  },

  select : function() {
  },
  unselect : function() {
  },

  /**
  * Creates an obj that highlights |this| obj.
  */
  highlight : function() {
  },

  removeHighlight : function() {
  },

}
extend(SceneObj, Obj3D);

/**
 * @param obj {SceneObj}
 */
function setRootObj(obj) {
  node.addNodeTo(gScene);
}

/**
 * @param parentObj {SceneObj}
 * @param childObjs {Array of {SceneObjs}}
 * @returns {SceneJS Node}
 */
function arrangeBelow(parentObj, childObjs) {
  const centerAround = 0;
  const itemWidth = 1;
  const paddingWidth = 0.2;
  var group = parentObj.node.addNode({
    type: "translate",
    x: centerAround - (childObjs.length * (itemWidth + paddingWidth) - paddingWidth),
    y: -1.5,
    z: 0,
    nodes: [],
  });
  var i = 0;
  childObjs.forEach(function(childObj) {
    var position = {
      type: "translate",
      x: i++ * (itemWidth + paddingWidth),
      y: 0,
      z: 0,
      nodes: [],
    };
    childObj.addNodeTo(position);
    group.addNode(position);
  });
  return group;
}

function render(time) {
  requestAnimationFrame(render);
  //renderer.render(scene, camera);
}
