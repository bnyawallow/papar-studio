/**
 * EditorControls - Camera controls for the editor.
 * Mirrors refcode/lib/src/scene/EditorControls.js
 * 
 * Provides orbit, pan, and zoom controls for the editor camera.
 * Based on Three.js editor controls implementation.
 */

import * as THREE from 'three';

export interface EditorControlsOptions {
  /** Pan speed */
  panSpeed?: number;
  /** Zoom speed */
  zoomSpeed?: number;
  /** Rotation speed */
  rotationSpeed?: number;
}

export class EditorControls {
  /** Whether controls are enabled */
  public enabled: boolean = true;
  
  /** Center point for rotation/zoom */
  public center: THREE.Vector3 = new THREE.Vector3();
  
  /** Pan speed */
  public panSpeed: number = 0.002;
  
  /** Zoom speed */
  public zoomSpeed: number = 0.1;
  
  /** Rotation speed */
  public rotationSpeed: number = 0.005;

  // Internal state
  private object: THREE.Camera;
  private domElement: HTMLElement;
  private vector: THREE.Vector3 = new THREE.Vector3();
  private delta: THREE.Vector3 = new THREE.Vector3();
  private box: THREE.Box3 = new THREE.Box3();
  
  // State enum
  private STATE = {
    NONE: -1,
    ROTATE: 0,
    ZOOM: 1,
    PAN: 2
  };
  private state: number = this.STATE.NONE;
  
  // Matrices and vectors
  private normalMatrix: THREE.Matrix3 = new THREE.Matrix3();
  private spherical: THREE.Spherical = new THREE.Spherical();
  private sphere: THREE.Sphere = new THREE.Sphere();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private pointerOld: THREE.Vector2 = new THREE.Vector2();
  
  // Event listeners
  private boundOnPointerDown: (event: PointerEvent) => void;
  private boundOnPointerMove: (event: PointerEvent) => void;
  private boundOnPointerUp: (event: PointerEvent) => void;
  private boundOnMouseWheel: (event: WheelEvent) => void;
  private boundContextMenu: (event: Event) => void;
  private boundOnTouchStart: (event: TouchEvent) => void;
  private boundOnTouchMove: (event: TouchEvent) => void;

  // Touch state
  private touches: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private prevTouches: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private prevDistance: number | null = null;

  // Change event
  private changeEvent = { type: 'change' };

  constructor(object: THREE.Camera, domElement: HTMLElement, options: EditorControlsOptions = {}) {
    this.object = object;
    this.domElement = domElement;
    
    // Apply options
    if (options.panSpeed) this.panSpeed = options.panSpeed;
    if (options.zoomSpeed) this.zoomSpeed = options.zoomSpeed;
    if (options.rotationSpeed) this.rotationSpeed = options.rotationSpeed;
    
    // Bind methods
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnMouseWheel = this.onMouseWheel.bind(this);
    this.boundContextMenu = this.onContextMenu.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    
    // Add event listeners
    this.addEventListeners();
  }

  private addEventListeners(): void {
    this.domElement.addEventListener('contextmenu', this.boundContextMenu);
    this.domElement.addEventListener('wheel', this.boundOnMouseWheel, { passive: false });
    this.domElement.addEventListener('pointerdown', this.boundOnPointerDown);
    this.domElement.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
  }

  /**
   * Focus on a specific target object.
   */
  public focus(target: THREE.Object3D): void {
    let distance: number;

    this.box.setFromObject(target);

    if (this.box.isEmpty() === false) {
      this.box.getCenter(this.center);
      distance = this.box.getBoundingSphere(this.sphere).radius;
    } else {
      // Focusing on a Group, AmbientLight, etc.
      this.center.setFromMatrixPosition(target.matrixWorld);
      distance = 0.1;
    }

    this.delta.set(0, 0, 1);
    this.delta.applyQuaternion(this.object.quaternion);
    this.delta.multiplyScalar(distance * 4);

    this.object.position.copy(this.center).add(this.delta);
    this.dispatchChange();
  }

  /**
   * Pan the camera.
   */
  public pan(delta: THREE.Vector3): void {
    const distance = this.object.position.distanceTo(this.center);

    delta.multiplyScalar(distance * this.panSpeed);
    delta.applyMatrix3(this.normalMatrix.getNormalMatrix(this.object.matrix));

    this.object.position.add(delta);
    this.center.add(delta);

    this.dispatchChange();
  }

  /**
   * Zoom the camera.
   */
  public zoom(delta: THREE.Vector3): void {
    const distance = this.object.position.distanceTo(this.center);

    delta.multiplyScalar(distance * this.zoomSpeed);

    if (delta.length() > distance) return;

    delta.applyMatrix3(this.normalMatrix.getNormalMatrix(this.object.matrix));

    this.object.position.add(delta);

    this.dispatchChange();
  }

  /**
   * Rotate the camera around the center point.
   */
  public rotate(delta: THREE.Vector3): void {
    this.vector.copy(this.object.position).sub(this.center);

    this.spherical.setFromVector3(this.vector);

    this.spherical.theta += delta.x * this.rotationSpeed;
    this.spherical.phi += delta.y * this.rotationSpeed;

    this.spherical.makeSafe();

    this.vector.setFromSpherical(this.spherical);

    this.object.position.copy(this.center).add(this.vector);

    this.object.lookAt(this.center);

    this.dispatchChange();
  }

  private dispatchChange(): void {
    // Dispatch custom change event
    const event = new Event('change');
    this.domElement.dispatchEvent(event);
  }

