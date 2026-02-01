import * as THREE from 'three';
import ContentObject from './ContentObject';
import fileLoader from '../../fileLoader';
import constants from '../../constants';
import TextTexture from '@seregpie/three.text-texture';

class TextObject extends ContentObject {
  constructor({mixer, content}) {
    super({mixer, content});
  }

  async init() {
    const {content, mixer} = this;
    const texture = new TextTexture(content.text);
    if (content.properties.userFacing) {
      const material = new THREE.SpriteMaterial();
      material.map = texture;
      this.mesh = new THREE.Sprite( material );
    } else {
      const material = new THREE.MeshStandardMaterial();
      const geometry = new THREE.PlaneGeometry(1, 1);
      material.map = texture;
      material.side = THREE.DoubleSide;
      this.mesh = new THREE.Mesh( geometry, material );
    }
    texture.redraw();
    //this.mesh.scale.fromArray([texture.width, texture.height, 1]);
    this.mesh.position.fromArray(content.properties.position);
    this.mesh.rotation.fromArray(content.properties.rotation);
    this.mesh.scale.fromArray(content.properties.scale);

    const mesh = this.mesh;
    this.mesh.userData.isContent = true;
  }

  createScriptObject() {
    const obj = super.createScriptObject();
    return obj;
  }
}

export default TextObject;

