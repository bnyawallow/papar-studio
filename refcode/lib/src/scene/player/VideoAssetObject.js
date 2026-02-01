import * as THREE from 'three';
import ContentObject from './ContentObject';
import fileLoader from '../../fileLoader';
import {createChromaMaterial} from '../ChromaKeyMaterial';

const {loadVideo, loadVideoAsMesh, loadFileSrc, loadBlobFromURL} = fileLoader;

class VideoAssetObject extends ContentObject {
  constructor({mixer, content}) {
    super({mixer, content});
  }

  async init() {
    const {content} = this;

    const blob = content.assetBlob || await loadBlobFromURL(content.asset.publicPath);
    const video = await loadVideo(blob);
    video.loop = !!content.properties.videoLoop;
    video.muted = !!content.properties.videoMuted;
    
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    let material;
    if (content.properties.videoChroma) {
      material = createChromaMaterial(texture, 0xd432);
      material.metalness = 1;
      material.flatShading = true;
      material.side = THREE.DoubleSide;
    } else {
      //material = new THREE.MeshStandardMaterial();
      material = new THREE.MeshBasicMaterial();
      material.metalness = 1;
      material.map = texture;
      material.flatShading = true;
      material.side = THREE.DoubleSide;
    }

    const aspect = video.width / video.height;
    const width = 1;
    const height = width / aspect;

    const geometry = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.Mesh( geometry, material );
    this.mesh.scale.fromArray(content.properties.scale);
    this.mesh.rotation.fromArray(content.properties.rotation);
    this.mesh.position.fromArray(content.properties.position);
    this.mesh.userData.isContent = true;

    this.video = video;
  }

  onClick(obj) {
    if (this.content.properties.videoClickToggle) {
      if (this.video.paused) {
	this.video.play();
      } else {
	this.video.pause();
      }
    }
  }

  dispose() {
    this.video.pause();
    this.video.src = '';
  }

  dummyTrigger() {
    return new Promise((resolve, reject) => {
      this.video.play();
      this.video.pause();
      resolve();
    });
  }

  activate() {
    if (this.content.properties.videoAutostart) {
      this.video.play();
    }
  }

  deactivate() {
    this.video.pause();
  }

  createScriptObject() {
    const obj = super.createScriptObject();
    Object.assign(obj, {
      getVideo: () => {
	return this.video;
      }
    });
    return obj;
  }
}

export default VideoAssetObject;
