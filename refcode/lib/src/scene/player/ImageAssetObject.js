import * as THREE from 'three';
import ContentObject from './ContentObject';
import fileLoader from '../../fileLoader';
import constants from '../../constants';

const {loadImageAsSpriteMesh, loadImageAsMesh, loadBlobFromURL}  = fileLoader;

class ImageAssetObject extends ContentObject {
  constructor({mixer, content}) {
    super({mixer, content});
  }

  async init() {
    const {content} = this;
    if (content.mesh) {
      this.mesh = content.mesh.clone();
    } else {
      const blob = content.assetBlob || await loadBlobFromURL(content.asset.publicPath);
      let assetMesh;
      if (content.properties.userFacing) {
	assetMesh = await loadImageAsSpriteMesh(blob);
      } else {
	assetMesh = await loadImageAsMesh(blob);
      }
      this.mesh = new THREE.Group();
      this.mesh.add(assetMesh);
      this.mesh.scale.fromArray(content.properties.scale);
      this.mesh.rotation.fromArray(content.properties.rotation);
      this.mesh.position.fromArray(content.properties.position);
    }
    const mesh = this.mesh;
    this.mesh.userData.isContent = true;
  }

  createScriptObject() {
    const obj = super.createScriptObject();
    return obj;
  }
}

export default ImageAssetObject;
