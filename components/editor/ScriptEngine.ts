
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Target, Content } from '../../types';

// Helper to convert degrees to radians for the script API which likely expects degrees based on refcode usage,
// but Three.js uses radians. Refcode ContentObject.js:
// setRotation: (x, y, z) => { ... obj.mesh.rotation.x = x * THREE.MathUtils.DEG2RAD; ... }
// So the script API expects DEGREES.

const createScriptObject = (name: string, uuid: string, mesh: THREE.Object3D) => {
  // State mirroring refcode's ContentObject
  // We use getters to ensure the script always gets the latest values from the mesh,
  // allowing for things like object.position.x += 1 in loop.
  const api: any = {
    uuid: uuid,
    name: name,
    mesh: mesh,
    // Methods
    setPosition: (x: number, y: number, z: number) => {
      if (api.mesh) {
          api.mesh.position.set(x, y, z);
      }
    },

    setRotation: (x: number, y: number, z: number) => {
      if (api.mesh) {
          api.mesh.rotation.set(
              x * THREE.MathUtils.DEG2RAD,
              y * THREE.MathUtils.DEG2RAD,
              z * THREE.MathUtils.DEG2RAD
          );
      }
    },

    setScale: (x: number, y: number, z: number) => {
      if (api.mesh) {
          api.mesh.scale.set(x, y, z);
      }
    },

    setVisible: (visible: boolean) => {
      if (api.mesh) {
          api.mesh.visible = visible;
      }
    },
    
    // Audio specific (from AudioAssetObject.js)
    getAudio: () => {
       return api.mesh.userData.audioElement;
    },

    // Video specific
    getVideo: () => {
        return api.mesh.userData.videoElement;
    },
    
    playVideo: () => {
        const player = api.mesh.userData.player;
        if (player && player.playVideo) player.playVideo();
    },
    
    pauseVideo: () => {
        const player = api.mesh.userData.player;
        if (player && player.pauseVideo) player.pauseVideo();
    },

    stopVideo: () => {
        const player = api.mesh.userData.player;
        if (player && player.stopVideo) player.stopVideo();
    },

    seekTo: (seconds: number) => {
        const player = api.mesh.userData.player;
        if (player && player.seekTo) player.seekTo(seconds);
    },

    setVolume: (volume: number) => {
        const player = api.mesh.userData.player;
        if (player && player.setVolume) player.setVolume(volume);
    },

    setMuted: (muted: boolean) => {
        const player = api.mesh.userData.player;
        if (player && player.setMuted) player.setMuted(muted);
    },

    setLoop: (loop: boolean) => {
        const player = api.mesh.userData.player;
        if (player && player.setLoop) player.setLoop(loop);
    },

    setFullscreen: (fullscreen: boolean) => {
        const player = api.mesh.userData.player;
        if (player && player.setFullscreen) player.setFullscreen(fullscreen);
    },

    isPlayingVideo: () => {
        const player = api.mesh.userData.player;
        if (player && player.isPlaying) return player.isPlaying();
        return false;
    },

    // Animation specific (GLB)
    getAction: (nameOrIndex: string | number = 0) => {
        const actions = api.mesh.userData.actions;
        const animations = api.mesh.userData.animations;
        
        if (!actions || !animations) return null;

        let action;
        if (typeof nameOrIndex === 'number') {
            if (animations[nameOrIndex]) {
                action = actions[animations[nameOrIndex].name];
            }
        } else {
            action = actions[nameOrIndex];
        }
        
        return action; // Return the Three.js AnimationAction
    },

    // Texture Swapping (GLB) - Matches refcode GLBAssetObject.js
    updateTexture: (materialName: string, imageUrl: string) => {
        if (!imageUrl || !api.mesh) return;

        const textureLoader = new THREE.TextureLoader();
        // Load texture first
        textureLoader.load(imageUrl, (texture) => {
            // Flip Y is usually needed for GLTF models if the texture is raw image
            texture.flipY = false; 
            
            api.mesh.traverse((o: any) => {
                if (o.isMesh && o.material) {
                    // Handle both single material and array of materials
                    const materials = Array.isArray(o.material) ? o.material : [o.material];
                    
                    materials.forEach((mat: any) => {
                        if (mat.name === materialName) {
                            if (mat.map) mat.map.dispose();
                            mat.map = texture;
                            mat.needsUpdate = true;
                        }
                    });
                }
            });
        });
    }
  };

  // Define properties with getters/setters to sync with Three.js mesh
  Object.defineProperties(api, {
      position: {
          get: () => ({
              x: api.mesh.position.x,
              y: api.mesh.position.y,
              z: api.mesh.position.z
          }),
          set: (v: {x: number, y: number, z: number}) => api.mesh.position.set(v.x, v.y, v.z)
      },
      rotation: {
          get: () => ({
              x: THREE.MathUtils.radToDeg(api.mesh.rotation.x),
              y: THREE.MathUtils.radToDeg(api.mesh.rotation.y),
              z: THREE.MathUtils.radToDeg(api.mesh.rotation.z)
          }),
          set: (v: {x: number, y: number, z: number}) => api.mesh.rotation.set(
              v.x * THREE.MathUtils.DEG2RAD,
              v.y * THREE.MathUtils.DEG2RAD,
              v.z * THREE.MathUtils.DEG2RAD
          )
      },
      scale: {
          get: () => ({
              x: api.mesh.scale.x,
              y: api.mesh.scale.y,
              z: api.mesh.scale.z
          }),
          set: (v: {x: number, y: number, z: number}) => api.mesh.scale.set(v.x, v.y, v.z)
      },
      visible: {
          get: () => api.mesh.visible,
          set: (v: boolean) => { api.mesh.visible = v; }
      },
      loop: {
          get: () => {
              const player = api.mesh.userData.player;
              if (player && player.getLoop) return player.getLoop();
              return false;
          },
          set: (v: boolean) => {
              const player = api.mesh.userData.player;
              if (player && player.setLoop) player.setLoop(v);
          }
      }
  });

  return api;
};

