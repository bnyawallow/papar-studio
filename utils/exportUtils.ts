
import { Project, Target, Content, ContentType } from '../types';
import JSZip from 'jszip';

// Helper to match refcode structure
export const generateProjectJson = (project: Project, masterMindFileUrl: string | null = null) => {
  const exportTargets = project.targets.map((target) => {
    return {
      name: target.name,
      // If we have a master file, individual mindUrl is less relevant for the multi-target player logic 
      // but we keep it or the image if needed for reference
      mindFileUrl: target.mindFileUrl, 
      imageTarget: {
          // Refcode structure for tracking mesh if needed
      },
      contents: target.contents.map((content) => convertContent(content)),
      script: target.script || ''
    };
  });

  return {
    name: project.name,
    mindARConfig: project.mindARConfig || {
        maxTrack: 1,
        warmupTolerance: 5,
        missTolerance: 5,
        filterMinCF: 0.0001,
        filterBeta: 0.001
    },
    mindFile: masterMindFileUrl, // The master binary for all targets
    targets: exportTargets
  };
};

const convertContent = (content: Content) => {
  const common = {
    name: content.name,
    properties: {
      position: content.transform.position,
      rotation: content.transform.rotation, // Refcode uses degrees for input
      scale: content.transform.scale,
      visible: content.visible ?? true,
      userFacing: content.alwaysFacingUser,
    }
  };

  if (content.type === ContentType.IMAGE) {
    return {
      ...common,
      type: 'asset',
      asset: {
        type: 'image',
        publicPath: content.imageUrl
      },
      properties: {
          ...common.properties,
      }
    };
  }

  const isEmbed = content.type === ContentType.STREAMING_VIDEO || 
                  content.type === ContentType.ICON_YOUTUBE || 
                  (content.type === ContentType.VIDEO && typeof content.videoUrl === 'string' && 
                  (content.videoUrl.includes('youtube') || content.videoUrl.includes('vimeo')));

  if (isEmbed) {
      const service = content.streamingService || ((typeof content.videoUrl === 'string' && content.videoUrl.includes('vimeo')) ? 'vimeo' : 'youtube');
      
      return {
          ...common,
          type: 'embed',
          embed: {
              videoMeta: {
                  service: service,
                  id: content.videoUrl // Assume ID or handled URL
              }
          },
          properties: {
              ...common.properties,
              videoAutostart: content.autoplay,
              videoLoop: content.loop,
              videoMuted: content.muted,
              videoClickToggle: content.videoClickToggle,
              videoControls: content.videoControls,
              videoFullScreen: content.videoFullScreen,
          }
      };
  }

  if (content.type === ContentType.VIDEO) {
      return {
          ...common,
          type: 'asset',
          asset: {
              type: 'video',
              publicPath: content.videoUrl
          },
          properties: {
              ...common.properties,
              videoAutostart: content.autoplay,
              videoLoop: content.loop,
              videoMuted: content.muted,
              videoClickToggle: content.videoClickToggle,
              videoChroma: content.chromaKey,
              chromaColor: content.chromaColor
          }
      };
  }

  if (content.type === ContentType.AUDIO) {
      return {
          ...common,
          type: 'asset',
          asset: {
              type: 'audio',
              publicPath: content.audioUrl
          },
          properties: {
              ...common.properties,
              audioAutostart: content.autoplay,
              audioLoop: content.loop
          }
      };
  }

  if (content.type === ContentType.MODEL) {
      return {
          ...common,
          type: 'asset',
          asset: {
              type: 'glb',
              publicPath: content.modelUrl
          },
          properties: {
              ...common.properties,
              animateAutostart: content.animateAutostart,
              animateLoop: content.animateLoop
          }
      };
  }

  if (content.type === ContentType.TEXT) {
      return {
          ...common,
          type: 'text',
          text: content.textContent,
          properties: {
              ...common.properties,
              color: content.color,
          }
      };
  }

  return {
      ...common,
      type: 'unknown'
  };
};

