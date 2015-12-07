/**
 * This implements TopicNav using a graph drawn in Springy
 *
 * (c) 2015 Ben Bucksch
 * License: GPL3, see LICENSE
 */

var gScene;

/**
 * Represents a |Topic| on the screen, using an icon and label.
 *
 * @param topic {Topic}
 * @param parentObj {Obj3D}  where to add this to as child
 *     Use |null| for the root obj.
 */
function SpringyTile(topic, parentObj) {
  Obj3D.call(this, topic, parentObj);
  this._create();
}
SpringyTile.prototype = {
  _create : function() {
    ddebug("Creating Springy node for " + this.topic.title);
    var self = this;
    this.node = gScene.graph.newNode({ label : self.topic.title });
    if (this.parent) {
      gScene.graph.newEdge(this.node, this.parent.node, { label : "Sub-Topic" });
    }
    this.node.tile = this;
    this.node.topic = this.topic;
  },

  remove : function() {
    this.children.forEach(function(child) {
      child.remove();
    });
    // TODO implement removing it from the graph
  },

  /**
   * Create a new Obj3D for |Topic|,
   * as a child obj of this topic.
   *
   * @param childTopic {Topic}
   * @returns {Obj3D}
   */
  makeChild : function(childTopic) {
    assert(arrayContains(this.topic.children, childTopic),
        childTopic.title + " isn't a child topic of " + this.topic.title);
    return new SpringyTile(childTopic, this);
  },


  /**
   * Show topics underneath the current one.
   *
   * The implementation should call this.makeChild()
   * as necessary.
   */
  showChildren : function() {
    this._addChildren();
    // TODO implement browse mode
  },
  /**
   * Hide topics underneath the current one.
   *
   * You might just hide them instead of deleting
   * the UI representation.
   */
  hideChildren : function() {
  },

  /**
   * User mouses over the topic.
   * He didn't click on it yet.
   *
   * Normally, this is followed by a call to showChildren().
   */
  highlight : function() {
    // TODO change color
  },
  removeHighlight : function() {
  },

  /**
   * This topic is currently active and shown in the
   * content pane.
   * Usually, because the user clicked on it,
   * or because he selected the topic from the content pane.
   */
  select : function() {
    return; // TODO
    // Keep only parents, remove all siblings and aunts, grand-aunts etc.
    var ancestors = this.ancestors(this);
    ancestors.reverse().forEach(function(ancestor) {
      ancestors.forEach(function(sibling) {
        if ( !arrayContains(ancestors, sibling)) {
          sibling.remove();
        }
      });
    });
  },
  unselect : function() {
  },

  addAsRoot : function() {
    this._create();
  },

}
extend(SpringyTile, Obj3D);

var TileImplemention = SpringyTile;


function createScene(sceneParentE) {
  var scene = {
    graph : null,

    _onMouseClickHandler : function(tile) {},
    _onMouseMoveHandler : function(tile) {},

    onMouseClick : function(handler) {
      this._onMouseClickHandler = handler;
    },
    onMouseMove : function(handler) {
      this._onMouseMoveHandler = handler;
    },
  };


    // When user clicks on a node, load the page for the person
  function selectedFunc(node) {
    assert(node.tile instanceof SpringyTile, "graph node doesn't have Tile");
    scene._onMouseClickHandler(node.tile);
  }

  var canvasE = document.createElement("canvas");
  // CSS width/height doesn't work, not even style="" works
  widthWindow = document.documentElement.clientWidth;
  heightWindow = document.documentElement.clientHeight;
  var width = Math.round(widthWindow) - 50;
  var height = Math.round(heightWindow) - 10;
  canvasE.setAttribute("width", width + "px")
  canvasE.setAttribute("height", height + "px");
  sceneParentE.appendChild(canvasE);

  scene.graph = new Springy.Graph();
  var spr = $(canvasE).springy({ graph : scene.graph, nodeSelected : selectedFunc });
  setTimeout(function() {
    spr.renderer.stop(); // TODO doesn't stop, although function is called
  }, 4000);

  gScene = scene;
  return scene;
}
