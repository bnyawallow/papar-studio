/**
 * Player - Main runtime orchestrator for the AR editor.
 * Mirrors refcode/lib/src/scene/player/Player.js
 * 
 * Responsibilities:
 * - Initialize THREE.js scene, camera, renderer
 * - Manage multiple targets (AR images)
 * - Handle content object lifecycle
 * - Coordinate animation loop
 * - Dispatch script events (onInit, onActivate, onDeactivate, onUpdate, onClick)
 * - Handle raycasting for object selection
 */

import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Target, Content, ContentType } from '../../../types';
import { ContentObject } from './ContentObject';
import { SceneObject, SceneScriptAPI, SystemControl } from './SceneObject';
import { EditorControls } from './EditorControls';
import { ImageObject } from './ImageObject';
import { VideoObject } from './VideoObject';
import { AudioObject } from './AudioObject';
import { ModelObject } from './ModelObject';
import { TextObject } from './TextObject';
import { EmbedObject } from './EmbedObject';

export interface PlayerOptions {
  container: HTMLElement;
  showImageTarget?: boolean;
}

export interface TargetRuntime {
  targetIndex: number;
  target: Target;
  subScene: THREE.Group;
  cssSubScene: THREE.Group;
  objects: ContentObject[];
  sceneObject: SceneObject;
  customFunctions: ScriptFunctions;
  customData: Record<string, any>;
}

export interface ScriptFunctions {
  onInit?: (params: ScriptEventParams) => void;
  onActivate?: (params: ScriptEventParams) => void;
  onDeactivate?: (params: ScriptEventParams) => void;
  onUpdate?: (params: ScriptEventParams) => void;
  onClick?: (params: ScriptEventParams & { object: any; time: number }) => void;
}

export interface ScriptEventParams {
  target: SceneScriptAPI;
  data: Record<string, any>;
  time?: number;
  deltaTime?: number;
}

export class Player {
  // Container and DOM
  private container: HTMLElement;
  private performanceDiv: HTMLDivElement | null = null;
  
  // THREE.js core
  private scene: THREE.Scene = new THREE.Scene();
  private cssScene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private defaultCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cssRenderer: CSS3DRenderer;
  
  // Animation
  private mixer: THREE.AnimationMixer;
  private clock: THREE.Clock | null = null;
  
  // Controls
  private editorControls: EditorControls | null = null;
  
  // State
  private targets: TargetRuntime[] = [];
  private selectedTarget: TargetRuntime | null = null;
  private isRunning: boolean = false;
  
  // Script state
  private onCustomScriptError: ((error: string) => void) | null = null;
  
  // Rendering
  private animationFrameId: number | null = null;
  private rendererResolve: ((renderer: THREE.WebGLRenderer) => void) | null = null;

  constructor(options: PlayerOptions) {
    this.container = options.container;
    
    // Create camera
    this.defaultCamera = this.createCamera();
    this.camera = this.defaultCamera;
    
    // Create renderer
    this.renderer = this.createRenderer();
    this.cssRenderer = this.createCssRenderer();
    
    // Create mixer
    this.mixer = new THREE.AnimationMixer(this.scene);
    
    // Initialize environment
    this.initEnvironment();
  }

  /**
   * Initialize the player with targets.
   */
  public async init(targets: Target[], showImageTarget: boolean = false): Promise<string[]> {
    // Create performance div
    this.performanceDiv = this.createPerformanceDiv();
    
    // Create editor controls
    this.editorControls = new EditorControls(this.camera, this.container);
    this.editorControls.enabled = true;
    
    // Add renderers to container
    this.container.appendChild(this.renderer.domElement);
    this.container.appendChild(this.cssRenderer.domElement);
    this.container.appendChild(this.performanceDiv);
    
    // Set up mouse events
    this.setupMouseEvents();
    
    // Initialize each target
    let invalidScripts: string[] = [];
    
    for (let i = 0; i < targets.length; i++) {
      const targetRuntime = await this.initTarget(targets[i], i, showImageTarget);
      this.targets.push(targetRuntime);
      
      if (!targetRuntime.customFunctions) {
        invalidScripts.push(`target ${i + 1}`);
      }
    }
    
    // Add CSS scenes
    for (const target of this.targets) {
      this.cssScene.add(target.cssSubScene);
    }
    
    this.cssRenderer.render(this.cssScene, this.camera);
    
    return invalidScripts;
  }

