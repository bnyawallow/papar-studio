/**
 * AudioObject - Handles audio content in the scene.
 * Mirrors refcode/lib/src/scene/player/AudioAssetObject.js
 * 
 * Uses THREE.PositionalAudio for spatial audio.
 */

import * as THREE from 'three';
import { ContentObject, ScriptAPI, ContentObjectOptions } from './ContentObject';

export interface AudioScriptAPI extends ScriptAPI {
  getAudio: () => HTMLAudioElement | null;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
}

export class AudioObject extends ContentObject {
  private audioElement: HTMLAudioElement | null = null;
  private positionalAudio: THREE.PositionalAudio | null = null;
  private audioListener: THREE.AudioListener | null = null;

  constructor(options: ContentObjectOptions) {
    super(options);
  }

  /**
   * Initialize the audio object.
   */
  public async init(): Promise<void> {
    const { content } = this;
    
    if (!content.audioUrl) {
      console.warn('AudioObject: No audio URL provided');
      return;
    }

    // Create audio element
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = content.audioUrl;
    this.audioElement.loop = content.loop ?? false;
    
    // Create audio listener and positional audio
    this.audioListener = new THREE.AudioListener();
    this.positionalAudio = new THREE.PositionalAudio(this.audioListener);
    
    // Create a group to hold the audio
    this.mesh = new THREE.Group();
    
    // Connect audio element to positional audio
    this.positionalAudio.setMediaElementSource(this.audioElement);
    this.positionalAudio.setRefDistance(1);
    
    this.mesh.add(this.positionalAudio);
    
    // Apply transform
    this.applyTransformToMesh();
    
    if (this.mesh) {
      this.mesh.userData.isContent = true;
      this.mesh.userData.contentId = this.uuid;
      this.mesh.userData.audioElement = this.audioElement;
    }
  }

  /**
   * Set the audio listener (usually from the camera).
   */
  public setAudioListener(listener: THREE.AudioListener): void {
    this.audioListener = listener;
    if (this.positionalAudio && this.audioElement) {
      // Reconnect with new listener
      if (this.positionalAudio.isPlaying) {
        this.positionalAudio.stop();
      }
      this.positionalAudio.setMediaElementSource(this.audioElement);
    }
  }

  /**
   * Called when the target becomes active.
   */
  public activate(): void {
    const content = this.getContent();
    
    if (content.autoplay && this.audioElement) {
      this.audioElement.play().catch(console.error);
    }
  }

  /**
   * Called when the target becomes inactive.
   */
  public deactivate(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Get the audio element.
   */
  public getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }

  /**
   * Create the script API wrapper.
   */
  public createScriptWrapper(): AudioScriptAPI {
    const api = super.createScriptWrapper() as AudioScriptAPI;
    const self = this;
    
    return {
      ...api,
      getAudio: () => self.audioElement,
      playVideo: () => self.audioElement?.play(),
      pauseVideo: () => self.audioElement?.pause(),
      stopVideo: () => {
        if (self.audioElement) {
          self.audioElement.pause();
          self.audioElement.currentTime = 0;
        }
      }
    };
  }

  /**
   * Dispose of resources.
   */
  public dispose(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    
    if (this.positionalAudio) {
      if (this.positionalAudio.isPlaying) {
        this.positionalAudio.stop();
      }
      this.positionalAudio.disconnect();
      this.positionalAudio = null;
    }
    
    super.dispose();
  }
}

export default AudioObject;
