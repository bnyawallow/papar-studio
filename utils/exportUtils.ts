
import { Project, Target, Content, ContentType } from '@/types';
import JSZip from 'jszip';

export const generateProjectJson = (project: Project, masterMindFileUrl: string | null = null) => {
  return {
    name: project.name,
    mindARConfig: project.mindARConfig || {
        maxTrack: 1,
        warmupTolerance: 5,
        missTolerance: 5,
        filterMinCF: 0.0001,
        filterBeta: 0.001
    },
    mindFile: masterMindFileUrl, 
    targets: project.targets
  };
};

/**
 * Generates a structured JSON for AR apps (instead of HTML).
 * This allows native AR apps to consume the project data.
 */
export const generateARJson = (
  project: Project,
  localAssetMap?: Map<string, string>,
  mindFileUrls?: string[]
): object => {
  const config = project.mindARConfig || {
    maxTrack: 1,
    warmupTolerance: 5,
    missTolerance: 5,
    filterMinCF: 0.0001,
    filterBeta: 0.001
  };

  // Deep copy project to prepare for export
  const exportProject = JSON.parse(JSON.stringify(project)) as Project;

  // Map assets to local paths if provided
  if (localAssetMap) {
    exportProject.targets.forEach(target => {
      target.contents.forEach(content => {
        const localPath = localAssetMap.get(content.id);
        if (localPath) {
          if (content.type === ContentType.IMAGE) content.imageUrl = localPath;
          if (content.type === ContentType.VIDEO) content.videoUrl = localPath;
          if (content.type === ContentType.AUDIO) content.audioUrl = localPath;
          if (content.type === ContentType.MODEL) content.modelUrl = localPath;
        }
      });
    });
  }

  // Convert targets to AR-friendly format
  const arTargets = exportProject.targets.map((target, index) => {
    const targetJson: any = {
      id: target.id,
      name: target.name,
      imageUrl: `targets/target_${index}.jpg`,
      trackingFile: `targets/target_${index}.mind`,
      contents: target.contents.map(content => ({
        id: content.id,
        name: content.name,
        type: content.type,
        transform: content.transform,
        url: getContentUrl(content),
        visible: content.visible ?? true,
        alwaysFacingUser: content.alwaysFacingUser ?? false,
        // Type-specific properties
        ...getContentProperties(content)
      })),
      visible: target.visible ?? true
    };

    // Add script if present
    if (target.script) {
      targetJson.script = `scripts/target_${index}.json`;
    }

    return targetJson;
  });

  return {
    version: "1.0",
    id: project.id,
    name: project.name,
    created: project.lastUpdated,
    updated: new Date().toISOString(),
    config: {
      trackingType: "image",
      maxTrack: config.maxTrack,
      warmupTolerance: config.warmupTolerance,
      missTolerance: config.missTolerance
    },
    targets: arTargets
  };
};

/**
 * Helper to get the URL for a content item
 */
function getContentUrl(content: Content): string {
  switch (content.type) {
    case ContentType.IMAGE:
      return content.imageUrl || '';
    case ContentType.VIDEO:
      return content.videoUrl || '';
    case ContentType.AUDIO:
      return content.audioUrl || '';
    case ContentType.MODEL:
      return content.modelUrl || '';
    default:
      return '';
  }
}

/**
 * Helper to get type-specific properties for a content item
 */
function getContentProperties(content: Content): object {
  switch (content.type) {
    case ContentType.VIDEO:
      return {
        autoplay: content.autoplay ?? false,
        loop: content.loop ?? true,
        muted: content.muted ?? true,
        videoClickToggle: content.videoClickToggle ?? false,
        videoControls: content.videoControls ?? false,
        chromaKey: content.chromaKey ?? false,
        chromaColor: content.chromaColor
      };
    case ContentType.AUDIO:
      return {
        autoplay: content.autoplay ?? false,
        loop: content.loop ?? true
      };
    case ContentType.MODEL:
      return {
        animateAutostart: content.animateAutostart ?? true,
        animateLoop: content.animateLoop ?? 'repeat',
        materialOverrides: content.materialOverrides
      };
    case ContentType.TEXT:
      return {
        color: content.color,
        font: content.font,
        size: content.size,
        textContent: content.textContent,
        align: content.align
      };
    default:
      return {};
  }
}

