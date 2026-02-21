/**
 * SceneObject - Provides script API for interacting with scene contents.
 * Mirrors refcode/lib/src/scene/player/SceneObject.js
 * 
 * This class acts as the bridge between the script engine and the scene contents.
 * Scripts use getObject(name) to access individual content objects.
 */

import * as THREE from 'three';
import { ContentObject, ScriptAPI } from './ContentObject';

export interface SystemControl {
  captureScreen: () => void;
}

export interface SceneScriptAPI {
  /** Get a content object by name */
  getObject: (name: string) => ScriptAPI | null;
  /** Capture a screenshot of the current view */
  captureScreen: () => void;
  /** Open a URL in a new tab */
  openUrl?: (url: string) => void;
}

export class SceneObject {
  /** Map of content name to content object */
  private objects: Map<string, ContentObject> = new Map();
  
  /** System control interface */
  private systemControl: SystemControl | null = null;
  
  /** THREE.js renderer for capturing screenshots */
  private renderer: THREE.WebGLRenderer | null = null;
  
  /** THREE.js scene */
  private scene: THREE.Scene | null = null;
  
  /** THREE.js camera */
  private camera: THREE.Camera | null = null;

  constructor(options: {
    objects?: Map<string, ContentObject>;
    systemControl?: SystemControl;
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.Camera;
  } = {}) {
    if (options.objects) {
      this.objects = options.objects;
    }
    this.systemControl = options.systemControl || null;
    this.renderer = options.renderer || null;
    this.scene = options.scene || null;
    this.camera = options.camera || null;
  }

  /**
   * Add a content object to the scene.
   */
  public addObject(name: string, object: ContentObject): void {
    this.objects.set(name, object);
  }

  /**
   * Remove a content object from the scene.
   */
  public removeObject(name: string): void {
    this.objects.delete(name);
  }

  /**
   * Get a content object by name.
   * Returns the script API wrapper for the object.
   */
  public getObject(name: string): ScriptAPI | null {
    const contentObject = this.objects.get(name);
    if (!contentObject) {
      console.warn(`SceneObject: Object "${name}" not found`);
      return null;
    }
    return contentObject.createScriptWrapper();
  }

  /**
   * Get all object names in the scene.
   */
  public getObjectNames(): string[] {
    return Array.from(this.objects.keys());
  }

  /**
   * Check if an object exists by name.
   */
  public hasObject(name: string): boolean {
    return this.objects.has(name);
  }

  /**
   * Get the underlying ContentObject instance.
   */
  public getContentObject(name: string): ContentObject | undefined {
    return this.objects.get(name);
  }

  /**
   * Capture a screenshot of the current view.
   */
  public captureScreen(): void {
    if (this.systemControl) {
      this.systemControl.captureScreen();
      return;
    }
    
    if (!this.renderer || !this.scene || !this.camera) {
      console.warn('SceneObject: Cannot capture screen - renderer, scene, or camera not set');
      return;
    }
    
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `capture_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Update the renderer reference.
   */
  public setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  /**
   * Update the scene reference.
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Update the camera reference.
   */
  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Update the system control reference.
   */
  public setSystemControl(systemControl: SystemControl): void {
    this.systemControl = systemControl;
  }

  /**
   * Create the script API object.
   */
  public createScriptObject(): SceneScriptAPI {
    const self = this;
    
    return {
      getObject: (name: string) => self.getObject(name),
      captureScreen: () => self.captureScreen(),
      openUrl: (url: string) => {
        window.open(url, '_blank');
      }
    };
  }

  /**
   * Clear all objects.
   */
  public clear(): void {
    // Dispose all objects
    this.objects.forEach((obj) => {
      obj.dispose();
    });
    this.objects.clear();
  }

  /**
   * Get the number of objects in the scene.
   */
  public getObjectCount(): number {
    return this.objects.size;
  }
}

export default SceneObject;
