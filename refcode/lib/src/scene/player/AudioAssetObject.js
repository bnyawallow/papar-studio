import * as THREE from 'three';
import ContentObject from './ContentObject';
import fileLoader from '../../fileLoader';

const {loadFileSrc, loadBlobFromURL} = fileLoader;

class AudioAssetObject extends ContentObject {
  constructor({mixer, content}) {
    super({mixer, content});
  }

  async init() {
    const {content, mixer} = this;
    const blob = content.assetBlob || await loadBlobFromURL(content.asset.publicPath);
    const sound = new Audio(window.URL.createObjectURL(blob));
    sound.loop = !!content.properties.audioLoop;
    sound.load(); // iOS need to start audio on user event to grant permission
    this.sound = sound;
  }

  dispose() {
    this.sound.pause();
    this.sound.src = '';
  }

  dummyTrigger() {
    return new Promise((resolve, reject) => {
      this.sound.play();
      this.sound.pause();
      resolve();
    });
  }

  activate() {
    if (this.content.properties.audioAutostart) {
      this.sound.play();
    }
  }

  deactivate() {
    this.sound.pause();
  }

  createScriptObject() {
    const obj = super.createScriptObject();
    Object.assign(obj, {
      getAudio: () => {
	return this.sound;
      }
    });
    return obj;
  }
}

export default AudioAssetObject;
