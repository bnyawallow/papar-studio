/**
 * EmbedObject - Handles embedded video content (YouTube, Vimeo).
 * Mirrors refcode/lib/src/scene/player/EmbedContentObject.js
 * 
 * Uses CSS3DRenderer for overlay content.
 */

import * as THREE from 'three';
import { CSS3DObject, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { ContentObject, ScriptAPI, ContentObjectOptions } from './ContentObject';

export interface EmbedScriptAPI extends ScriptAPI {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  isPlayingVideo: () => boolean;
}

export interface EmbedPlayer {
  playVideo: () => void | Promise<void>;
  pauseVideo: () => void | Promise<void>;
  stopVideo: () => void | Promise<void>;
  getPlayerState: () => string;
}

export class EmbedObject extends ContentObject {
  private player: EmbedPlayer | null = null;
  private playerDiv: HTMLDivElement | null = null;
  private playerState: string = 'idle';

  constructor(options: ContentObjectOptions) {
    super(options);
  }

  /**
   * Initialize the embed object.
   * Note: Actual player initialization would be done by a React component
   * using ReactPlayer or similar. This class provides the runtime interface.
   */
  public async init(): Promise<void> {
    const content = this.getContent();
    
    // Create invisible mesh for raycasting
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Create CSS3D element for the embed
    const { div, playerDiv } = this.createDivs(content);
    this.playerDiv = playerDiv;
    
    // Create CSS3D object
    const isSprite = (content as any).userFacing;
    if (isSprite) {
      this.cssElement = new CSS3DSprite(div);
    } else {
      this.cssElement = new CSS3DObject(div);
    }
    
    // Apply transform
    this.applyTransformToMesh();
    this.applyTransformToCssElement();
    
    // Initial visibility
    (this.cssElement as any).element.style.visibility = 'hidden';
    
    if (this.mesh) {
      this.mesh.userData.isContent = true;
      this.mesh.userData.contentId = this.uuid;
    }
  }

  /**
   * Create the DOM elements for the embed.
   */
  private createDivs(content: any): { div: HTMLDivElement; playerDiv: HTMLDivElement } {
    const div = document.createElement('div');
    div.style.userSelect = 'none';
    div.style.position = 'relative';
    div.style.width = '100%';
    div.style.height = '100%';
    
    const playerDiv = document.createElement('div');
    playerDiv.style.userSelect = 'none';
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    playerDiv.style.border = '0px';
    div.appendChild(playerDiv);
    
    return { div, playerDiv };
  }

  /**
   * Set the player instance.
   * Called by React components after player is initialized.
   */
  public setPlayer(player: EmbedPlayer): void {
    this.player = player;
  }

  /**
   * Get the player instance.
   */
  public getPlayer(): EmbedPlayer | null {
    return this.player;
  }

  /**
   * Apply transform to CSS element.
   */
  private applyTransformToCssElement(): void {
    if (!this.cssElement) return;
    
    this.cssElement.position.copy(this.position);
    this.cssElement.rotation.copy(this.rotation);
    // CSS3D objects don't support scale the same way
  }

  /**
   * Called when the target becomes active.
   */
  public activate(): void {
    const content = this.getContent();
    
    // Show the CSS element
    if (this.cssElement) {
      (this.cssElement as any).element.style.visibility = 'visible';
    }
    
    // Auto-play if enabled
    if (content.autoplay && this.player) {
      this.player.playVideo();
    }
  }

  /**
   * Called when the target becomes inactive.
   */
  public deactivate(): void {
    // Hide the CSS element
    if (this.cssElement) {
      (this.cssElement as any).element.style.visibility = 'hidden';
    }
    
    // Pause playback
    if (this.player) {
      this.player.pauseVideo();
    }
  }

  /**
   * Handle click events.
   */
  public onClick(scriptObject: ScriptAPI): void {
    const content = this.getContent();
    
    if (content.videoClickToggle && this.player) {
      if (this.playerState === 'playing') {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
    }
  }

  /**
   * Update player state.
   */
  public setPlayerState(state: string): void {
    this.playerState = state;
  }

  /**
   * Create the script API wrapper.
   */
  public createScriptWrapper(): EmbedScriptAPI {
    const api = super.createScriptWrapper() as EmbedScriptAPI;
    const self = this;
    
    return {
      ...api,
      playVideo: () => self.player?.playVideo(),
      pauseVideo: () => self.player?.pauseVideo(),
      stopVideo: () => self.player?.stopVideo(),
      isPlayingVideo: () => self.playerState === 'playing'
    };
  }

  /**
   * Dispose of resources.
   */
  public dispose(): void {
    if (this.player) {
      this.player.stopVideo();
      this.player = null;
    }
    
    if (this.playerDiv) {
      this.playerDiv = null;
    }
    
    super.dispose();
  }
}

export default EmbedObject;
