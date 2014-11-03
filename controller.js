/**
 * Copyright 2014 Ben Bucksch
 * Published as AGPLv3
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


function onLoad() {
  var scene = createScene(document.getElementById("uninav"));

  loadRootTopic(function(rootTopic) {
    var rootN = new SceneObj(rootTopic, null);
    rootN.showChildren();
    var startN = rootN.children[0];
    assert(startN, "Start node not found. Taxonomy file broken?");
    highlight3DObj(startN);
    setTimeout(function() { // HACK
      cameraLookAt(startN);
    }, 100);

    scene.onMouseMove(onMouseMove);
    scene.onMouseClick(onMouseClick);
  }, errorCritical);
}
window.addEventListener("load", onLoad, false);


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

  if (gSelectedN) {
    gSelectedN.unselect(); // oldN
  }
  gSelectedN = n;
  gSelectedN.select();
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


function highlight3DObj(n) {
  if ( !n || n == gHighlightedN) {
    return;
  }
  assert(n instanceof Obj3D);
  ddebug("hovering over " + n.topic.title);

  var oldN = gHighlightedN;
  if (oldN) {
    oldN.forEachAncestor(function(oldAncestorN) {
      if ( !oldAncestorN.isAncestorOf(n)) {
        oldAncestorN.removeHighlight();
        oldAncestorN.hideChildren();
      }
    });
  }

  gHighlightedN = n;
  n.highlight();
  cameraLookAt(n);
  n.showChildren();
}





/**
 * When: User clicked on a object
 * Action: Open the DU topic in the content pane
 * @param topic {Topic}
 */
function openTopic(topic) {
  var target = window.parent;
  target.openTopic(topic);
  //target.postMessage(topic, "http://www.manyone.zone");
}