  /**
   * Initialize a single target.
   */
  private async initTarget(target: Target, targetIndex: number, showImageTarget: boolean): Promise<TargetRuntime> {
    const subScene = new THREE.Group();
    const cssSubScene = new THREE.Group();
    subScene.matrixAutoUpdate = false;
    cssSubScene.matrixAutoUpdate = false;
    
    // Add image target mesh if enabled
    if (showImageTarget && target.imageUrl) {
      const targetMesh = await this.createTargetMesh(target.imageUrl);
      if (targetMesh) {
        subScene.add(targetMesh);
      }
    }
    
    // Create content objects
    const contentObjects: ContentObject[] = [];
    
    for (const content of target.contents) {
      const contentObject = await this.createContentObject(content);
      if (contentObject) {
        await contentObject.init();
        
        // Add mesh to scene
        if (contentObject.mesh) {
          subScene.add(contentObject.mesh);
        }
        
        // Add CSS element to CSS scene
        if (contentObject.cssElement) {
          cssSubScene.add(contentObject.cssElement);
        }
        
        contentObjects.push(contentObject);
      }
    }
    
    // Initialize script
    const customFunctions = this.initScript(target.script);
    
    // Create scene object for script API
    const sceneObject = new SceneObject({
      objects: new Map(contentObjects.map(obj => [obj.name, obj]))
    });
    
    return {
      targetIndex,
      target,
      subScene,
      cssSubScene,
      objects: contentObjects,
      sceneObject,
      customFunctions: customFunctions || {},
      customData: {}
    };
  }

