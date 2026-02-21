/**
 * TextObject - Handles text content in the scene.
 * Mirrors refcode/lib/src/scene/player/TextObject.js
 * 
 * Renders text using Three.js text geometry or sprites.
 */

import * as THREE from 'three';
import { ContentObject, ScriptAPI, ContentObjectOptions } from './ContentObject';

export class TextObject extends ContentObject {
  private textMaterial: THREE.Material | null = null;

  constructor(options: ContentObjectOptions) {
    super(options);
  }

  /**
   * Initialize the text object.
   * Note: In a real implementation, you'd use troika-three-text or similar
   * for proper text rendering. This is a simplified version.
   */
  public async init(): Promise<void> {
    const content = this.getContent();
    
    if (!content.textContent) {
      console.warn('TextObject: No text content provided');
      return;
    }

    // Create a simple plane with text texture
    // In production, use troika-three-text or similar
    const canvas = this.createTextCanvas(
      content.textContent,
      {
        color: content.color || '#000000',
        fontSize: content.size || 20,
        fontFamily: content.font || 'Arial',
        outlineColor: content.outlineColor || '#000000',
        outlineWidth: content.outlineWidth || 0
      }
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // Calculate aspect ratio
    const aspect = canvas.width / canvas.height;
    
    // Create geometry and material
    const geometry = new THREE.PlaneGeometry(aspect, 1);
    this.textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false
    });

    this.mesh = new THREE.Mesh(geometry, this.textMaterial);
    this.applyTransformToMesh();

    if (this.mesh) {
      this.mesh.userData.isContent = true;
      this.mesh.userData.contentId = this.uuid;
    }
  }

  /**
   * Create a canvas with text rendered on it.
   */
  private createTextCanvas(
    text: string,
    options: {
      color: string;
      fontSize: number;
      fontFamily: string;
      outlineColor?: string;
      outlineWidth?: number;
    }
  ): HTMLCanvasElement {
    const { color, fontSize, fontFamily, outlineColor, outlineWidth } = options;
    
    // Create a canvas with appropriate size
    const fontSizePx = fontSize * 4; // Scale up for resolution
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Measure text
    ctx.font = `${fontSizePx}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width) + 40;
    const textHeight = fontSizePx * 1.5;
    
    canvas.width = textWidth;
    canvas.height = textHeight;
    
    // Re-measure with actual canvas
    ctx.font = `${fontSizePx}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Draw outline if specified
    if (outlineWidth && outlineWidth > 0 && outlineColor) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth * 4;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }
    
    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    return canvas;
  }

  /**
   * Update text content.
   */
  public updateText(newText: string): void {
    const content = this.getContent();
    const updatedContent = { ...content, textContent: newText };
    this.updateContent(updatedContent);
    
    // Re-create the text if mesh exists
    if (this.mesh) {
      this.dispose();
      this.init();
    }
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
    if (this.textMaterial) {
      if (this.textMaterial.map) {
        (this.textMaterial.map as THREE.Texture).dispose();
      }
      this.textMaterial.dispose();
      this.textMaterial = null;
    }
    
    super.dispose();
  }
}

export default TextObject;