export const generateAFrameHtml = (project: Project, localAssetMap?: Map<string, string>, mindFileUrl: string = './targets.mind'): string => {
    const config = project.mindARConfig || {
        maxTrack: 1,
        warmupTolerance: 5,
        missTolerance: 5,
        filterMinCF: 0.0001,
        filterBeta: 0.001
    };

    // Helper to format vectors
    const v3 = (v: number[]) => `${v[0]} ${v[1]} ${v[2]}`;

    // Collect all assets (images, videos, models) from content to create <a-assets>
    let assetsHtml = '';
    const processedAssetIds = new Set<string>();

    const processAsset = (id: string, type: string, url?: string, isVideo = false) => {
        if (!url || processedAssetIds.has(id)) return '';
        processedAssetIds.add(id);
        
        // Use local path if available (for ZIP export), otherwise use original URL
        // Remove content id prefix (e.g., 'asset-content_123') to check map which uses 'content_123'
        const contentId = id.replace('asset-', '');
        const finalUrl = localAssetMap?.get(contentId) || url;
        
        if (type === 'img') return `<img id="${id}" src="${finalUrl}" crossorigin="anonymous" />`;
        if (type === 'video') return `<video id="${id}" src="${finalUrl}" crossorigin="anonymous" playsinline webkit-playsinline ${isVideo ? 'autoplay loop="true"' : ''}></video>`;
        if (type === 'a-asset-item') return `<a-asset-item id="${id}" src="${finalUrl}"></a-asset-item>`;
        if (type === 'audio') return `<audio id="${id}" src="${finalUrl}" crossorigin="anonymous"></audio>`;
        return '';
    };

    // Generate Scene Content
    const targetsHtml = project.targets.map((target, index) => {
        if (!(target.visible ?? true)) return '';

        const entitiesHtml = target.contents.map(content => {
            if (!(content.visible ?? true)) return '';
            
            const pos = v3(content.transform.position);
            const rot = v3(content.transform.rotation);
            const scale = v3(content.transform.scale);
            const commonAttr = `position="${pos}" rotation="${rot}" scale="${scale}"`;

            if (content.type === ContentType.IMAGE && content.imageUrl) {
                const assetId = `asset-${content.id}`;
                assetsHtml += processAsset(assetId, 'img', content.imageUrl);
                return `<a-image src="#${assetId}" ${commonAttr} alpha-test="0.5"></a-image>`;
            }

            if (content.type === ContentType.VIDEO && content.videoUrl && !content.streamingService) {
                const assetId = `asset-${content.id}`;
                assetsHtml += processAsset(assetId, 'video', content.videoUrl, true);
                // Basic video plane. Does not support green screen in standard A-Frame without extra shader component.
                // We use standard video material.
                return `<a-video src="#${assetId}" ${commonAttr} class="clickable" click-handler></a-video>`;
            }

            if (content.type === ContentType.MODEL && content.modelUrl) {
                const assetId = `asset-${content.id}`;
                assetsHtml += processAsset(assetId, 'a-asset-item', content.modelUrl);
                const animationAttr = content.animateAutostart ? 'animation-mixer' : '';
                return `<a-gltf-model src="#${assetId}" ${commonAttr} ${animationAttr}></a-gltf-model>`;
            }

            if (content.type === ContentType.TEXT && content.textContent) {
                return `<a-text value="${content.textContent}" color="${content.color || 'black'}" align="${content.align || 'center'}" ${commonAttr}></a-text>`;
            }

            if (content.type === ContentType.AUDIO && content.audioUrl) {
                const assetId = `asset-${content.id}`;
                assetsHtml += processAsset(assetId, 'audio', content.audioUrl);
                const loop = content.loop ? 'true' : 'false';
                const autoplay = content.autoplay ? 'true' : 'false';
                return `<a-entity sound="src: #${assetId}; autoplay: ${autoplay}; loop: ${loop}" ${commonAttr}></a-entity>`;
            }

            return '';
        }).join('\n        ');

        return `
      <a-entity mindar-image-target="targetIndex: ${index}">
        ${entitiesHtml}
      </a-entity>`;
    }).join('\n');

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${project.name}</title>
    <script src="https://aframe.io/releases/1.6.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.2.0/dist/aframe-extras.min.js"></script>
    <script>
      // Check for secure context or localhost to ensure camera access
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'https:') {
          console.warn('Camera access may be blocked. Please use HTTPS or localhost.');
          if (window.location.protocol === 'file:') {
             alert('Camera access is not supported via file:// protocol. Please run this app via a local server (e.g. using VS Code Live Server, http-server, or python -m http.server).');
          }
      }

      // Simple click handler for videos to ensure they play on mobile
      AFRAME.registerComponent('click-handler', {
        init: function () {
          this.el.addEventListener('click', () => {
            const video = this.el.components.material.material.map.image;
            if (!video) return;
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          });
        }
      });
    </script>
  </head>
  <body>
    <a-scene 
      mindar-image="imageTargetSrc: ${mindFileUrl}; maxTrack: ${config.maxTrack}; warmupTolerance: ${config.warmupTolerance}; missTolerance: ${config.missTolerance}; filterMinCF: ${config.filterMinCF}; filterBeta: ${config.filterBeta}; uiError: yes;" 
      color-space="sRGB" 
      renderer="colorManagement: true, physicallyCorrectLights" 
      vr-mode-ui="enabled: false" 
      device-orientation-permission-ui="enabled: false">
      
      <a-assets>
        ${assetsHtml}
      </a-assets>

      <a-camera position="0 0 0" look-controls="enabled: false" cursor="fuse: false; rayOrigin: mouse;" raycaster="far: ${10000}; objects: .clickable"></a-camera>

      ${targetsHtml}
    </a-scene>
  </body>
</html>`;
};

// New function to generate ZIP
export const generateProjectZip = async (project: Project, mindFileUrl: string): Promise<Blob> => {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    const localPathMap = new Map<string, string>(); // ContentID -> "assets/filename.ext"

    // 1. Fetch and add targets.mind
    try {
        const mindRes = await fetch(mindFileUrl);
        const mindBlob = await mindRes.blob();
        zip.file("targets.mind", mindBlob);
    } catch (e) {
        throw new Error("Failed to fetch compiled mind file.");
    }

    // 2. Fetch and add all content assets
    const fetchAndAddAsset = async (url: string, id: string, defaultExt: string) => {
        try {
            // Determine extension (naive)
            let ext = defaultExt;
            if (url.startsWith('data:')) {
                 const type = url.split(';')[0].split(':')[1];
                 if(type.includes('png')) ext = 'png';
                 if(type.includes('jpeg')) ext = 'jpg';
                 if(type.includes('mpeg') || type.includes('mp4')) ext = 'mp4';
            } else {
                 const urlParts = url.split('.');
                 if (urlParts.length > 1) {
                     ext = urlParts.pop() || defaultExt;
                     // Clean extension of params if any
                     if(ext.includes('?')) ext = ext.split('?')[0];
                 }
            }

            const filename = `${id}.${ext}`;
            const res = await fetch(url);
            const blob = await res.blob();
            
            assetsFolder?.file(filename, blob);
            localPathMap.set(id, `assets/${filename}`);
        } catch (e) {
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

    // 3. Generate HTML with local paths
    const htmlContent = generateAFrameHtml(project, localPathMap, './targets.mind');
    zip.file("index.html", htmlContent);

    // 4. Generate ZIP blob
    return await zip.generateAsync({ type: "blob" });
};
