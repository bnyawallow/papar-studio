
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Target, Content, ContentType } from '../../types';
import { ContentObject, VideoObject, EmbedObject, ModelObject, AudioObject } from './runtime/RuntimeObjects';

export const useScriptEngine = (
  target: Target | undefined,
  contentRefs: React.MutableRefObject<Map<string, THREE.Object3D>>,
  isRunning: boolean
) => {
  const { gl, scene, camera } = useThree();
  const [error, setError] = useState<Error | null>(null);
  
  const scriptState = useRef<{
    functions: any;
    data: any;
    sceneObject: any;
    objectWrappers: Map<string, ContentObject>; // Store the wrapper instances
  } | null>(null);

  // Helper to create the correct wrapper based on content type
  const createWrapper = (content: Content, mesh: THREE.Object3D) => {
      const type = content.type;
      
      // Check userData for specific capabilities attached during ScenePanel render
      // This bridges the React components' internal state (players) with this imperative engine
      const userData = mesh.userData;

      if (type === ContentType.VIDEO && userData.videoElement) {
          return new VideoObject(content.id, content.name, mesh as THREE.Mesh, userData.videoElement);
      }
      
      if ((type === ContentType.STREAMING_VIDEO || type === ContentType.ICON_YOUTUBE) && userData.player) {
          return new EmbedObject(content.id, content.name, mesh, userData.player);
      }

      if (type === ContentType.MODEL && userData.actions) {
          return new ModelObject(content.id, content.name, mesh as THREE.Group, userData.actions);
      }

      if (type === ContentType.AUDIO && userData.audioElement) {
          return new AudioObject(content.id, content.name, mesh, userData.audioElement);
      }

      // Default generic object (Image, Text, or generic)
      return new ContentObject(content.id, content.name, mesh);
  };

  // Reset when target changes or script stops
  useEffect(() => {
    if (!isRunning || !target) {
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
      if (!isRunning && target) {
          setError(null);
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
  }, [isRunning, target]);

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
    const objectWrappers = new Map<string, ContentObject>();

    const getObjectByName = (name: string) => {
      if (objectWrappers.has(name)) return objectWrappers.get(name)?.getScriptWrapper();

      const content = target.contents.find((c) => c.name === name);
      if (!content) return null;
      
      const mesh = contentRefs.current.get(content.id);
      if (!mesh) return null;

      const wrapper = createWrapper(content, mesh);
      objectWrappers.set(name, wrapper);
      return wrapper.getScriptWrapper();
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
      const scriptContent = target.script || '';
      const functions = (new Function(scriptWrapParams, scriptContent + '\nreturn ' + scriptWrapResult + ';'))();
      
      const state = {
        functions,
        data: {},
        sceneObject,
        objectWrappers
      };
      
      scriptState.current = state;

      if (functions.onInit) {
          try {
              functions.onInit({ target: sceneObject, data: state.data });
          } catch (e) {
              console.error("Script onInit error:", e);
              setError(e instanceof Error ? e : new Error(String(e)));
          }
      }

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
        if (!error) {
            console.error("Script onUpdate error:", e);
            setError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    }
  });

  const handleScriptClick = useCallback((content: Content) => {
      if (!isRunning || !scriptState.current) return false;

      const functions = scriptState.current.functions;
      if (functions.onClick) {
          // Initialize wrapper if not already done via getObject
          let wrapper = scriptState.current.objectWrappers.get(content.name);
          if (!wrapper) {
             const mesh = contentRefs.current.get(content.id);
             if (mesh) {
                wrapper = createWrapper(content, mesh);
                scriptState.current.objectWrappers.set(content.name, wrapper);
             }
          }

          if (wrapper) {
              try {
                  functions.onClick({ 
                      target: scriptState.current.sceneObject,
                      data: scriptState.current.data,
                      object: wrapper.getScriptWrapper(),
                      time: performance.now() / 1000 
                    });
              } catch (e) {
                  console.error("Script onClick error:", e);
                  setError(e instanceof Error ? e : new Error(String(e)));
              }
              return true; 
          }
      }
      return false;
  }, [isRunning, error]);

  return { handleScriptClick, error };
};