  /**
   * Create a target mesh from image URL.
   */
  private async createTargetMesh(imageUrl: string): Promise<THREE.Mesh | null> {
    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      loader.load(imageUrl, (texture) => {
        const aspect = texture.image.width / texture.image.height;
        const width = 1;
        const height = width / aspect;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = -0.01;
        resolve(mesh);
      }, undefined, () => resolve(null));
    });
  }

  /**
   * Create content object based on type.
   */
  private async createContentObject(content: Content): Promise<ContentObject | null> {
    const options = {
      content,
      mixer: this.mixer
    };
    
    switch (content.type) {
      case ContentType.IMAGE:
        return new ImageObject(options);
      case ContentType.VIDEO:
        return new VideoObject(options);
      case ContentType.AUDIO:
        return new AudioObject(options);
      case ContentType.MODEL:
        return new ModelObject(options);
      case ContentType.TEXT:
        return new TextObject(options);
      case ContentType.STREAMING_VIDEO:
      case ContentType.ICON_YOUTUBE:
        return new EmbedObject(options);
      default:
        console.warn(`Unknown content type: ${content.type}`);
        return null;
    }
  }

  /**
   * Initialize custom script.
   */
  private initScript(script: string | undefined): ScriptFunctions | null {
    if (!script) return null;
    
    const eventList = ['onInit', 'onActivate', 'onDeactivate', 'onUpdate', 'onClick'];
    const scriptWrapResultObj: Record<string, string> = {};
    eventList.forEach((key) => {
      scriptWrapResultObj[key] = key;
    });
    const scriptWrapParams = eventList.join(',');
    const scriptWrapResult = JSON.stringify(scriptWrapResultObj).replace(/"/g, '');
    
    try {
      const functions = (new Function(scriptWrapParams, script + '\nreturn ' + scriptWrapResult + ';'))();
      return functions as ScriptFunctions;
    } catch (e) {
      console.error('Error compiling custom script:', e);
      if (this.onCustomScriptError) {
        this.onCustomScriptError((e as Error).message);
      }
      return null;
    }
  }

  /**
   * Initialize scene environment.
   */
  private initEnvironment(): void {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  }

  /**
   * Create WebGL renderer.
   */
  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(window.devicePixelRatio);
    return renderer;
  }

  /**
   * Create CSS3D renderer.
   */
  private createCssRenderer(): CSS3DRenderer {
    return new CSS3DRenderer();
  }

  /**
   * Create camera.
   */
  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 100000);
    camera.position.set(0, 1000, 2000);
    camera.lookAt(new THREE.Vector3());
    return camera;
  }

  /**
   * Create performance div.
   */
  private createPerformanceDiv(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.bottom = '5px';
    div.style.left = '5px';
    div.style.color = 'white';
    div.style.fontSize = '12px';
    return div;
  }

  /**
   * Set up mouse events for object selection.
   */
  private setupMouseEvents(): void {
    const container = this.renderer.domElement;
    
    container.addEventListener('click', (e) => {
      this.handleClick(e);
    });
  }

  /**
   * Handle click events.
   */
  private handleClick(event: MouseEvent): void {
    if (!this.selectedTarget) return;
    
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    const point = [(x - rect.left) / rect.width, (y - rect.top) / rect.height];

    const mouse = new THREE.Vector2(point[0] * 2 - 1, -(point[1] * 2) + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const subScene = this.selectedTarget.subScene;
    const interestedObjects = subScene.children.filter((c) => 
      c.userData.isContent && c.visible
    );
    
    const intersects = raycaster.intersectObjects(interestedObjects, true);
    if (intersects.length === 0) return;

    let obj = intersects[0].object;
    while (obj.parent && !obj.userData.isContent) {
      obj = obj.parent;
    }
    
    if (obj.userData.isContent) {
      const contentId = obj.userData.contentId;
      const contentObject = this.selectedTarget.objects.find(o => o.uuid === contentId);
      
      if (contentObject) {
        this.dispatchTargetEvent(this.selectedTarget, 'onClick', {
          object: contentObject.createScriptWrapper(),
          time: this.clock?.elapsedTime || 0
        });
      }
    }
  }

  /**
   * Start a target (make it active).
   */
  public startTarget(targetIndex: number): void {
    this.stopTarget();
    
    const target = this.targets[targetIndex];
    if (!target) return;
    
    this.selectedTarget = target;
    
    // Add target scene
    this.scene.add(target.subScene);
    this.cssScene.add(target.cssSubScene);
    
    // Activate all content objects
    target.objects.forEach((obj) => {
      obj.activate();
    });
    
    // Start clock
    this.clock = new THREE.Clock();
    
    // Dispatch onActivate event
    this.dispatchTargetEvent(target, 'onActivate', {});
    
    // Start animation loop
    this.startAnimationLoop();
  }

  /**
   * Stop the current target.
   */
  public stopTarget(): void {
    if (!this.selectedTarget) return;
    
    const target = this.selectedTarget;
    
    // Deactivate all content objects
    target.objects.forEach((obj) => {
      obj.deactivate();
    });
    
    // Dispatch onDeactivate event
    this.dispatchTargetEvent(target, 'onDeactivate', {});
    
    // Stop animation
    this.renderer.setAnimationLoop(null);
    this.renderer.clear();
    this.mixer.uncacheRoot(target.subScene);
    
    // Remove from scene
    this.scene.remove(target.subScene);
    this.selectedTarget = null;
  }

  /**
   * Start the animation loop.
   */
  private startAnimationLoop(): void {
    this.renderer.setAnimationLoop(() => {
      const delta = this.clock?.getDelta() || 0;
      const elapsed = this.clock?.elapsedTime || 0;
      
      // Update mixer
      this.mixer.update(delta);
      
      // Dispatch onUpdate event
      if (this.selectedTarget) {
        this.dispatchTargetEvent(this.selectedTarget, 'onUpdate', {
          time: elapsed,
          deltaTime: delta
        });
      }
      
      // Render
      this.renderer.render(this.scene, this.camera);
      this.cssRenderer.render(this.cssScene, this.camera);
      
      // Resolve renderer promise
      if (this.rendererResolve) {
        this.rendererResolve(this.renderer);
        this.rendererResolve = null;
      }
    });
  }

  /**
   * Dispatch event to target's custom script.
   */
  private dispatchTargetEvent(target: TargetRuntime, name: string, extra: Record<string, any> = {}): void {
    const params = Object.assign(
      { target: target.sceneObject.createScriptObject(), data: target.customData },
      extra
    );
    
    if (target.customFunctions[name as keyof ScriptFunctions]) {
      try {
        const fn = target.customFunctions[name as keyof ScriptFunctions];
        if (typeof fn === 'function') {
          fn(params as any);
        }
      } catch (e) {
        console.error(`Script error in ${name}:`, e);
        if (this.onCustomScriptError) {
          this.onCustomScriptError((e as Error).message);
        }
      }
    }
  }

  /**
   * Switch to AR mode.
   */
  public switchToAR(camera: THREE.Camera): void {
    this.camera = camera as unknown as THREE.PerspectiveCamera;
    if (this.editorControls) {
      this.editorControls.enabled = false;
    }
  }

  /**
   * Switch to anchor (editor) mode.
   */
  public switchToAnchor(): void {
    if (this.editorControls) {
      this.editorControls.enabled = true;
    }
    
    this.camera = this.defaultCamera;
    this.camera.position.set(0, 1000, 2000);
    this.camera.lookAt(new THREE.Vector3());
    
    // Reset all anchors
    for (const target of this.targets) {
      target.subScene.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      target.cssSubScene.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
  }

  /**
   * Trigger dummy playback for audio/video (for iOS).
   */
  public async dummyTrigger(): Promise<void> {
    for (const target of this.targets) {
      for (const obj of target.objects) {
        await obj.dummyTrigger();
      }
    }
  }

  /**
   * Request the renderer inside the animation loop.
   */
  public requestRenderer(): Promise<THREE.WebGLRenderer> {
    return new Promise((resolve) => {
      this.rendererResolve = resolve;
    });
  }

  /**
   * Resize the renderer.
   */
  public resizeUI(): void {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    
    this.renderer.setSize(width, height);
    this.cssRenderer.setSize(width, height);
    
    // Update camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Set custom script error handler.
   */
  public setOnCustomScriptError(handler: (error: string) => void): void {
    this.onCustomScriptError = handler;
  }

  /**
   * Get the renderer.
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Get the scene.
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the camera.
   */
  public getCamera(): THREE.Camera {
    return this.camera;
  }

  /**
   * Get editor controls.
   */
  public getEditorControls(): EditorControls | null {
    return this.editorControls;
  }

  /**
   * Dispose of all resources.
   */
  public dispose(): void {
    this.stopTarget();
    
    for (const target of this.targets) {
      for (const obj of target.objects) {
        obj.dispose();
      }
      target.sceneObject.clear();
    }
    
    this.scene.clear();
    this.mixer.uncacheRoot(this.scene);
    this.renderer.dispose();
    
    if (this.editorControls) {
      this.editorControls.dispose();
    }
  }
}

export default Player;
