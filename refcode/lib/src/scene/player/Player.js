import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { CSS3DObject, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import GLBAssetObject from './GLBAssetObject';
import AudioAssetObject from './AudioAssetObject';
import VideoAssetObject from './VideoAssetObject';
import ImageAssetObject from './ImageAssetObject';
import TextObject from './TextObject';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import EmbedContentObject from './EmbedContentObject';
import SceneObject from './SceneObject';
import { EditorControls } from '../EditorControls.js';
import utils from '../../utils';
import fileLoader from '../../fileLoader';
import constants from '../../constants';

const {loadImageAsMesh, loadBlobFromURL}  = fileLoader;

class Player {
  constructor(container) {
    this.container = container;
    this.objects = null;
    this.sceneObjects = null;
    this.onCustomScriptError = null;

    this.defaultCamera = this._createCamera();
    this.camera = this.defaultCamera;
    this.scene = new THREE.Scene();
    this.cssScene = new THREE.Scene();
    this.mixer = new THREE.AnimationMixer(this.scene);

    this.renderer = this._createRenderer();
    this.cssRenderer = this._createCSSRenderer();

    this.targets = [];
    this.selectedTarget = null;
    this.clock = null;

    this.rendererResolve = null;
  }

  async init(targets, showImageTarget=false, systemControl) {
    this.performanceDiv = this._createPerformanceDiv();
    this.editorControls = new EditorControls(this.camera, this.container);
    this.editorControls.enabled = true;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    this.container.appendChild(this.renderer.domElement);
    this.container.appendChild(this.cssRenderer.domElement);
    this.container.appendChild(this.performanceDiv);
    this._setupMouseEvents();

    let invalidScripts = [];
    for (let i = 0; i < targets.length; i++) {
      const playerTarget = {
	targetIndex: i,
	customFunctions: {},
	customData: {},
	subScene: null,
	cssSubscene: null,
	sceneObject: null,
	objects: null,
	objectBuilders: null,
      }

      const target = targets[i];
      const subScene = new THREE.Group();
      const cssSubscene = new THREE.Group(); 
      subScene.matrixAutoUpdate = false;
      cssSubscene.matrixAutoUpdate = false;

      if (showImageTarget && target.imageTarget && target.imageTarget.mesh) {
	const targetMesh = target.imageTarget.mesh.clone();
	subScene.add(targetMesh);
      }

      const objects = [];
      const objectBuilders = [];
      for (const content of target.contents) {
	let objectBuilder;
	if (content.type === 'asset') {
	  if (content.asset.type === 'image') {
	    objectBuilder = new ImageAssetObject({content, mixer: this.mixer, objects: objects});
	  } else if (content.asset.type === 'glb') {
	    objectBuilder = new GLBAssetObject({content, mixer: this.mixer, objects: objects});
	  } else if (content.asset.type === 'audio') {
	    objectBuilder = new AudioAssetObject({content, mixer: this.mixer, objects: objects});
	  } else if (content.asset.type === 'video') {
	    objectBuilder = new VideoAssetObject({content, mixer: this.mixer, objects: objects});
	  }
	} else if (content.type === 'embed') {
	  objectBuilder = new EmbedContentObject({content, objects: objects});
	} else if (content.type === 'text') {
	  objectBuilder = new TextObject({content, objects: objects});
	}

	await objectBuilder.init();
	const object = objectBuilder.createScriptObject();
	objects.push(object);
	objectBuilders.push(objectBuilder);

	if (objectBuilder.mesh) {
	  subScene.add(objectBuilder.mesh);
	}

	if (object.cssElement) {
	  cssSubscene.add(object.cssElement);
	}
      }

      const good = this._initScript(playerTarget, target.script);
      if (!good) {
	invalidScripts.push('target ' + (i+1));
      }

      const sceneObjectBuilder = new SceneObject({objects, systemControl});
      const sceneObject = sceneObjectBuilder.createScriptObject();
      playerTarget.subScene = subScene;
      playerTarget.cssSubscene = cssSubscene;
      playerTarget.objects = objects;
      playerTarget.objectBuilders = objectBuilders;
      playerTarget.sceneObject = sceneObject;
      playerTarget.sceneObjectBuilder = sceneObjectBuilder;

      this.targets.push(playerTarget);

      this._dispatchTargetEvent(playerTarget, 'onInit');
    }

    for (const target of this.targets) {
      this.cssScene.add(target.cssSubscene);
    }
    this.cssRenderer.render(this.cssScene, this.camera);

    return invalidScripts;
  }

  dispose() {
    this.stopTarget();
    for (const target of this.targets) {
      for (const obj of target.objectBuilders) {
	obj.dispose();
      }
      utils.disposeObject(target.subScene);
    }
    utils.disposeObject(this.scene);
    this.mixer.uncacheRoot(this.scene);
    this.renderer.dispose();
  }

  switchToAR(camera) {
    this.camera = camera;
    this.editorControls.enabled = false;
  }
  switchToAnchor() {
    this.editorControls.enabled = true;
    this.camera = this.defaultCamera;
    this.camera.position.set(0, 1000, 2000);
    this.camera.lookAt(new THREE.Vector3());
    //console.log("this camera", this.camera, this.camera.position);
    // reset all anchor
    for (const target of this.targets) {
      target.subScene.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      target.cssSubscene.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
  }

  // mostly for triggering audio/video upon user event, 
  // otherwise, some elements cannot auto-start later
  async dummyTrigger() {
    for (const target of this.targets) {
      for (const obj of target.objectBuilders) {
	await obj.dummyTrigger();
      }
    }
  }

  _initScript(playerTarget, script) {
    const eventList = ['onInit', 'onActivate', 'onDeactivate', 'onUpdate', 'onClick']; 
    let scriptWrapResultObj = {};
    eventList.forEach((eventKey) => {
      scriptWrapResultObj[eventKey] = eventKey;
    });
    let scriptWrapParams = eventList.join(',');
    let scriptWrapResult = JSON.stringify( scriptWrapResultObj ).replace( /\"/g, '' );

    try {
      const functions = (new Function(scriptWrapParams, script + '\nreturn ' + scriptWrapResult + ';'))();
      playerTarget.customFunctions = functions;
    } catch (e) {
      console.log("error compiling custom script", e);
      return false;
    }
    return true;
  }

  _setupMouseEvents() {
    const {scene, renderer} = this;
    const container = renderer.domElement;
    const clickHandler = (e) => {
      const camera = this.camera;
      const x = e.clientX;
      const y = e.clientY;
      const rect = container.getBoundingClientRect();
      const point = [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

      const mouse = new THREE.Vector2(point[0]*2-1, -(point[1]*2) + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      //const intersects = raycaster.intersectObjects(scene.children, true);
      const subScene = scene.children[0];
      const interestedObjects = subScene.children.filter((c) => {
	return c.userData.isContent && c.visible;
      });
      const intersects = raycaster.intersectObjects(interestedObjects, true);
      if (intersects.length === 0) return null;

      let o = intersects[0].object; 
      while (o.parent && !o.userData.isContent) {
	o = o.parent;
      }
      if (o.userData.isContent) {
	for (const obj of this.selectedTarget.objects) {
	  if (obj.mesh === o) {
	    this.selectedTarget.objectBuilders.forEach((objectBuilder) => {
	      if (objectBuilder.uuid === obj.uuid) {
		objectBuilder.onClick(obj);
	      }
	    });
	    this._dispatchTargetEvent(this.selectedTarget, 'onClick', {object: obj, time: this.clock.elapsedTime});
	  }
	}
      }
    };
    container.addEventListener('click', clickHandler);
  }

  startTarget(targetIndex, regionCapturedImage) {
    this.stopTarget();

    const {mixer, scene, cssScene, cssRenderer, container, renderer, camera, sceneObject} = this;
    const target = this.targets[targetIndex];
    this.selectedTarget = target;

    scene.add(target.subScene);
    cssScene.add(target.cssSubscene);
    this.selectedTarget.objectBuilders.forEach((obj) => {
      obj.activate();
    });

    this.clock = new THREE.Clock(); // only used for animations

    this._dispatchTargetEvent(target, 'onActivate', {regionCapturedImage});

    renderer.setAnimationLoop(() => {
      const startTime = performance.now();

      const elapsed = this.clock.elapsedTime;
      const delta = this.clock.getDelta();

      this._dispatchTargetEvent(target, 'onUpdate', {time: elapsed, deltaTime: delta});

      mixer.update( delta );
      renderer.render(scene, this.camera);
      cssRenderer.render(cssScene, this.camera);

      if (this.rendererResolve) {
	this.rendererResolve(renderer);
	this.rendererResolve = null;
      }

      const endTime = performance.now();
      //this.performanceDiv.innerHTML = (endTime - startTime).toFixed(2);
    });
  }

  stopTarget() {
    if (this.selectedTarget === null) return;
    this.selectedTarget.objectBuilders.forEach((obj) => {
      obj.deactivate();
    });
    this._dispatchTargetEvent(this.selectedTarget, 'onDeactivate');
    this.renderer.setAnimationLoop(null);
    this.renderer.clear();
    this.mixer.uncacheRoot(this.selectedTarget.subScene);
    this.scene.remove(this.selectedTarget.subScene);
  }

  // retrieve the renderer inside the animation loop. otherwise, cannot get toDataURL() properly. not sure why
  async requestRenderer() {
    return new Promise((resolve, reject) => {
      this.rendererResolve = resolve;
    });
  }

  resizeUI() {
    const {performanceDiv, renderer, cssRenderer, camera, container} = this;

    renderer.setViewport(0, 0, container.offsetWidth, container.offsetHeight);
    renderer.setSize(container.offsetWidth, container.offsetHeight, false);
    cssRenderer.setSize(container.offsetWidth, container.offsetHeight, false);

    const canvas = this.renderer.domElement;
    const cssCanvas = this.cssRenderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.left = 0;
    canvas.style.top = 0;
    canvas.style.width = container.offsetWidth + 'px';
    canvas.style.height = container.offsetHeight + 'px';
    canvas.style.zIndex = 2;
    //canvas.style.pointerEvents = 'none';

    cssCanvas.style.position = 'absolute';
    cssCanvas.style.left = 0;
    cssCanvas.style.top = 0;
    cssCanvas.style.width = container.offsetWidth + 'px';
    cssCanvas.style.height = container.offsetHeight + 'px';
    cssCanvas.style.zIndex = 1;

    performanceDiv.style.position = "absolute";
    performanceDiv.style.bottom  = "5px";
    performanceDiv.style.left = "5px";

    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();

    //this.cssRenderer.render(this.cssScene, this.camera);
  }

  _createRenderer() {
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(window.devicePixelRatio);
    return renderer;
  }

  _createCSSRenderer() {
    const cssRenderer = new CSS3DRenderer({antialias: true });
    return cssRenderer;
  }

  _createPerformanceDiv() {
    const performanceDiv = document.createElement("div");
    return performanceDiv;
  }

  _createCamera() {
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 100000);
    camera.position.set(0, 1000, 2000);
    camera.lookAt(new THREE.Vector3());
    return camera;
  }

  _dispatchTargetEvent(target, name, extra) {
    const params = Object.assign({target: target.sceneObject, data: target.customData}, extra);
    if (target.customFunctions[name]) {
      try {
	target.customFunctions[name](params);
      } catch(e) {
	if (this.onCustomScriptError) {
	  this.onCustomScriptError(e.message);
	}
      }
    }
  }
}

export default Player;
