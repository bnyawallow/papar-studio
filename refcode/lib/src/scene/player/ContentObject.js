import * as THREE from 'three';

class ContentObject {
  constructor({mixer, content}) {
    const properties = content.properties;
    this.mixer = mixer;
    this.content = content;
    this.uuid = THREE.MathUtils.generateUUID();
    this.name = content.name;
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Vector3();
    this.scale = new THREE.Vector3();
    this.visible = true;
    this.position.fromArray(properties.position);
    this.rotation.fromArray(properties.rotation);
    this.scale.fromArray(properties.scale);
  }

  init() {
    // sub-class implements
  }

  dummyTrigger() {
    // sub-class implements
  }

  dispose() {
    // sub-class implements
  }

  activate() {
    // sub-class implements
  }
  deactivate() {
    // sub-class implements
  }

  onClick() {
    // sub-class implements
  }

  createScriptObject() {
    const self = this;

    const obj = {
      uuid: self.uuid,
      name: self.name,
      mesh: self.mesh,
      position: self.position,
      scale: self.scale,
      rotation: self.rotation,
      visible: self.visible,
      setPosition: (x, y, z) => {
	obj.position.x = x;
	obj.position.y = y;
	obj.position.z = z;
	obj.mesh.position.x = x;
	obj.mesh.position.y = y;
	obj.mesh.position.z = z;
      },

      setRotation: (x, y, z) => {
	obj.rotation.x = x;
	obj.rotation.y = y;
	obj.rotation.z = z;
	obj.mesh.rotation.x = x * THREE.MathUtils.DEG2RAD;
	obj.mesh.rotation.y = y * THREE.MathUtils.DEG2RAD;
	obj.mesh.rotation.z = z * THREE.MathUtils.DEG2RAD;
      },

      setScale: (x, y, z) => {
	obj.scale.x = x;
	obj.scale.y = y;
	obj.scale.z = z;
	obj.mesh.scale.x = x;
	obj.mesh.scale.y = y;
	obj.mesh.scale.z = z;
      },

      setVisible: (visible) => {
	obj.visible = visible;
	obj.mesh.visible = visible;
      }
    }

    return obj;
  }
}

export default ContentObject;
