/**
 * This is the central code file for TopicNav
 * - Entry point and load
 * - Reaction to user input, on a high-level (thus Controller in MVC sense)
 *
 * (c) 2014 Ben Bucksch
 * License: GPL3, see LICENSE
 */

/**
 * The current object, which is highlighted and all its ancestors.
 * The user had hovered over this.
 * {Obj3D}
 */
var gHighlightedN;
/**
 * The object for the topic that is shown in the main pane.
 * The user had clicked on it.
 * {Obj3D}
 */
var gSelectedN;
/**
 * {Obj3D}
 */
var gRootN;

function onLoad() {
  var scene = createScene(document.getElementById("uninav"));

  loadRootTopic(function(rootTopic, allByID, allTopics) {
    var rootN = new TileImplemention(rootTopic, null);
    rootN.addAsRoot();
    rootN.topic.loadChildren(function() {
      rootN.showChildren();
      var startN = rootN.children[0];
      assert(startN, "Start node not found. Taxonomy file broken?");
      highlight3DObj(startN);
      select3DObj(startN);
    }, errorCritical);

    scene.onMouseMove(onMouseMove);
    scene.onMouseClick(onMouseClick);

    // global objects
    gRootN = rootN;
    var du = window.parent;
    assert(du.openTopic, "DU obj not found in TopicNav");
    du.uninav = window;
  }, errorCritical);
}
window.addEventListener("DOMContentLoaded", onLoad, false);


function onMouseMove(n) {
  if ( !n || n == gHighlightedN) {
    return;
  }

  highlight3DObj(n);
}

function onMouseClick(n) {
  if ( !n || n == gSelectedN) {
    return;
  }

  openTopic(n.topic);
  select3DObj(n);
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

/**
 * Changes highlighted object to another in the same hierarchy level
 * @param relPos {Integer} e.g. 1 for next, -1 for previous etc.
 */
function changeToSibling(relPos) {
  if (gHighlightedN && gHighlightedN.parent) {
    var siblings = gHighlightedN.parent.children;
    var oldIndex = siblings.indexOf(gHighlightedN);
    var newIndex = oldIndex + relPos;
    if (oldIndex != -1 && newIndex >= 0 && newIndex < siblings.length) {
      highlight3DObj(siblings[newIndex]);
    }
  }
}

function changeToParent() {
  if (gHighlightedN && gHighlightedN.parent) {
    if ( !gHighlightedN.parent.parent) {
      return; // HACK: fake root note, don't select it
    }
    highlight3DObj(gHighlightedN.parent);
  }
}

function changeToChild() {
  if (gHighlightedN && gHighlightedN.children[0]) {
    highlight3DObj(gHighlightedN.children[0]);
  }
}

function select3DObj(n) {
  if ( !n || n == gSelectedN) {
    return;
  }
  if (gSelectedN) {
    gSelectedN.unselect(); // oldN
  }
  gSelectedN = n;
  gSelectedN.select();
}

function highlight3DObj(n) {
  if ( !n || n == gHighlightedN) {
    return;
  }
  assert(n instanceof Obj3D);
  ddebug("hovering over " + n.topic.title);

  var oldN = gHighlightedN;
  if (oldN) {
    oldN.ancestors(true).forEach(function(oldAncestorN) {
      if ( !oldAncestorN.isAncestorOf(n)) {
        oldAncestorN.removeHighlight();
        oldAncestorN.hideChildren();
      }
    });
  }

  gHighlightedN = n;
  n.highlight();

  n.topic.loadChildren(function() { // hopefully already done
      n.showChildren();
  }, errorNonCritical);

  // Lazy loading of topics
  // Preload grandchildren, so that the user doesn't have to wait
  n.topic.children.forEach(function(child) {
    child.loadChildren(function() {}, errorNonCritical);
  });
}

/**
 * @param topic {Topic}
 * @returns {Obj3D} with obj.topic == |topic|
 */
function getObj3DforTopic(topic) {
  var allObj3DbyTopic = {};
  allObj3DbyTopic.root = gRootN;
  gRootN.allChildren().forEach(function(n) {
    allObj3DbyTopic[n.topic.id] = n;
    // Verify hierarchy
    assert(n == gRootN || n.parent, "Need parent");
    assert(arrayContains(n.parent.children, n), "My parent doesn't know about me");
  });
  if (allObj3DbyTopic[topic.id]) {
    return allObj3DbyTopic[topic.id];
  }
  // Walk top down
  var lastN; // {Obj3D}
  topic.primaryAncestors(true).reverse().forEach(function(ancTopic) {
    ddebug("searching " + ancTopic.id);
    //var node = allObj3DbyTopic[ancTopic.id]; // use nodes that are already on screen
    var node = ancTopic.id == "root" ? gRootN : lastN.children.filter(function(n) {
      return n.topic == ancTopic;
    })[0];
    if ( !node) {
      // Create Obj3D obj for this topic
      node = lastN.makeChild(ancTopic);
    }
    node.highlight();
    node.showChildren();
    lastN = node;
  });
  assert(lastN, "Missing obj");
  assert(lastN.topic == topic, "Obj for wrong topic");
  return lastN;
}


/**
 * When: User changed the topic outside of TopicNav
 * Action: Show the Obj3D and select it,
 *   but do not change topic of DU (that's already done)
 * @param topic {Topic}
 */
function showTopic(topic) {
  ddebug("showTopic " + topic.title);
  var node = getObj3DforTopic(topic);
  // NOT already highlighed by getObj3DforTopic()
  //node.ancestors(this).reverse().forEach(function(ancNode) {
  //  highlight3DObj(ancNode);
  //});
  setTimeout(function() { // HACK
    highlight3DObj(node);
    select3DObj(node);
  }, 500);
}


/**
 * When: User clicked on a object
 * Action: Open the DU topic in the content pane
 * @param topic {Topic}
 */
function openTopic(topic) {
  var target = window.parent;
  target.openTopic(topic);
  //target.postMessage(topic, "http://www.me.org");
}