export const useScriptEngine = (
  target: Target | undefined,
  contentRefs: React.MutableRefObject<Map<string, THREE.Object3D>>,
  isRunning: boolean
) => {
  const { gl, scene, camera } = useThree();
  const [error, setError] = useState<Error | null>(null);
  
  const scriptState = useRef<{
    functions: any;
    data: any; // Custom data storage for the script
    sceneObject: any;
    objectWrappers: Map<string, any>;
  } | null>(null);

  // Reset when target changes or script stops
  useEffect(() => {
    if (!isRunning || !target) {
      // Stop logic: trigger onDeactivate if state exists
      if (scriptState.current && scriptState.current.functions && scriptState.current.functions.onDeactivate) {
          try {
              scriptState.current.functions.onDeactivate({
                  target: scriptState.current.sceneObject,
                  data: scriptState.current.data
              });
          } catch (e) {
              console.error("Script onDeactivate error:", e);
              setError(e instanceof Error ? e : new Error(String(e)));
          }
      }

      scriptState.current = null;
      
      // Reset objects to their original state from props
      // This is important so stopping the script resets the scene
      if (!isRunning && target) {
          setError(null); // Clear errors on stop
          target.contents.forEach(content => {
              const mesh = contentRefs.current.get(content.id);
              if (mesh) {
                  mesh.position.set(...content.transform.position);
                  mesh.rotation.set(
                      THREE.MathUtils.degToRad(content.transform.rotation[0]),
                      THREE.MathUtils.degToRad(content.transform.rotation[1]),
                      THREE.MathUtils.degToRad(content.transform.rotation[2])
                  );
                  mesh.scale.set(...content.transform.scale);
                  mesh.visible = content.visible ?? true;
              }
          });
      }
      return;
    }

    if (target.script) {
      initScript(target);
    }
  }, [isRunning, target]); // We depend on 'target' identity, so if user saves/updates, we might re-init if running.

  const captureScreen = useCallback(() => {
      if (!gl) return;
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `capture_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }, [gl, scene, camera]);

  const openUrl = useCallback((url: string) => {
      window.open(url, '_blank');
  }, []);

  const initScript = (target: Target) => {
    setError(null);
    const objectWrappers = new Map<string, any>();

    const getObjectByName = (name: string) => {
      if (objectWrappers.has(name)) return objectWrappers.get(name);

      const content = target.contents.find((c) => c.name === name);
      if (!content) return null;
      
      const mesh = contentRefs.current.get(content.id);
      if (!mesh) return null;

      const wrapper = createScriptObject(content.name, content.id, mesh);
      objectWrappers.set(name, wrapper);
      return wrapper;
    };

    const sceneObject = {
      getObject: getObjectByName,
      captureScreen: captureScreen,
      openUrl: openUrl
    };

    const eventList = ['onInit', 'onActivate', 'onDeactivate', 'onUpdate', 'onClick'];
    let scriptWrapResultObj: any = {};
    eventList.forEach((eventKey) => {
      scriptWrapResultObj[eventKey] = eventKey;
    });
    let scriptWrapParams = eventList.join(',');
    let scriptWrapResult = JSON.stringify(scriptWrapResultObj).replace(/\"/g, '');

    try {
      // Compile
      const scriptContent = target.script || '';
      const functions = (new Function(scriptWrapParams, scriptContent + '\nreturn ' + scriptWrapResult + ';'))();
      
      const state = {
        functions,
        data: {},
        sceneObject,
        objectWrappers
      };
      
      scriptState.current = state;

      // Trigger onInit
      if (functions.onInit) {
          try {
              functions.onInit({ target: sceneObject, data: state.data });
          } catch (e) {
              console.error("Script onInit error:", e);
              setError(e instanceof Error ? e : new Error(String(e)));
          }
      }

      // Trigger onActivate
      if (functions.onActivate) {
          try {
              functions.onActivate({ target: sceneObject, data: state.data });
          } catch (e) {
              console.error("Script onActivate error:", e);
              setError(e instanceof Error ? e : new Error(String(e)));
          }
      }

    } catch (e) {
      console.error("Error compiling custom script:", e);
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  // Frame Loop
  useFrame((state, delta) => {
    if (isRunning && scriptState.current && scriptState.current.functions.onUpdate) {
      try {
        scriptState.current.functions.onUpdate({
          target: scriptState.current.sceneObject,
          data: scriptState.current.data,
          time: state.clock.elapsedTime,
          deltaTime: delta
        });
      } catch (e) {
        // Only set error if it's not already set to prevent loops
        if (!error) {
            console.error("Script onUpdate error:", e);
            setError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    }
  });

  const handleScriptClick = useCallback((content: Content) => {
      if (!isRunning || !scriptState.current) return false; // Return false to allow default handlers

      const functions = scriptState.current.functions;
      if (functions.onClick) {
          // Ensure wrapper exists
          const wrapper = scriptState.current.sceneObject.getObject(content.name);
          if (wrapper) {
              try {
                  // Refcode passes { object: wrapper, time: ... }
                  functions.onClick({ 
                      target: scriptState.current.sceneObject, // It seems refcode passes target as sceneObject in _dispatchTargetEvent
                      data: scriptState.current.data,
                      object: wrapper,
                      time: performance.now() / 1000 
                    });
              } catch (e) {
                  console.error("Script onClick error:", e);
                  setError(e instanceof Error ? e : new Error(String(e)));
              }
              return true; // Handled
          }
      }
      return false;
  }, [isRunning, error]);

  return { handleScriptClick, error };
};
