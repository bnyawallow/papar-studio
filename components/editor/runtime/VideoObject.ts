/**
 * VideoObject - Handles video content in the scene.
 * Mirrors refcode/lib/src/scene/player/VideoAssetObject.js
 * 
 * Supports:
 * - Local video files
 * - Chroma key (green screen) effect
 * - Auto-play, loop, mute controls
 * - Click-to-toggle playback
 */

import * as THREE from 'three';
import { ContentObject, ScriptAPI, ContentObjectOptions } from './ContentObject';

export interface VideoScriptAPI extends ScriptAPI {
  getVideo: () => HTMLVideoElement | null;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setLoop: (loop: boolean) => void;
  isPlayingVideo: () => boolean;
}

export class VideoObject extends ContentObject {
  private videoElement: HTMLVideoElement | null = null;
  private videoTexture: THREE.VideoTexture | null = null;
  private material: THREE.Material | null = null;
  private chromaMaterial: THREE.ShaderMaterial | null = null;

  constructor(options: ContentObjectOptions) {
    super(options);
  }

  /**
   * Initialize the video object.
   */
  public async init(): Promise<void> {
    const { content } = this;
    
    if (!content.videoUrl) {
      console.warn('VideoObject: No video URL provided');
      return;
    }

    // Create video element
    this.videoElement = this.createVideoElement();
    
    // Load video
    await this.loadVideo(content.videoUrl);
    
    // Create texture from video
    this.videoTexture = new THREE.VideoTexture(this.videoElement);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.format = THREE.RGBAFormat;
    
    // Get aspect ratio
    const aspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
    
    // Create geometry
    const geometry = new THREE.PlaneGeometry(aspect, 1);
    
    // Create material (chroma key or regular)
    if (content.chromaKey && content.chromaColor) {
      this.material = this.createChromaMaterial(this.videoTexture, content.chromaColor);
      this.chromaMaterial = this.material as THREE.ShaderMaterial;
    } else {
      this.material = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        side: THREE.DoubleSide,
        toneMapped: false
      });
    }
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.applyTransformToMesh();
    
    if (this.mesh) {
      this.mesh.userData.isContent = true;
      this.mesh.userData.contentId = this.uuid;
      this.mesh.userData.videoElement = this.videoElement;
    }
  }

  /**
   * Create the video element.
   */
  private createVideoElement(): HTMLVideoElement {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = true; // Start muted for autoplay
    return video;
  }

  /**
   * Load video from URL.
   */
  private loadVideo(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.videoElement) {
        reject(new Error('Video element not created'));
        return;
      }

      this.videoElement.src = url;
      this.videoElement.load();

      const onCanPlay = () => {
        this.videoElement?.removeEventListener('canplay', onCanPlay);
        this.videoElement?.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        this.videoElement?.removeEventListener('canplay', onCanPlay);
        this.videoElement?.removeEventListener('error', onError);
        reject(new Error(`Failed to load video: ${url}`));
      };

      this.videoElement.addEventListener('canplay', onCanPlay);
      this.videoElement.addEventListener('error', onError);
    });
  }

  /**
   * Create chroma key shader material.
   */
  private createChromaMaterial(texture: THREE.Texture, keyColor: string): THREE.ShaderMaterial {
    const color = new THREE.Color(keyColor);
    
    return new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: texture },
        color: { value: color }
      },
      vertexShader: `
        varying mediump vec2 vUv;
        void main(void) {
          vUv = uv;
          mediump vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform mediump sampler2D tex;
        uniform mediump vec3 color;
        varying mediump vec2 vUv;
        void main(void) {
          mediump vec3 tColor = texture2D(tex, vUv).rgb;
          mediump float a = (length(tColor - color) - 0.5) * 7.0;
          gl_FragColor = vec4(tColor, a);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  /**
   * Called when the target becomes active.
   */
  public activate(): void {
    const content = this.getContent();
    
    if (content.autoplay && this.videoElement) {
      this.videoElement.play().catch(console.error);
    }
  }

  /**
   * Called when the target becomes inactive.
   */
  public deactivate(): void {
    if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  /**
   * Handle click events.
   */
  public onClick(scriptObject: ScriptAPI): void {
    const content = this.getContent();
    
    if (content.videoClickToggle && this.videoElement) {
      if (this.videoElement.paused) {
        this.videoElement.play();
      } else {
        this.videoElement.pause();
      }
    }
  }

  /**
   * Dummy trigger for iOS.
   */
  public async dummyTrigger(): Promise<void> {
    if (this.videoElement) {
      try {
        await this.videoElement.play();
        this.videoElement.pause();
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Get the video element.
   */
  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  /**
   * Create the script API wrapper.
   */
  public createScriptWrapper(): VideoScriptAPI {
    const api = super.createScriptWrapper() as VideoScriptAPI;
    const self = this;
    
    return {
      ...api,
      getVideo: () => self.videoElement,
      playVideo: () => self.videoElement?.play(),
      pauseVideo: () => self.videoElement?.pause(),
      stopVideo: () => {
        if (self.videoElement) {
          self.videoElement.pause();
          self.videoElement.currentTime = 0;
        }
      },
      seekTo: (seconds: number) => {
        if (self.videoElement) {
          self.videoElement.currentTime = seconds;
        }
      },
      setVolume: (volume: number) => {
        if (self.videoElement) {
          self.videoElement.volume = Math.max(0, Math.min(1, volume));
        }
      },
      setMuted: (muted: boolean) => {
        if (self.videoElement) {
          self.videoElement.muted = muted;
        }
      },
      setLoop: (loop: boolean) => {
        if (self.videoElement) {
          self.videoElement.loop = loop;
        }
      },
      isPlayingVideo: () => {
        return self.videoElement ? !self.videoElement.paused : false;
      }
    };
  }

  /**
   * Dispose of resources.
   */
  public dispose(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement = null;
    }
    
    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }
    
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    
    if (this.chromaMaterial) {
      this.chromaMaterial.dispose();
      this.chromaMaterial = null;
    }
    
    super.dispose();
  }
}

export default VideoObject;
