/**
 * ModelObject - Handles 3D model content in the scene.
 * Mirrors refcode/lib/src/scene/player/GLBAssetObject.js
 * 
 * Note: This class accepts a pre-loaded model. Use with useGLTF or similar
 * to load the model in a React component, then pass to this class.
 * 
 * Supports:
 * - GLB/GLTF model files
 * - Animation playback (once, repeat, pingpong)
 * - Material property overrides
 * - Texture replacement
 */

import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { ContentObject, ScriptAPI, ContentObjectOptions } from './ContentObject';
import { Content } from '../../../types';

export interface ModelScriptAPI extends ScriptAPI {
  getAction: (nameOrIndex?: string | number) => THREE.AnimationAction | undefined;
  updateTexture: (materialName: string, imageUrl: string) => void;
}

export interface ModelData {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export class ModelObject extends ContentObject {
  private model: THREE.Group | null = null;
  private actions: { [key: string]: THREE.AnimationAction } = {};
  private modelMixer: THREE.AnimationMixer | null = null;
  private modelData: ModelData | null = null;

  constructor(options: ContentObjectOptions) {
    super(options);
  }

  /**
   * Initialize the model object with pre-loaded model data.
   */
  public async initWithModel(modelData: ModelData): Promise<void> {
    this.modelData = modelData;
    const { content } = this;
    
    // Clone the scene for independent use
    this.model = this.cloneModel(modelData.scene, modelData.animations);
    
    // Set up animations
    if (modelData.animations && modelData.animations.length > 0) {
      this.modelMixer = new THREE.AnimationMixer(this.model);
      
      for (let i = 0; i < modelData.animations.length; i++) {
        const clip = modelData.animations[i];
        const action = this.modelMixer.clipAction(clip, this.model);
        this.actions[clip.name] = action;
      }
    }
    
    // Apply material overrides if any
    if (content.materialOverrides) {
      this.applyMaterialOverrides(content.materialOverrides);
    }
    
    // Apply transform
    this.applyTransformToMesh();
    
    if (this.model) {
      this.model.userData.isContent = true;
      this.model.userData.contentId = this.uuid;
      this.model.userData.actions = this.actions;
    }
  }

  /**
   * Clone the model using SkeletonUtils for animated models.
   */
  private cloneModel(scene: THREE.Group, animations: THREE.AnimationClip[]): THREE.Group {
    const cloned = SkeletonUtils.clone(scene as any) as THREE.Group;
    cloned.animations = animations;
    return cloned;
  }

  /**
   * Apply material overrides to the model.
   */
  private applyMaterialOverrides(materialOverrides: Record<string, any>): void {
    if (!this.model) return;

    const loader = new THREE.TextureLoader();
    const textureCache: Record<string, THREE.Texture> = {};

    const getTexture = (url: string) => {
      if (!textureCache[url]) {
        const tex = loader.load(url);
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        textureCache[url] = tex;
      }
      return textureCache[url];
    };

    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((material: any) => {
          if (!material.name || !materialOverrides[material.name]) return;
          
          const props = materialOverrides[material.name];
          
          // Texture map
          if (props.map) {
            material.map = getTexture(props.map);
          } else if (props.map === '') {
            material.map = null;
          }
          
          // Color
          if (props.color && props.color !== 'transparent') {
            try {
              material.color.set(props.color);
            } catch {
              // Ignore invalid colors
            }
          }
          
          // Emissive
          if (props.emissive && props.emissive !== 'transparent') {
            try {
              material.emissive.set(props.emissive);
            } catch {
              // Ignore
            }
          }
          
          // Physical properties
          if (props.metalness !== undefined) material.metalness = props.metalness;
          if (props.roughness !== undefined) material.roughness = props.roughness;
          if (props.opacity !== undefined) material.opacity = props.opacity;
          if (props.transparent !== undefined) material.transparent = props.transparent;
          if (props.wireframe !== undefined) material.wireframe = props.wireframe;
          
          material.needsUpdate = true;
        });
      }
    });
  }

  /**
   * Called when the target becomes active.
   */
  public activate(): void {
    const content = this.getContent();
    
    if (content.animateAutostart && Object.keys(this.actions).length > 0) {
      const actionName = Object.keys(this.actions)[0];
      const action = this.actions[actionName];
      
      if (action) {
        if (content.animateLoop === 'once') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        } else if (content.animateLoop === 'pingpong') {
          action.setLoop(THREE.LoopPingPong, Infinity);
        } else {
          action.setLoop(THREE.LoopRepeat, Infinity);
        }
        
        action.play();
      }
    }
  }

  /**
   * Called when the target becomes inactive.
   */
  public deactivate(): void {
    Object.values(this.actions).forEach((action) => {
      action.stop();
    });
  }

  /**
   * Get the animation actions.
   */
  public getActions(): { [key: string]: THREE.AnimationAction } {
    return this.actions;
  }

  /**
   * Get the animation mixer.
   */
  public getMixer(): THREE.AnimationMixer | null {
    return this.modelMixer;
  }

  /**
   * Create the script API wrapper.
   */
  public createScriptWrapper(): ModelScriptAPI {
    const api = super.createScriptWrapper() as ModelScriptAPI;
    const self = this;
    
    return {
      ...api,
      getAction: (nameOrIndex?: string | number) => {
        if (typeof nameOrIndex === 'number') {
          const keys = Object.keys(self.actions);
          return self.actions[keys[nameOrIndex]];
        }
        return self.actions[nameOrIndex || 0];
      },
      updateTexture: (materialName: string, imageUrl: string) => {
        if (!imageUrl || !self.model) return;
        
        const loader = new THREE.TextureLoader();
        loader.load(imageUrl, (tex) => {
          tex.flipY = false;
          tex.colorSpace = THREE.SRGBColorSpace;
          
          self.model!.traverse((child: any) => {
            if (child.isMesh && child.material && child.material.name === materialName) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat: any) => {
                if (mat.map) mat.map.dispose();
                mat.map = tex;
                mat.needsUpdate = true;
              });
            }
          });
        });
      }
    };
  }

  /**
   * Dispose of resources.
   */
  public dispose(): void {
    // Stop all animations
    Object.values(this.actions).forEach((action) => {
      action.stop();
      action.reset();
    });
    this.actions = {};
    
    // Dispose mixer
    if (this.modelMixer) {
      this.modelMixer.stopAllAction();
      this.modelMixer = null;
    }
    
    // Dispose model
    if (this.model) {
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      this.model = null;
    }
    
    super.dispose();
  }
}

export default ModelObject;
