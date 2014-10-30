/**
 * This is the SceneJS implementation of UniNav
 * (just the view in MVC).
 *
 * It uses tiles or 3D models to represent topics.
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

            nodes: [{
                type: "geometry/box"
            }],
        }],
    }],
  });
  gScene.getNode("camera", function(n) { gCamera = n; });
}

function cameraLookAt(node) {
  gCamera.setLook(node);
}

function SceneObj(topic, parentObj) {
  Obj3D.call(this, topic, parentObj);
  this._create();
}
SceneObj.prototype = {
  /**
   * Group (in Scene) that contains all the child objects.
   */
  childGroup : null,

  _create : function() {
    if (this.parent) {
      var group = this.parent.childGroup || null;
      if ( !group) {
        //TODO
      }
      // TODO

      group.add(this.mesh);
    } else {
      scene.add(this.mesh);
    }
  },

  showChildren : function() {
    this._addChildren();
    if (this.childGroup) {
      this.mesh.add(this.childGroup); // TODO this.parent.mesh?
    }
  },

  hideChildren : function() {
    if (this.childGroup) {
      this.mesh.remove(this.childGroup);
      this.childGroup = null;

      // for pos2DTo3DObject()
      this.children.forEach(function(child) {
        arrayRemove(gAllMeshes, child.mesh);
      });
      this.children = [];
    }
  },

  // TODO move to |Object3D|, but need current ctor this.__proto__.call()
  _addChildren : function() {
    if (this.children && this.children.length > 0) {
      return; // already added
    }
    if ( ! this.topic.children || ! this.topic.children.length) {
      return; // no children
    }

    var parentTile = this;
    this.topic.children.forEach(function(childTopic) {
      var childNode = new ThreeTile(childTopic, parentTile);
    });
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

function render(time) {
  requestAnimationFrame(render);
  //renderer.render(scene, camera);
}
