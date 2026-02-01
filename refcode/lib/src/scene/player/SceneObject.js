class SceneObject {
  constructor({objects, systemControl}) {
    this.objects = objects;
    this.systemControl = systemControl;
  }

  createScriptObject() {
    const obj = {};
    Object.assign(obj, {
      getObject: (name) => {
	return this.objects.find((o) => o.name === name);
      },

      captureScreen: () => {
	if (!this.systemControl) {
	  console.log("system not found");
	  return;
	}
	this.systemControl.captureScreen();
      }
    });
    return obj;
  }
}

export default SceneObject;