/**
 * Converts JavaScript script to JSON action format for AR apps
 * Improved parser that handles comments, multi-line scripts, and various formats
 */
export const generateScriptJson = (script: string | undefined): object => {
  if (!script) {
    return {};
  }

  // Default action structure
  const actions: Record<string, any[]> = {
    onInit: [],
    onActivate: [],
    onDeactivate: [],
    onUpdate: [],
    onClick: []
  };

  // Track parsing warnings
  const warnings: string[] = [];

  // Normalize script - remove comments and extra whitespace
  let normalized = script
    .replace(/\/\/.*$/gm, '')  // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
    .replace(/`[^`]*`/g, (match) => '"'.repeat(match.length))  // Replace template literals
    .replace(/\n+/g, '\n')  // Normalize newlines
    .trim();

  if (!normalized) {
    return {};
  }

  // Try to parse the script and extract action calls
  try {
    // Define action patterns with their corresponding handler
    const actionPatterns = [
      { 
        pattern: /play\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'play',
        handlers: ['onInit', 'onActivate']
      },
      { 
        pattern: /pause\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'pause',
        handlers: ['onDeactivate']
      },
      { 
        pattern: /stop\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'stop',
        handlers: ['onDeactivate']
      },
      { 
        pattern: /show\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'show',
        handlers: ['onActivate']
      },
      { 
        pattern: /hide\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'hide',
        handlers: ['onDeactivate']
      },
      { 
        pattern: /openUrl\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, 
        action: 'openUrl',
        handlers: ['onClick']
      }
    ];

    for (const { pattern, action, handlers } of actionPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(normalized)) !== null) {
        const targetName = match[1];
        if (!targetName || targetName.trim() === '') {
          warnings.push(`Found ${action}() call with empty target`);
          continue;
        }
        
        for (const handler of handlers) {
          if (action === 'openUrl') {
            actions[handler].push({ action, url: targetName });
          } else {
            actions[handler].push({ action, target: targetName });
          }
        }
      }
    }

    // Extract transform operations
    const transformPatterns = [
      { pattern: /setPosition\s*\(\s*([^)]+)\s*\)/g, action: 'setPosition' },
      { pattern: /setRotation\s*\(\s*([^)]+)\s*\)/g, action: 'setRotation' },
      { pattern: /setScale\s*\(\s*([^)]+)\s*\)/g, action: 'setScale' }
    ];

    for (const { pattern, action } of transformPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(normalized)) !== null) {
        const argsStr = match[1];
        const args = argsStr.split(',').map((s: string) => {
          const trimmed = s.trim();
          const num = parseFloat(trimmed);
          return isNaN(num) ? trimmed : num;
        });
        actions.onInit.push({ action, target: 'self', values: args });
      }
    }

    // Log warnings for debugging
    if (warnings.length > 0) {
      console.warn('Script parsing warnings:', warnings);
    }

  } catch (e) {
    console.warn('Could not parse script, returning empty actions:', e);
  }

  // Remove empty arrays
  Object.keys(actions).forEach(key => {
    if (actions[key].length === 0) {
      delete actions[key];
    }
  });

  return actions;
};

/**
 * Generates a standalone HTML file using MindAR + Three.js + CSS3DRenderer
 * Includes a Player architecture similar to the refcode for scripting and asset management.
 * @param project - The project to export
 * @param localAssetMap - Optional map of local asset paths
 * @param mindFileUrl - URL to the compiled mind file
 * @param enableDebug - Whether to enable debug overlay in the published app
 */
export const generateAFrameHtml = (project: Project, localAssetMap?: Map<string, string>, mindFileUrl: string = './targets.mind', enableDebug: boolean = false): string => {
    const config = project.mindARConfig || {
        maxTrack: 1,
        warmupTolerance: 5,
        missTolerance: 5,
        filterMinCF: 0.0001,
        filterBeta: 0.001
    };

    // Deep copy project to prepare for export (replacing URLs with local paths)
    const exportProject = JSON.parse(JSON.stringify(project)) as Project;

    // Map assets to local paths if provided (for ZIP export)
    if (localAssetMap) {
        exportProject.targets.forEach(target => {
            target.contents.forEach(content => {
                const localPath = localAssetMap.get(content.id);
                if (localPath) {
                    if (content.type === ContentType.IMAGE) content.imageUrl = localPath;
                    if (content.type === ContentType.VIDEO) content.videoUrl = localPath;
                    if (content.type === ContentType.AUDIO) content.audioUrl = localPath;
                    if (content.type === ContentType.MODEL) content.modelUrl = localPath;
                }
            });
        });
    }

    const projectDataString = JSON.stringify(exportProject);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${project.name}</title>
  <style>
    body { margin: 0; overflow: hidden; font-family: sans-serif; }
    #container { width: 100vw; height: 100vh; position: relative; overflow: hidden; z-index: 1; }
    #ui-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
    #start-screen {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        pointer-events: auto; z-index: 999;
        transition: opacity 0.5s;
    }
    #start-btn {
        padding: 18px 40px; font-size: 20px; font-weight: bold;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 50px;
        cursor: pointer; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    #start-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
    }
    #start-btn:disabled {
        background: #666; cursor: not-allowed; transform: none;
    }
    #loading-status { color: #aaa; margin-top: 15px; font-size: 14px; }
    .hidden { opacity: 0 !important; pointer-events: none !important; }
    
    /* CSS3D Renderer Container */
    #css-container {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;
    }
    
    /* MindAR UI Overrides - Show scanner overlay */
    .mindar-ui-loading { display: flex !important; }
    .mindar-ui-scanning { display: flex !important; }
  </style>
  
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
      "mindar-image-three": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js"
    }
  }
  </script>
</head>
<body>
  <div id="container"></div>
  <div id="css-container"></div>
  
  <div id="ui-layer">
      <div id="start-screen">
          <h1 style="color: white; font-size: 28px; margin-bottom: 30px;">${project.name}</h1>
          <button id="start-btn">Start Experience</button>
          <div id="loading-status">Tap to begin</div>
      </div>
  </div>

  <script type="module">
    import * as THREE from 'three';
    import { MindARThree } from 'mindar-image-three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

    // --- Debug Helper ---
    const debugLog = (message, data) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log('[AR Debug ' + timestamp + ']', message, data || '');
        // Send to parent for debug overlay
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'debug', message, data }, '*');
        }
    };

    // --- Polyfills ---
    if (!THREE.WebGLRenderer.prototype.hasOwnProperty('outputEncoding')) {
        Object.defineProperty(THREE.WebGLRenderer.prototype, 'outputEncoding', {
            get() { return this.outputColorSpace === 'srgb' ? 3001 : 3000; },
            set(value) { this.outputColorSpace = value === 3001 ? 'srgb' : 'srgb-linear'; }
        });
    }
    if (!THREE.sRGBEncoding) { THREE.sRGBEncoding = 3001; }
    // ----------------

    const projectData = ${projectDataString};
    const mindFileUrl = "${mindFileUrl}";
    const startBtn = document.getElementById('start-btn');
    const startScreen = document.getElementById('start-screen');
    const loadingStatus = document.getElementById('loading-status');

    // --- Content Object Classes (Architecture from refcode) ---

    class ContentObject {
        constructor(content, anchor) {
            this.content = content;
            this.anchor = anchor;
            this.uuid = THREE.MathUtils.generateUUID();
            this.name = content.name;
            this.visible = content.visible ?? true;
            this.mesh = new THREE.Group();
            
            // Correction Group (Scale 0.1, Rot X 90)
            this.correctionGroup = new THREE.Group();
            this.correctionGroup.scale.set(0.1, 0.1, 0.1);
            this.correctionGroup.rotation.set(Math.PI / 2, 0, 0);
            
            // Pivot Group (User Transform)
            this.pivot = new THREE.Group();
            const { position, rotation, scale } = content.transform;
            this.pivot.position.set(position[0], position[1], position[2]);
            this.pivot.rotation.set(
                THREE.MathUtils.degToRad(rotation[0]),
                THREE.MathUtils.degToRad(rotation[1]),
                THREE.MathUtils.degToRad(rotation[2])
            );
            this.pivot.scale.set(scale[0], scale[1], scale[2]);
            this.pivot.visible = this.visible;

            this.correctionGroup.add(this.pivot);
            this.mesh.add(this.correctionGroup);
            this.anchor.group.add(this.mesh);
        }
        
        getScriptWrapper() {
             const self = this;
             return {
                 uuid: self.uuid,
                 name: self.name,
                 mesh: self.pivot, // Expose pivot so user transforms affect local space
                 visible: self.visible,
                 setPosition: (x, y, z) => self.pivot.position.set(x, y, z),
                 setRotation: (x, y, z) => self.pivot.rotation.set(
                     x * THREE.MathUtils.DEG2RAD,
                     y * THREE.MathUtils.DEG2RAD,
                     z * THREE.MathUtils.DEG2RAD
                 ),
                 setScale: (x, y, z) => self.pivot.scale.set(x, y, z),
                 setVisible: (v) => {
                     self.visible = v;
                     self.pivot.visible = v;
                 }
             };
        }

        onUpdate(deltaTime) {}
        onClick() {}
        activate() {}
        deactivate() {}
    }

    class VideoObject extends ContentObject {
        constructor(content, anchor) {
            super(content, anchor);
            this.video = document.createElement('video');
            this.video.src = content.videoUrl;
            this.video.crossOrigin = 'anonymous';
            this.video.loop = content.loop !== false;
            this.video.muted = content.muted !== false;
            this.video.playsInline = true;
            this.video.style.display = 'none';
            document.body.appendChild(this.video);

            const texture = new THREE.VideoTexture(this.video);
            // texture.colorSpace = THREE.SRGBColorSpace; // VideoTexture usually handles this
            let material;
            
            if (content.chromaKey && content.chromaColor) {
                 const color = new THREE.Color(content.chromaColor);
                 material = new THREE.ShaderMaterial({
                    uniforms: {
                        tex: { value: texture },
                        color: { value: color },
                        threshold: { value: 0.15 },
                        smoothing: { value: 0.1 }
                    },
                    vertexShader: \`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    \`,
                    fragmentShader: \`
                        uniform sampler2D tex;
                        uniform vec3 color;
                        uniform float threshold;
                        uniform float smoothing;
                        varying vec2 vUv;
                        void main() {
                            vec4 texColor = texture2D(tex, vUv);
                            float dist = distance(texColor.rgb, color);
                            float alpha = smoothstep(threshold, threshold + smoothing, dist);
                            gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
                            if(gl_FragColor.a < 0.01) discard;
                        }
                    \`,
                    transparent: true,
                    side: THREE.DoubleSide
                });
            } else {
                material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
            }

            // Default aspect 16:9 until loaded
            const geom = new THREE.PlaneGeometry(1, 0.5625); 
            this.obj = new THREE.Mesh(geom, material);
            this.obj.userData.contentObject = this;
            this.pivot.add(this.obj);
            
            this.video.addEventListener('loadedmetadata', () => {
                const aspect = this.video.videoWidth / this.video.videoHeight;
                this.obj.scale.set(1, 1/aspect, 1);
            });
        }
        
        activate() {
            if (this.content.autoplay) this.video.play();
        }
        
        deactivate() {
            this.video.pause();
        }

        onClick() {
            if (this.content.videoClickToggle) {
                if (this.video.paused) this.video.play(); else this.video.pause();
            }
        }

        getScriptWrapper() {
            return {
                ...super.getScriptWrapper(),
                playVideo: () => this.video.play(),
                pauseVideo: () => this.video.pause(),
                stopVideo: () => { this.video.pause(); this.video.currentTime = 0; },
                setVolume: (v) => { this.video.volume = v; },
                setMuted: (m) => { this.video.muted = m; },
                setLoop: (l) => { this.video.loop = l; },
                getVideo: () => this.video
            };
        }
    }

    class AudioObject extends ContentObject {
        constructor(content, anchor, listener) {
            super(content, anchor);
            this.audio = new Audio(content.audioUrl);
            this.audio.crossOrigin = 'anonymous';
            this.audio.loop = content.loop !== false;
            
            this.positionalAudio = new THREE.PositionalAudio(listener);
            this.positionalAudio.setMediaElementSource(this.audio);
            this.positionalAudio.setRefDistance(20);
            
            this.pivot.add(this.positionalAudio);
            
            // Helper visual (invisible)
            const helper = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), new THREE.MeshBasicMaterial({visible: false}));
            this.pivot.add(helper);
        }

        activate() {
            if (this.content.autoplay) this.audio.play().catch(e => console.warn("Audio autoplay blocked", e));
        }

        deactivate() {
            this.audio.pause();
        }
        
        getScriptWrapper() {
            return {
                ...super.getScriptWrapper(),
                playVideo: () => this.audio.play(), // Reuse naming for simplicity
                pauseVideo: () => this.audio.pause(),
                stopVideo: () => { this.audio.pause(); this.audio.currentTime = 0; },
                getAudio: () => this.audio
            }
        }
    }

    class ModelObject extends ContentObject {
        constructor(content, anchor, loader) {
            super(content, anchor);
            this.mixer = null;
            loader.load(content.modelUrl, (gltf) => {
                this.model = gltf.scene;
                this.pivot.add(this.model);
                
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    this.animations = gltf.animations;
                    this.actions = {};
                    this.animations.forEach(anim => {
                        this.actions[anim.name] = this.mixer.clipAction(anim);
                    });
                    
                    if (content.animateAutostart !== false) {
                        this.actions[this.animations[0].name].play();
                    }
                }
                
                // Texture Overrides
                if (content.materialOverrides) {
                    const texLoader = new THREE.TextureLoader();
                    this.model.traverse(child => {
                       if (child.isMesh && child.material && content.materialOverrides[child.material.name]) {
                           const override = content.materialOverrides[child.material.name];
                           if (override.map) {
                               const tex = texLoader.load(override.map);
                               tex.flipY = false;
                               tex.colorSpace = THREE.SRGBColorSpace;
                               child.material.map = tex;
                           }
                           if (override.color) child.material.color.set(override.color);
                           // ... other props
                           child.material.needsUpdate = true;
                       } 
                    });
                }
            });
        }
        
        onUpdate(delta) {
            if (this.mixer) this.mixer.update(delta);
        }

        getScriptWrapper() {
            return {
                ...super.getScriptWrapper(),
                getAction: (nameOrIndex) => {
                    if (!this.actions) return null;
                    if (typeof nameOrIndex === 'number') return this.actions[this.animations[nameOrIndex].name];
                    return this.actions[nameOrIndex];
                },
                updateTexture: (matName, url) => {
                    if (!this.model) return;
                    const tex = new THREE.TextureLoader().load(url);
                    tex.flipY = false;
                    tex.colorSpace = THREE.SRGBColorSpace;
                    this.model.traverse(c => {
                        if (c.isMesh && c.material && c.material.name === matName) {
                            c.material.map = tex;
                            c.material.needsUpdate = true;
                        }
                    });
                }
            };
        }
    }
    
    class ImageObject extends ContentObject {
        constructor(content, anchor) {
            super(content, anchor);
            const loader = new THREE.TextureLoader();
            const tex = loader.load(content.imageUrl);
            const geom = new THREE.PlaneGeometry(1, 1);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
            this.obj = new THREE.Mesh(geom, mat);
            this.obj.userData.contentObject = this;
            this.pivot.add(this.obj);
        }
    }

    // --- Main Player Logic ---

    class Player {
        constructor() {
            this.container = document.querySelector('#container');
            this.cssContainer = document.querySelector('#css-container');
            this.targets = [];
            this.objects = []; // All content objects
            this.updatables = [];
            this.clock = new THREE.Clock();
        }

        async init() {
            startBtn.innerText = "Initializing...";
            startBtn.disabled = true;
            loadingStatus.innerText = "Loading MindAR library...";
            
            debugLog('mindarLoading', { progress: 10 });

            this.mindarThree = new MindARThree({
                container: this.container,
                imageTargetSrc: mindFileUrl,
                maxTrack: ${config.maxTrack},
                warmupTolerance: ${config.warmupTolerance},
                missTolerance: ${config.missTolerance},
                filterMinCF: ${config.filterMinCF},
                filterBeta: ${config.filterBeta},
                uiLoading: "yes",
                uiScanning: "yes",
                uiError: "yes"
            });

            debugLog('mindarLoaded', {});

            this.renderer = this.mindarThree.renderer;
            this.scene = this.mindarThree.scene;
            this.camera = this.mindarThree.camera;
            
            // Fix encoding
            if (this.renderer.outputColorSpace !== 'srgb') this.renderer.outputColorSpace = 'srgb';

            // CSS3D
            this.cssRenderer = new CSS3DRenderer();
            this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
            this.cssRenderer.domElement.style.position = 'absolute';
            this.cssRenderer.domElement.style.top = '0';
            this.cssRenderer.domElement.style.pointerEvents = 'none';
            this.cssContainer.appendChild(this.cssRenderer.domElement);
            
            // Sync CSS Camera
            // We can't easily sync CSS3D camera with MindAR's camera directly without hacking MindAR.
            // However, MindAR updates the THREE camera. We just need to render CSS scene with it.
            this.cssScene = new THREE.Scene();

            // Lighting
            const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
            this.scene.add(light);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.position.set(5, 10, 7);
            this.scene.add(dirLight);
            
            // Audio Listener
            this.listener = new THREE.AudioListener();
            this.camera.add(this.listener);

            const gltfLoader = new GLTFLoader();

            // Setup Targets
            projectData.targets.forEach((targetData, index) => {
                const anchor = this.mindarThree.addAnchor(index);
                const targetObj = { 
                    anchor, 
                    index, 
                    customFunctions: {}, 
                    customData: {}, // Store script variables here
                    objects: [] 
                };

                // Create Content Objects
                targetData.contents.forEach(content => {
                    let obj;
                    if (content.type === 'image') obj = new ImageObject(content, anchor);
                    else if (content.type === 'video') obj = new VideoObject(content, anchor);
                    else if (content.type === 'audio') obj = new AudioObject(content, anchor, this.listener);
                    else if (content.type === 'model') obj = new ModelObject(content, anchor, gltfLoader);
                    
                    if (obj) {
                        this.objects.push(obj);
                        targetObj.objects.push(obj);
                        if (obj.onUpdate) this.updatables.push(obj);
                    }
                });

                // Compile Script
                if (targetData.script) {
                    this.initScript(targetObj, targetData.script);
                }
                
                // Events
                anchor.onTargetFound = () => {
                    debugLog('targetFound', { targetIndex: index });
                    targetObj.objects.forEach(o => o.activate());
                    this.dispatch(targetObj, 'onActivate');
                };
                anchor.onTargetLost = () => {
                    debugLog('targetLost', { targetIndex: index });
                    targetObj.objects.forEach(o => o.deactivate());
                    this.dispatch(targetObj, 'onDeactivate');
                };
                
                this.targets.push(targetObj);
            });
            
            // Raycaster
            this.raycaster = new THREE.Raycaster();
            this.pointer = new THREE.Vector2();
            window.addEventListener('click', (e) => this.onClick(e));

            await this.mindarThree.start();
            this.renderer.setAnimationLoop(() => this.renderLoop());

            // UI
            loadingStatus.innerText = "Loaded!";
            startScreen.classList.add('hidden');
            
            debugLog('cameraReady', {});
            
            // Trigger Init
            this.targets.forEach(t => this.dispatch(t, 'onInit'));
        }

        renderLoop() {
            const delta = this.clock.getDelta();
            const elapsed = this.clock.getElapsedTime();
            
            this.updatables.forEach(o => o.onUpdate(delta));
            
            // Trigger onUpdate scripts
            this.targets.forEach(t => {
                if (t.anchor.visible) {
                    this.dispatch(t, 'onUpdate', { time: elapsed, deltaTime: delta });
                }
            });

            this.renderer.render(this.scene, this.camera);
            this.cssRenderer.render(this.cssScene, this.camera);
        }

        onClick(event) {
            this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            
            if (intersects.length > 0) {
                // Find associated content object
                let obj = intersects[0].object;
                let contentObj = null;
                
                while(obj) {
                    if (obj.userData.contentObject) {
                        contentObj = obj.userData.contentObject;
                        break;
                    }
                    obj = obj.parent;
                }
                
                if (contentObj) {
                    contentObj.onClick();
                    // Dispatch to script
                    // Find which target owns this object
                    const target = this.targets.find(t => t.objects.includes(contentObj));
                    if (target) {
                         this.dispatch(target, 'onClick', { object: contentObj.getScriptWrapper() });
                    }
                }
            }
        }

        initScript(targetObj, script) {
            const eventList = ['onInit', 'onActivate', 'onDeactivate', 'onUpdate', 'onClick'];
            let scriptWrapResultObj = {};
            eventList.forEach((key) => { scriptWrapResultObj[key] = key; });
            let scriptWrapParams = eventList.join(',');
            let scriptWrapResult = JSON.stringify(scriptWrapResultObj).replace(/\"/g, '');

            try {
                const functions = (new Function(scriptWrapParams, script + '\\nreturn ' + scriptWrapResult + ';'))();
                targetObj.customFunctions = functions;
            } catch (e) {
                console.error("Script compilation error:", e);
            }
        }

        dispatch(targetObj, eventName, extra = {}) {
            if (targetObj.customFunctions[eventName]) {
                const sceneObject = {
                    getObject: (name) => {
                        const found = targetObj.objects.find(o => o.name === name);
                        return found ? found.getScriptWrapper() : null;
                    },
                    openUrl: (url) => window.open(url, '_blank')
                };

                const params = {
                    target: sceneObject,
                    data: targetObj.customData,
                    ...extra
                };
                
                try {
                    targetObj.customFunctions[eventName](params);
                } catch(e) {
                    console.error("Runtime script error (" + eventName + "):", e);
                }
            }
        }
    }

    const player = new Player();
    startBtn.addEventListener('click', () => player.init());

  </script>
</body>
</html>
    `;
};

