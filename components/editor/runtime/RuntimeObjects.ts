
import * as THREE from 'three';
import { Content } from '../../../types';

/**
 * Base class representing a content object in the runtime.
 * Mirrors refcode/lib/src/scene/player/ContentObject.js
 */
export class ContentObject {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public mesh: THREE.Object3D
  ) {}

  getScriptWrapper() {
    const self = this;
    const api: any = {
      uuid: self.id,
      name: self.name,
      // Expose the mesh primarily for internal debugging, 
      // but users might access it if they know Three.js
      mesh: self.mesh, 
      
      // Transform Getters
      get position() { return self.mesh.position; },
      get rotation() { 
          // Convert radians to degrees for the script interface to match Editor UI
          return {
              x: THREE.MathUtils.radToDeg(self.mesh.rotation.x),
              y: THREE.MathUtils.radToDeg(self.mesh.rotation.y),
              z: THREE.MathUtils.radToDeg(self.mesh.rotation.z)
          };
      },
      get scale() { return self.mesh.scale; },
      get visible() { return self.mesh.visible; },

      // Transform Setters
      setPosition: (x: number, y: number, z: number) => {
        self.mesh.position.set(x, y, z);
      },
      setRotation: (x: number, y: number, z: number) => {
        self.mesh.rotation.set(
            THREE.MathUtils.degToRad(x),
            THREE.MathUtils.degToRad(y),
            THREE.MathUtils.degToRad(z)
        );
      },
      setScale: (x: number, y: number, z: number) => {
        self.mesh.scale.set(x, y, z);
      },
      setVisible: (visible: boolean) => {
        self.mesh.visible = visible;
      }
    };
    return api;
  }
}

/**
 * Mirrors refcode/lib/src/scene/player/VideoAssetObject.js
 */
export class VideoObject extends ContentObject {
  constructor(id: string, name: string, mesh: THREE.Mesh, public videoElement: HTMLVideoElement) {
    super(id, name, mesh);
  }

  getScriptWrapper() {
    const api = super.getScriptWrapper();
    Object.assign(api, {
      getVideo: () => this.videoElement,
      playVideo: () => this.videoElement.play(),
      pauseVideo: () => this.videoElement.pause(),
      stopVideo: () => {
        this.videoElement.pause();
        this.videoElement.currentTime = 0;
      },
      seekTo: (time: number) => { this.videoElement.currentTime = time; },
      setVolume: (vol: number) => { this.videoElement.volume = vol; },
      setMuted: (muted: boolean) => { this.videoElement.muted = muted; },
      setLoop: (loop: boolean) => { this.videoElement.loop = loop; },
      isPlayingVideo: () => !this.videoElement.paused
    });
    return api;
  }
}

/**
 * Mirrors refcode/lib/src/scene/player/EmbedContentObject.js (ReactPlayer wrapper)
 */
export class EmbedObject extends ContentObject {
  // We use a generic player interface to talk to ReactPlayer
  constructor(id: string, name: string, mesh: THREE.Object3D, public playerRef: any) {
    super(id, name, mesh);
  }

  getScriptWrapper() {
    const api = super.getScriptWrapper();
    Object.assign(api, {
       playVideo: () => this.playerRef?.playVideo(),
       pauseVideo: () => this.playerRef?.pauseVideo(),
       stopVideo: () => this.playerRef?.stopVideo(),
       seekTo: (t: number) => this.playerRef?.seekTo(t),
       setVolume: (v: number) => this.playerRef?.setVolume(v),
       setMuted: (m: boolean) => this.playerRef?.setMuted(m),
       setLoop: (l: boolean) => this.playerRef?.setLoop(l),
       isPlayingVideo: () => this.playerRef?.isPlaying()
    });
    return api;
  }
}

/**
 * Mirrors refcode/lib/src/scene/player/GLBAssetObject.js
 */
export class ModelObject extends ContentObject {
  constructor(
      id: string, 
      name: string, 
      mesh: THREE.Group, 
      public actions: { [key: string]: THREE.AnimationAction }
  ) {
    super(id, name, mesh);
  }

  getScriptWrapper() {
    const api = super.getScriptWrapper();
    Object.assign(api, {
      getAction: (nameOrIndex: string | number = 0) => {
         if (typeof nameOrIndex === 'number') {
             const keys = Object.keys(this.actions);
             return this.actions[keys[nameOrIndex]];
         }
         return this.actions[nameOrIndex];
      },
      updateTexture: (materialName: string, imageUrl: string) => {
         if (!imageUrl) return;
         const loader = new THREE.TextureLoader();
         loader.load(imageUrl, (tex) => {
             tex.flipY = false;
             tex.colorSpace = THREE.SRGBColorSpace;
             this.mesh.traverse((child: any) => {
                 if (child.isMesh && child.material && child.material.name === materialName) {
                     // Handle multi-material or single material
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
    });
    return api;
  }
}

export class AudioObject extends ContentObject {
    constructor(id: string, name: string, mesh: THREE.Object3D, public audioEl: HTMLAudioElement) {
        super(id, name, mesh);
    }
    
    getScriptWrapper() {
        const api = super.getScriptWrapper();
        Object.assign(api, {
            getAudio: () => this.audioEl,
            playVideo: () => this.audioEl.play(), // Alias for consistency
            pauseVideo: () => this.audioEl.pause(),
            stopVideo: () => { this.audioEl.pause(); this.audioEl.currentTime = 0; }
        });
        return api;
    }
}
