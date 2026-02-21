/**
 * Base class for all content objects in the runtime.
 * Mirrors refcode/lib/src/scene/player/ContentObject.js
 * 
 * Provides:
 * - Transform management (position, rotation, scale)
 * - Visibility control
 * - Script API wrapper generation
 * - Lifecycle methods
 */

import * as THREE from 'three';
import { Content, ContentType } from '../../../types';

export interface ScriptAPI {
  uuid: string;
  name: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  rotation: { x: number; y: number; z: number };
  scale: THREE.Vector3;
  visible: boolean;
  setPosition: (x: number, y: number, z: number) => void;
  setRotation: (x: number, y: number, z: number) => void;
  setScale: (x: number, y: number, z: number) => void;
  setVisible: (visible: boolean) => void;
}

export interface ContentObjectOptions {
  content: Content;
  mixer?: THREE.AnimationMixer;
}

export abstract class ContentObject {
  /** Unique identifier */
  public readonly uuid: string;
  
  /** User-friendly name */
  public readonly name: string;
  
  /** THREE.js mesh object */
  public mesh: THREE.Object3D | null = null;
  
  /** THREE.js CSS element for embed content */
  public cssElement: THREE.Object3D | null = null;
  
  /** Original content data */
  protected content: Content;
  
  /** Animation mixer for this object */
  protected mixer: THREE.AnimationMixer | null = null;
  
  /** THREE.js vector for position */
  protected position: THREE.Vector3 = new THREE.Vector3();
  
  /** THREE.js euler for rotation */
  protected rotation: THREE.Euler = new THREE.Euler();
  
  /** THREE.js vector for scale */
  protected scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  
  /** Visibility state */
  protected isVisible: boolean = true;

  constructor(options: ContentObjectOptions) {
    this.content = options.content;
    this.mixer = options.mixer || null;
    this.uuid = THREE.MathUtils.generateUUID();
    this.name = content.name;
    
    // Initialize transform from content
    this.initializeTransform();
  }

  /** Initialize transform from content data */
  protected initializeTransform(): void {
    const { position: pos, rotation: rot, scale: scl } = this.content.transform;
    this.position.fromArray(pos);
    this.rotation.set(
      THREE.MathUtils.degToRad(rot[0]),
      THREE.MathUtils.degToRad(rot[1]),
      THREE.MathUtils.degToRad(rot[2])
    );
    this.scale.fromArray(scl);
    this.isVisible = this.content.visible ?? true;
  }

  /**
   * Initialize the content object.
   * Subclasses should implement this to create their mesh.
   */
  public async init(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called when the target becomes active.
   * Use for starting animations, playing videos, etc.
   */
  public activate(): void {
    // Override in subclasses
  }

  /**
   * Called when the target becomes inactive.
   * Use for pausing videos, stopping animations, etc.
   */
  public deactivate(): void {
    // Override in subclasses
  }

  /**
   * Handle click events on this object.
   */
  public onClick(_scriptObject: ScriptAPI): void {
    // Override in subclasses
  }

  /**
   * Dummy trigger for initializing audio/video elements.
   * Required for iOS to allow playback later.
   */
  public async dummyTrigger(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Clean up resources.
   * Dispose geometries, materials, textures, etc.
   */
  public dispose(): void {
    // Override in subclasses
    
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
  }

  /**
   * Create the script API wrapper for this object.
   * This is what scripts use to interact with the object.
   */
  public createScriptWrapper(): ScriptAPI {
    const self = this;
    
    const api: ScriptAPI = {
      uuid: self.uuid,
      name: self.name,
      mesh: self.mesh!,
      position: self.position,
      rotation: {
        x: THREE.MathUtils.radToDeg(self.rotation.x),
        y: THREE.MathUtils.radToDeg(self.rotation.y),
        z: THREE.MathUtils.radToDeg(self.rotation.z)
      },
      scale: self.scale,
      visible: self.isVisible,
      
      setPosition: (x: number, y: number, z: number) => {
        self.position.set(x, y, z);
        if (self.mesh) {
          self.mesh.position.set(x, y, z);
        }
        // Sync CSS element if exists
        if (self.cssElement) {
          self.cssElement.position.set(x, y, z);
        }
      },
      
      setRotation: (x: number, y: number, z: number) => {
        self.rotation.set(
          THREE.MathUtils.degToRad(x),
          THREE.MathUtils.degToRad(y),
          THREE.MathUtils.degToRad(z)
        );
        if (self.mesh) {
          self.mesh.rotation.set(
            THREE.MathUtils.degToRad(x),
            THREE.MathUtils.degToRad(y),
            THREE.MathUtils.degToRad(z)
          );
        }
        // Sync CSS element if exists
        if (self.cssElement) {
          self.cssElement.rotation.set(
            THREE.MathUtils.degToRad(x),
            THREE.MathUtils.degToRad(y),
            THREE.MathUtils.degToRad(z)
          );
        }
      },
      
      setScale: (x: number, y: number, z: number) => {
        self.scale.set(x, y, z);
        if (self.mesh) {
          self.mesh.scale.set(x, y, z);
        }
      },
      
      setVisible: (visible: boolean) => {
        self.isVisible = visible;
        if (self.mesh) {
          self.mesh.visible = visible;
        }
        // Sync CSS element if exists
        if (self.cssElement) {
          (self.cssElement as any).element.style.visibility = visible ? 'visible' : 'hidden';
        }
      }
    };
    
    return api;
  }

  /**
   * Get the content type of this object.
   */
  public getContentType(): ContentType {
    return this.content.type;
  }

  /**
   * Get the original content data.
   */
  public getContent(): Content {
    return this.content;
  }

  /**
   * Update content data.
   */
  public updateContent(content: Partial<Content>): void {
    this.content = { ...this.content, ...content };
    
    // Update transform if provided
    if (content.transform) {
      this.initializeTransform();
      this.applyTransformToMesh();
    }
  }

  /**
   * Apply current transform to the mesh.
   */
  protected applyTransformToMesh(): void {
    if (!this.mesh) return;
    
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);
    this.mesh.scale.copy(this.scale);
    this.mesh.visible = this.isVisible;
  }

  /**
   * Get the animation mixer for this object.
   */
  protected getMixer(): THREE.AnimationMixer | null {
    return this.mixer;
  }
}

export default ContentObject;