// Export type for ZIP generation
export type ExportType = 'web' | 'ar';

/**
 * Generates a ZIP file for the project.
 * @param project - The project to export
 * @param mindFileUrl - URL to the compiled mind file
 * @param signal - Optional abort signal
 * @param exportType - 'web' for browser-based HTML, 'ar' for AR app JSON format
 */
export const generateProjectZip = async (
    project: Project, 
    mindFileUrl: string, 
    signal?: AbortSignal,
    exportType: ExportType = 'web'
): Promise<Blob> => {
    if (signal?.aborted) throw new Error("Aborted");

    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    const targetsFolder = zip.folder("targets");
    const localPathMap = new Map<string, string>(); // ContentID -> "assets/filename.ext"

    // 1. Fetch and add targets.mind
    try {
        const mindRes = await fetch(mindFileUrl, { signal });
        const mindBlob = await mindRes.blob();
        
        if (exportType === 'ar') {
            // AR export: Add individual target files
            targetsFolder?.file("target_0.mind", mindBlob);
        } else {
            // Web export: Single targets.mind file
            zip.file("targets.mind", mindBlob);
        }
    } catch (e) {
        if (signal?.aborted) throw new Error("Aborted");
        throw new Error("Failed to fetch compiled mind file.");
    }

    // 2. Fetch and add all content assets
    const fetchAndAddAsset = async (url: string, id: string, defaultExt: string) => {
        if (signal?.aborted) return;
        try {
            // Determine extension (naive)
            let ext = defaultExt;
            if (url.startsWith('data:')) {
                 const type = url.split(';')[0].split(':')[1];
                 if(type.includes('png')) ext = 'png';
                 if(type.includes('jpeg')) ext = 'jpg';
                 if(type.includes('mpeg') || type.includes('mp4')) ext = 'mp4';
                 if(type.includes('audio')) ext = 'mp3';
            } else {
                 const urlParts = url.split('.');
                 if (urlParts.length > 1) {
                     ext = urlParts.pop() || defaultExt;
                     // Clean extension of params if any
                     if(ext.includes('?')) ext = ext.split('?')[0];
                 }
            }

            const filename = `${id}.${ext}`;
            const res = await fetch(url, { signal });
            const blob = await res.blob();
            
            assetsFolder?.file(filename, blob);
            localPathMap.set(id, `assets/${filename}`);
        } catch (e) {
            if (signal?.aborted) throw e;
            console.error(`Failed to download asset for content ${id}:`, e);
        }
    };

    const assetPromises: Promise<void>[] = [];

    for (const target of project.targets) {
        for (const content of target.contents) {
            if (content.type === ContentType.IMAGE && content.imageUrl) {
                assetPromises.push(fetchAndAddAsset(content.imageUrl, content.id, 'png'));
            } else if (content.type === ContentType.VIDEO && content.videoUrl && !content.streamingService) {
                assetPromises.push(fetchAndAddAsset(content.videoUrl, content.id, 'mp4'));
            } else if (content.type === ContentType.AUDIO && content.audioUrl) {
                assetPromises.push(fetchAndAddAsset(content.audioUrl, content.id, 'mp3'));
            } else if (content.type === ContentType.MODEL && content.modelUrl) {
                assetPromises.push(fetchAndAddAsset(content.modelUrl, content.id, 'glb'));
            }
        }
    }

    await Promise.all(assetPromises);
    if (signal?.aborted) throw new Error("Aborted");

    // 3. Generate content based on export type
    if (exportType === 'ar') {
        // AR Export: Generate JSON + scripts
        const arJson = generateARJson(project, localPathMap);
        zip.file("project.json", JSON.stringify(arJson, null, 2));
        
        // Add scripts for each target
        const scriptsFolder = zip.folder("scripts");
        project.targets.forEach((target, index) => {
            if (target.script) {
                const scriptJson = generateScriptJson(target.script);
                scriptsFolder?.file(`target_${index}.json`, JSON.stringify(scriptJson, null, 2));
            }
        });
        
        // Add target images
        const targetImagePromises: Promise<void>[] = [];
        project.targets.forEach((target, index) => {
            if (target.imageUrl) {
                targetImagePromises.push(
                    (async () => {
                        try {
                            const res = await fetch(target.imageUrl, { signal });
                            const blob = await res.blob();
                            targetsFolder?.file(`target_${index}.jpg`, blob);
                        } catch (e) {
                            console.error(`Failed to fetch target image:`, e);
                        }
                    })()
                );
            }
        });
        await Promise.all(targetImagePromises);
    } else {
        // Web Export: Generate HTML with local paths
        // Note: We use the local path 'targets.mind' for the zip file reference
        const htmlContent = generateAFrameHtml(project, localPathMap, './targets.mind');
        zip.file("index.html", htmlContent);
    }

    // 4. Generate ZIP blob
    return await zip.generateAsync({ type: "blob" });
};