  // Event handlers
  private onPointerDown(event: PointerEvent): void {
    if (!this.enabled) return;

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        this.onMouseDown(event);
        break;
    }

    this.domElement.ownerDocument?.addEventListener('pointermove', this.boundOnPointerMove);
    this.domElement.ownerDocument?.addEventListener('pointerup', this.boundOnPointerUp);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.enabled) return;

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        this.onMouseMove(event);
        break;
    }
  }

  private onPointerUp(_event: PointerEvent): void {
    if (!this.enabled) return;

    this.domElement.ownerDocument?.removeEventListener('pointermove', this.boundOnPointerMove);
    this.domElement.ownerDocument?.removeEventListener('pointerup', this.boundOnPointerUp);
  }

  private onMouseDown(event: PointerEvent): void {
    switch (event.button) {
      case 0: // Left mouse button
        this.state = this.STATE.ROTATE;
        break;
      case 1: // Middle mouse button
        this.state = this.STATE.ZOOM;
        break;
      case 2: // Right mouse button
        this.state = this.STATE.PAN;
        break;
    }

    this.pointerOld.set(event.clientX, event.clientY);
  }

  private onMouseMove(event: PointerEvent): void {
    this.pointer.set(event.clientX, event.clientY);

    const movementX = this.pointer.x - this.pointerOld.x;
    const movementY = this.pointer.y - this.pointerOld.y;

    if (this.state === this.STATE.ROTATE) {
      this.rotate(this.delta.set(-movementX, -movementY, 0));
    } else if (this.state === this.STATE.ZOOM) {
      this.zoom(this.delta.set(0, 0, movementY));
    } else if (this.state === this.STATE.PAN) {
      this.pan(this.delta.set(-movementX, movementY, 0));
    }

    this.pointerOld.set(event.clientX, event.clientY);
  }

  private onMouseUp(): void {
    this.state = this.STATE.NONE;
  }

  private onMouseWheel(event: WheelEvent): void {
    if (!this.enabled) return;

    event.preventDefault();

    // Normalize deltaY due to Firefox quirk
    this.zoom(this.delta.set(0, 0, event.deltaY > 0 ? 1 : -1));
  }

  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  // Touch handlers
  private onTouchStart(event: TouchEvent): void {
    if (!this.enabled) return;

    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        this.touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(event.touches[0].pageX, event.touches[0].pageY, 0).divideScalar(window.devicePixelRatio);
        break;
      case 2:
        this.touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(event.touches[1].pageX, event.touches[1].pageY, 0).divideScalar(window.devicePixelRatio);
        this.prevDistance = this.touches[0].distanceTo(this.touches[1]);
        break;
    }

    this.prevTouches[0].copy(this.touches[0]);
    this.prevTouches[1].copy(this.touches[1]);
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.enabled) return;

    event.preventDefault();
    event.stopPropagation();

    const getClosest = (touch: THREE.Vector3, touches: THREE.Vector3[]): THREE.Vector3 => {
      let closest = touches[0];
      for (const t of touches) {
        if (closest.distanceTo(touch) > t.distanceTo(touch)) {
          closest = t;
        }
      }
      return closest;
    };

    switch (event.touches.length) {
      case 1:
        this.touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(event.touches[0].pageX, event.touches[0].pageY, 0).divideScalar(window.devicePixelRatio);
        this.rotate(this.touches[0].sub(getClosest(this.touches[0], this.prevTouches)).multiplyScalar(-1));
        break;
      case 2:
        this.touches[0].set(event.touches[0].pageX, event.touches[0].pageY, 0).divideScalar(window.devicePixelRatio);
        this.touches[1].set(event.touches[1].pageX, event.touches[1].pageY, 0).divideScalar(window.devicePixelRatio);
        const distance = this.touches[0].distanceTo(this.touches[1]);
        this.zoom(this.delta.set(0, 0, (this.prevDistance || distance) - distance));
        this.prevDistance = distance;

        const offset0 = this.touches[0].clone().sub(getClosest(this.touches[0], this.prevTouches));
        const offset1 = this.touches[1].clone().sub(getClosest(this.touches[1], this.prevTouches));
        offset0.x = -offset0.x;
        offset1.x = -offset1.x;
        this.pan(offset0.add(offset1));
        break;
    }

    this.prevTouches[0].copy(this.touches[0]);
    this.prevTouches[1].copy(this.touches[1]);
  }

  /**
   * Dispose of the controls and remove event listeners.
   */
  public dispose(): void {
    this.domElement.removeEventListener('contextmenu', this.boundContextMenu);
    this.domElement.removeEventListener('wheel', this.boundOnMouseWheel);
    this.domElement.removeEventListener('pointerdown', this.boundOnPointerDown);
    this.domElement.removeEventListener('touchstart', this.boundOnTouchStart);
    this.domElement.removeEventListener('touchmove', this.boundOnTouchMove);
    
    this.domElement.ownerDocument?.removeEventListener('pointermove', this.boundOnPointerMove);
    this.domElement.ownerDocument?.removeEventListener('pointerup', this.boundOnPointerUp);
  }

  /**
   * Set the center point for rotation.
   */
  public setCenter(center: THREE.Vector3): void {
    this.center.copy(center);
  }

  /**
   * Get the center point.
   */
  public getCenter(): THREE.Vector3 {
    return this.center.clone();
  }

  /**
   * Set the object (camera) to control.
   */
  public setObject(object: THREE.Camera): void {
    this.object = object;
  }
}

export default EditorControls;
