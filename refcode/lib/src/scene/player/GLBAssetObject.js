import * as THREE from 'three';
import ContentObject from './ContentObject';
import fileLoader from '../../fileLoader';
import constants from '../../constants';
// Fix: pictarize-lib is not available, import from three examples.
import {SkeletonUtils} from 'three/examples/jsm/utils/SkeletonUtils.js';

const {loadGLBModel, loadBlobFromURL}  = fileLoader;

class GLBAssetObject extends ContentObject {
  constructor({mixer, content}) {
    super({mixer, content});
  }

  async init() {
    const {content, mixer} = this;
    if (content.mesh) { 
      //this.mesh = content.mesh.clone(); // might not work: https://github.com/mrdoob/three.js/issues/11574
      this.mesh = SkeletonUtils.clone(content.mesh);
      this.mesh.animations = content.mesh.animations;
    } else {
      const blob = content.assetBlob || await loadBlobFromURL(content.asset.publicPath);
      this.mesh = await loadGLBModel(blob, constants.DEFAULT_WIDTH);
      this.mesh.scale.fromArray(content.properties.scale);
      this.mesh.rotation.fromArray(content.properties.rotation);
      this.mesh.position.fromArray(content.properties.position);
    }

    const mesh = this.mesh;
    this.mesh.userData.isContent = true;
    this.actions = [];
    for (let i = 0; i < mesh.animations.length; i++) {
      this.actions[i] = mixer.clipAction(this.mesh.animations[i], mesh);
    }
  }

  activate() {
    for (let i = 0; i < this.actions.length; i++) {
      if (this.content.properties.animateLoop === 'once') {
	this.actions[i].setLoop(THREE.LoopOnce);
      } else if (this.content.properties.animateLoop === 'repeat') {
	this.actions[i].setLoop(THREE.LoopRepeat);
      } else if (this.content.properties.animateLoop === 'pingpong') {
	this.actions[i].setLoop(THREE.LoopPingPong);
      }
    }
    if (this.actions.length > 0 && this.content.properties.animateAutostart) {
      this.actions[0].play();
    }
  }

  deactivate() {
    for (let i = 0; i < this.actions.length; i++) {
      this.actions[i].stop();
    }
  }

  createScriptObject() {
    const obj = super.createScriptObject();
    Object.assign(obj, {
      getAction: (index=0) => {
	return this.actions[index];
      },

      updateTexture(materialName, image) {
	if (!image) return;

	this.mesh.traverse((o) => {
	  if (o.isMesh && o.material && o.material.name === materialName) {
	    const textureLoader = new THREE.TextureLoader();
	    textureLoader.load(image, (texture) => {
	      o.material.map.dispose();
	      o.material.map = texture;
	      o.material.needsUpdate = true;
	    });
	  }
	});
      }
    });
    return obj;
  }
}

export default GLBAssetObject;