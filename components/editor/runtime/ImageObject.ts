/**
 * ImageObject - Handles image content in the scene.
 * Mirrors refcode/lib/src/scene/player/ImageAssetObject.js
 */

import * as THREE from 'three';
import { ContentObject, ScriptAPI, ContentObjectOptions } from './ContentObject';
import { Content, ContentType } from '../../../types';

export class ImageObject extends ContentObject {
  private texture: THREE.Texture | null = null;
  private material: THREE.MeshBasicMaterial | null = null;

  constructor(options: ContentObjectOptions) {
    super(options);
  }

  /**
   * Initialize the image object by loading the texture.
   */
  public async init(): Promise<void> {
    const { content } = this;
    
    if (!content.imageUrl) {
      console.warn('ImageObject: No image URL provided');
      return;
    }

    try {
      const texture = await this.loadTexture(content.imageUrl);
      this.texture = texture;
      
      // Create geometry based on image aspect ratio
      const image = texture.image as HTMLImageElement;
      const aspect = image.naturalWidth / image.naturalHeight;
      
      // Use sprite for user-facing content, plane for regular content
      if (content.type === ContentType.IMAGE && (content as any).userFacing) {
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.mesh = new THREE.Sprite(spriteMaterial);
      } else {
        const geometry = new THREE.PlaneGeometry(aspect, 1);
        this.material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          toneMapped: false
        });
        this.mesh = new THREE.Mesh(geometry, this.material);
      }

      this.applyTransformToMesh();
      if (this.mesh) {
        this.mesh.userData.isContent = true;
        this.mesh.userData.contentId = this.uuid;
      }
    } catch (error) {
      console.error('ImageObject: Failed to load texture:', error);
      throw error;
    }
  }

  /**
   * Load a texture from URL.
   */
  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Create the script API wrapper.
   */
  public createScriptWrapper(): ScriptAPI {
    return super.createScriptWrapper();
  }

  /**
   * Dispose of resources.
   */
  public dispose(): void {
    super.dispose();
    
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }
}

export default ImageObject;
