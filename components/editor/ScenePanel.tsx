
"use client";

import React, { useRef, useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, useTexture, Text, Html, useGLTF, GizmoHelper, GizmoViewport, useAnimations, Billboard } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { Content, Target, ContentType, FONT_MAP, Asset, MaterialProperties, SceneSettings } from '../../types';
import { MoveIcon, RotateIcon, ScaleIcon, XMarkIcon, SpeakerIcon, MagnetIcon, ImageIcon, VideoIcon, AudioIcon, CubeIcon, FileIcon } from '../icons/Icons';
import './ChromaKeyMaterial'; 
import { useScriptEngine } from './ScriptEngine';
import { fileToBase64 } from '../../utils/storage';
import ReactPlayer from 'react-player';

const PLACEHOLDER_MIND = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciI+PHJlY3QgeD0iMjAiIHk9IjIwIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSI1IiBmaWxsPSIjZjBmZGY0IiBzdHJva2U9IiMxNmEzNGEiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0zNSA1MGwxMCAxMCAyMC0yMCIgc3Ryb2tlPSIjMTZhMzRhIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjx0ZXh0IHg9IjUwIiB5PSI5MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzE2YTM0YSI+TUlORDwvdGV4dD48L3N2Zz4=";
const PLACEHOLDER_SCRIPT = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciI+PHJlY3QgeD0iMjAiIHk9IjIwIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSI1IiBmaWxsPSIjZmVmY2U4IiBzdHJva2U9IiNjYThhMDQiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0zNSA1MGwxMCAxMCAyMC0yMCIgc3Ryb2tlPSIjMTZhMzRhIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjx0ZXh0IHg9IjUwIiB5PSI5MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzE2YTM0YSI+SlM8L3RleHQ+PC9zdmc+";

// Helper to fix texture channel issue (uvundefined error in shader)
const fixTexture = (tex: THREE.Texture | THREE.Texture[] | null | undefined) => {
    if (!tex) return tex;
    if (Array.isArray(tex)) {
        tex.forEach(t => {
            if ((t as any).channel === undefined) (t as any).channel = 0;
        });
    } else {
        if ((tex as any).channel === undefined) (tex as any).channel = 0;
    }
    return tex;
};

const stripParameters = (str: string) => {
  if (!str) return '';
  if (str.indexOf('?') > -1) return str.split('?')[0];
  if (str.indexOf('/') > -1) return str.split('/')[0];
  if (str.indexOf('&') > -1) return str.split('&')[0];
  return str;
}

const getVideoId = (videoStr: string) => {
    if (!videoStr) return { id: null, service: null };
    let str = videoStr.trim();
    str = str.replace('-nocookie', '').replace('/www.', '').replace(/#t=.*$/, '');

    const shortcode = /youtube:\/\/|https?:\/\/youtu\.be\/|http:\/\/y2u\.be\//g;
    if (shortcode.test(str)) {
        const parts = str.split(shortcode);
        return { id: stripParameters(parts[1] || ''), service: 'youtube' };
    }

    const parameterv = /v=|vi=/g;
    if (parameterv.test(str)) {
        const parts = str.split(parameterv);
        const p2 = parts[1] || '';
        return { id: stripParameters(p2.split('&')[0]), service: 'youtube' };
    }

    const embedreg = /\/embed\/([a-zA-Z0-9_-]{11})/;
    const embedMatch = str.match(embedreg);
    if (embedMatch) return { id: embedMatch[1], service: 'youtube' };
    
    if (/vimeo/.test(str)) {
        const primary = /https?:\/\/vimeo\.com\/([0-9]+)/;
        const matches = primary.exec(str);
        if (matches && matches[1]) return { id: matches[1], service: 'vimeo' };
    }

    if (/^\d+$/.test(str)) return { id: str, service: 'vimeo' };
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return { id: str, service: 'youtube' };

    return { id: null, service: null };
};

const TargetPlane = ({ target, onDeselect }: { target: Target, onDeselect: () => void }) => {
  const texture = useTexture(target.imageUrl);
  fixTexture(texture);
  const image = texture.image as { naturalWidth: number; naturalHeight: number; };
  const aspect = image ? image.naturalWidth / image.naturalHeight : 1.6;
  
  // MindAR uses a normalized width of 1 for the target image.
  // We use 1 here to ensure 1:1 mapping between Editor and AR.
  const width = 1;
  const height = width / aspect;

  return (
    // No rotation (0,0,0) - MindAR targets are naturally vertical (XY plane)
    <mesh onClick={(e) => { e.stopPropagation(); onDeselect(); }} position={[0, 0, -0.01]}> 
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
};

const ImageContent = ({ content }: { content: Content }) => {
    if (!content.imageUrl) return null;
    const texture = useTexture(content.imageUrl);
    fixTexture(texture);
    const image = texture.image as { naturalWidth: number; naturalHeight: number; };
    const aspect = image ? image.naturalWidth / image.naturalHeight : 1;
    return (
        <mesh>
            <planeGeometry args={[aspect, 1]} />
            <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
    );
};

const ModelContent = ({ content, onLoad, onUpdateMaterialNames }: { 
    content: Content, 
    onLoad?: (data: any) => void,
    onUpdateMaterialNames?: (names: string[]) => void
}) => {
    if (!content.modelUrl) return null;
    const gltf = useGLTF(content.modelUrl);
    
    // Clone scene to allow independent material instances
    const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
    const { actions, mixer } = useAnimations(gltf.animations, scene);
    
    // Initial material name extraction
    useEffect(() => {
        if (!scene) return;
        const matNames = new Set<string>();
        scene.traverse((o) => {
            if (o instanceof THREE.Mesh) {
                // Ensure material exists - generate default if missing
                if (!o.material) {
                    o.material = new THREE.MeshStandardMaterial({ 
                        name: 'Default Material', 
                        color: 0xffffff,
                        roughness: 0.5,
                        metalness: 0.5,
                        side: THREE.DoubleSide
                    });
                }

                const materials = Array.isArray(o.material) ? o.material : [o.material];
                materials.forEach(m => {
                    // Ensure material has a name for the editor
                    if (!m.name) {
                        m.name = `Material_${m.uuid.slice(0, 8)}`;
                    }
                    matNames.add(m.name);
                });
            }
        });
        const names = Array.from(matNames);
        
        // Update parent state if names have changed
        // Use sorting to avoid false positives on order changes
        if (onUpdateMaterialNames) {
            const currentNames = content.materialNames || [];
            const sortedNames = [...names].sort();
            const sortedCurrent = [...currentNames].sort();
            if (JSON.stringify(sortedNames) !== JSON.stringify(sortedCurrent)) {
                onUpdateMaterialNames(names);
            }
        }
    }, [scene, onUpdateMaterialNames, content.materialNames]);

    // Apply Material Overrides
    useEffect(() => {
        if (!scene) return;
        
        const loader = new THREE.TextureLoader();
        const textureCache: Record<string, THREE.Texture> = {};

        const getTexture = (url: string) => {
            if (!textureCache[url]) {
                const tex = loader.load(url);
                tex.flipY = false;
                tex.colorSpace = THREE.SRGBColorSpace;
                fixTexture(tex);
                textureCache[url] = tex;
            }
            return textureCache[url];
        };

        scene.traverse((o) => {
            if (o instanceof THREE.Mesh && o.material) {
                // Ensure we are working with cloned materials
                const materials = Array.isArray(o.material) ? o.material : [o.material];
                
                materials.forEach(m => {
                    // 1. Check for legacy textureOverrides
                    if (content.textureOverrides && content.textureOverrides[m.name]) {
                        m.map = getTexture(content.textureOverrides[m.name]);
                        m.needsUpdate = true;
                    }

                    // 2. Check for new materialOverrides (takes precedence)
                    if (content.materialOverrides && content.materialOverrides[m.name]) {
                        const props = content.materialOverrides[m.name];
                        
                        // Map
                        if (props.map) {
                            m.map = getTexture(props.map);
                        } else if (props.map === '') {
                            m.map = null; // Remove texture if explicitly empty
                        }

                        // Color
                        if (props.color && props.color !== 'transparent') {
                            // Sanitize color to prevent THREE warnings if invalid
                            try {
                                m.color.set(props.color);
                            } catch(e) {
                                // Fallback or ignore
                            }
                        }
                        
                        // Emissive
                        if (props.emissive && props.emissive !== 'transparent') {
                            try {
                                m.emissive.set(props.emissive);
                            } catch(e) {}
                        }

                        // Physical properties
                        if (props.metalness !== undefined) m.metalness = props.metalness;
                        if (props.roughness !== undefined) m.roughness = props.roughness;
                        
                        // Opacity / Transparent
                        if (props.opacity !== undefined) m.opacity = props.opacity;
                        if (props.transparent !== undefined) m.transparent = props.transparent;
                        
                        // Wireframe
                        if (props.wireframe !== undefined) m.wireframe = props.wireframe;

                        m.needsUpdate = true;
                    }
                });
            }
        });
    }, [scene, content.textureOverrides, content.materialOverrides]);

    useEffect(() => {
        if (scene && onLoad) onLoad({ actions, animations: gltf.animations });
    }, [scene, actions, gltf.animations, onLoad]);

    useEffect(() => {
        if (!actions) return;
        mixer.stopAllAction();
        if (content.animateAutostart && gltf.animations.length > 0) {
            const action = actions[gltf.animations[0].name];
            if (action) {
                action.reset();
                if (content.animateLoop === 'once') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
                else if (content.animateLoop === 'pingpong') action.setLoop(THREE.LoopPingPong, Infinity);
                else action.setLoop(THREE.LoopRepeat, Infinity);
                action.play();
            }
        }
    }, [actions, mixer, content.animateAutostart, content.animateLoop, gltf.animations]);

    return <primitive object={scene} />;
};

const ThumbnailMaterial = ({ url }: { url: string }) => {
    const texture = useTexture(url);
    fixTexture(texture);
    return <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />;
};

const EmbedContent = React.memo(({ content, onLoad, isRunning }: { content: Content, onLoad?: (data: any) => void, isRunning: boolean }) => {
    const { id: detectedId, service: detectedService } = useMemo(() => getVideoId(content.videoUrl || ''), [content.videoUrl]);
    const service = content.streamingService || detectedService || 'youtube';
    const videoId = detectedId;

    const { autoplay, loop, videoClickToggle, videoControls, videoFullScreen } = content;
    const [hasError, setHasError] = useState(false);
    
    // States that can be controlled by script
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(content.muted ?? false);
    const [volume, setVolume] = useState(0.8);
    const [loopState, setLoopState] = useState(content.loop ?? false);

    const playerRef = useRef<ReactPlayer>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const DEFAULT_EMBED_WIDTH = 1000;
    const height = 3;
    const aspect = 16 / 9;
    const width = height * aspect; 
    const scale = (width * 40) / DEFAULT_EMBED_WIDTH;

    const videoUrl = useMemo(() => {
        if (!videoId) return undefined;
        // Use standard youtube.com URL to avoid potential issues with nocookie domain API initialization
        if (service === 'youtube') return `https://www.youtube.com/watch?v=${videoId}`;
        if (service === 'vimeo') return `https://vimeo.com/${videoId}`;
        return undefined;
    }, [videoId, service]);

    useEffect(() => {
        if (isRunning && autoplay && !hasError) setPlaying(true);
        else setPlaying(false);
    }, [isRunning, autoplay, hasError]);

    // Keep loop state in sync with property panel changes
    useEffect(() => {
        setLoopState(content.loop ?? false);
    }, [content.loop]);

    const handlePlayerReady = useCallback((player: any) => {
        // Fix for Error 153: Manually set referrerPolicy on the YouTube iframe
        try {
            const internalPlayer = player.getInternalPlayer();
            if (internalPlayer && typeof internalPlayer.getIframe === 'function') {
                const iframe = internalPlayer.getIframe();
                if (iframe) {
                    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                }
            }
        } catch (e) {
            // Ignore errors if internal player structure differs
        }

        if (onLoad) {
            onLoad({
                player: {
                    playVideo: () => setPlaying(true),
                    pauseVideo: () => setPlaying(false),
                    stopVideo: () => { setPlaying(false); player.seekTo(0); },
                    seekTo: (seconds: number) => player.seekTo(seconds, 'seconds'),
                    setVolume: (v: number) => setVolume(v),
                    setMuted: (m: boolean) => setMuted(m),
                    setLoop: (l: boolean) => setLoopState(l),
                    getLoop: () => loopState,
                    setFullscreen: (v: boolean) => {
                        if (v) wrapperRef.current?.requestFullscreen?.();
                        else if (document.fullscreenElement === wrapperRef.current) document.exitFullscreen?.();
                    },
                    isPlaying: () => playing
                }
            });
        }
    }, [onLoad, playing, loopState]);

    const handleClick = useCallback((e: any) => {
        if (!isRunning || !videoClickToggle || hasError) return;
        e.stopPropagation();
        setPlaying(prev => !prev);
    }, [isRunning, videoClickToggle, hasError]);

    const handlePlayerError = useCallback((error: any) => {
        console.error("Streaming Video Error:", error);
        // Error 153 specifically is often non-fatal for playback in some contexts but indicates restricted playback.
        // We only set error state if playback effectively fails.
        // However, ReactPlayer treats it as an error.
        setHasError(true);
    }, []);

    const thumbnailUrl = (service === 'youtube' && videoId) ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

    return (
        <group>
            <mesh onClick={handleClick}>
                <planeGeometry args={[width, height]} />
                {hasError ? (
                    <meshBasicMaterial color="#991b1b" side={THREE.DoubleSide} />
                ) : thumbnailUrl ? (
                    <Suspense fallback={<meshBasicMaterial color="#333" />}>
                        <ThumbnailMaterial url={thumbnailUrl} />
                    </Suspense>
                ) : (
                    <meshBasicMaterial color={videoId ? "#000" : "#555"} side={THREE.DoubleSide} toneMapped={false} />
                )}
            </mesh>

            {hasError && (
                <Text color="white" anchorX="center" anchorY="middle" fontSize={0.2} maxWidth={width} position={[0,0,0.1]}>
                    VIDEO UNAVAILABLE
                </Text>
            )}

            {isRunning && videoUrl && !hasError && (
                <Html
                    transform
                    position={[0, 0, 0.05]}
                    scale={scale} 
                    rotation={[0, 0, 0]}
                    style={{
                        width: DEFAULT_EMBED_WIDTH,
                        height: DEFAULT_EMBED_WIDTH / aspect,
                        background: 'black',
                        pointerEvents: (videoControls ?? true) ? 'auto' : 'none',
                    }}
                >
                    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }} onClick={handleClick}>
                        <ReactPlayer
                            ref={playerRef}
                            url={videoUrl}
                            playing={playing}
                            loop={loopState}
                            muted={muted}
                            volume={volume}
                            controls={videoControls ?? true}
                            width="100%"
                            height="100%"
                            onReady={handlePlayerReady}
                            onError={handlePlayerError}
                            playsinline
                            config={{
                                youtube: {
                                    playerVars: { 
                                        modestbranding: 1,
                                        rel: 0,
                                        fs: videoFullScreen ? 1 : 0,
                                        origin: typeof window !== 'undefined' ? window.location.origin : ''
                                    },
                                    embedOptions: {
                                        host: 'https://www.youtube.com'
                                    }
                                }
                            }}
                        />
                    </div>
                </Html>
            )}
            
            {!videoId && content.videoUrl && !hasError && (
                <Text color="red" anchorX="center" anchorY="middle" fontSize={0.2} maxWidth={width} position={[0,0,0.1]}>INVALID ID</Text>
            )}
        </group>
    );
}, (prev, next) => {
    return prev.isRunning === next.isRunning &&
           prev.content.id === next.content.id &&
           prev.content.videoUrl === next.content.videoUrl &&
           prev.content.streamingService === next.content.streamingService &&
           prev.content.autoplay === next.content.autoplay &&
           prev.content.loop === next.content.loop &&
           prev.content.muted === next.content.muted &&
           prev.content.videoControls === next.content.videoControls &&
           prev.content.videoClickToggle === next.content.videoClickToggle &&
           prev.content.videoFullScreen === next.content.videoFullScreen;
});

const VideoFileContent = ({ content, onLoad, isRunning }: { content: Content, onLoad?: (data: any) => void, isRunning: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [aspect, setAspect] = useState(1.77); 
    const [video] = useState<HTMLVideoElement | null>(() => {
        if (typeof document === 'undefined') return null; // SSR Guard
        const vid = document.createElement('video');
        vid.crossOrigin = "Anonymous";
        vid.playsInline = true;
        vid.preload = "auto";
        vid.muted = true; 
        return vid;
    });

    useEffect(() => {
        if(!content.videoUrl || !video) return;
        if (video.src !== content.videoUrl) { video.src = content.videoUrl; video.load(); }
        video.loop = !!content.loop;
        const shouldPlay = content.autoplay || (content.type === ContentType.VIDEO && isRunning && content.autoplay);
        if(shouldPlay) {
            video.muted = !!content.muted;
            video.play().catch(e => {
                if (!video.muted) { video.muted = true; video.play().catch(err => console.warn("Autoplay blocked", err)); }
            });
        } else {
            if (video.paused && video.currentTime === 0) video.currentTime = 0.1; 
            video.pause();
        }
    }, [content.videoUrl, content.loop, content.muted, content.autoplay, video, isRunning, content.type]);

    useEffect(() => {
        if (!video) return;
        const onLoadedMetadata = () => { if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight); };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
    }, [video]);

    useEffect(() => { 
        if(onLoad && video) {
            onLoad({ 
                videoElement: video,
                player: {
                    playVideo: () => video.play(),
                    pauseVideo: () => video.pause(),
                    stopVideo: () => { video.pause(); video.currentTime = 0; },
                    seekTo: (seconds: number) => { video.currentTime = seconds; },
                    setVolume: (v: number) => { video.volume = v; },
                    setMuted: (m: boolean) => { video.muted = m; },
                    setLoop: (l: boolean) => { video.loop = l; },
                    getLoop: () => video.loop,
                    setFullscreen: (v: boolean) => {
                        if (v) video.requestFullscreen?.();
                        else if (document.fullscreenElement === video) document.exitFullscreen?.();
                    },
                    isPlaying: () => !video.paused
                }
            }); 
        } 
    }, [video, onLoad]);

    const togglePlay = useCallback((e: any) => {
        e.stopPropagation();
        if (!isRunning || !content.videoClickToggle || !video) return;
        if (video.paused) video.play(); else video.pause();
    }, [isRunning, content.videoClickToggle, video]);

    const texture = useMemo(() => {
        if (!video) return null;
        const tex = new THREE.VideoTexture(video);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.format = THREE.RGBAFormat;
        fixTexture(tex);
        return tex;
    }, [video]);

    useEffect(() => {
        return () => {
            if (texture) texture.dispose();
        }
    }, [texture]);
    
    // Sanitize chromaKey color
    const chromaColor = useMemo(() => {
        const c = content.chromaColor;
        if (!c || c === 'transparent') return new THREE.Color(0x00ff00);
        return new THREE.Color(c);
    }, [content.chromaColor]);

    if (!texture) {
        // Fallback or invisible placeholder during loading/SSR
        return null;
    }

    return (
        <mesh ref={meshRef} onClick={togglePlay}>
            <planeGeometry args={[aspect, 1]} />
            {content.chromaKey ? (
                <chromaKeyMaterial tex={texture} color={chromaColor} transparent side={THREE.DoubleSide} />
            ) : (
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
            )}
        </mesh>
    );
}

const AudioContent = ({ content, onLoad, listener }: { content: Content, onLoad?: (data: any) => void, listener: THREE.AudioListener | null }) => {
    const sound = useRef<THREE.PositionalAudio>(null!);
    const [audio] = useState<HTMLAudioElement | null>(() => {
        if (typeof Audio === 'undefined') return null; // SSR Guard
        const a = new Audio();
        a.crossOrigin = 'Anonymous';
        return a;
    });
    
    // Track which audio instance is currently connected to the PositionalAudio
    // to avoid type errors when checking properties that don't exist on standard THREE types
    // and to avoid unnecessary reconnections.
    const connectedRef = useRef<THREE.PositionalAudio | null>(null);

    useEffect(() => {
        if (!content.audioUrl || !listener || !audio) return;
        if (audio.src !== content.audioUrl) audio.src = content.audioUrl;
        audio.loop = !!content.loop;
        
        // Ensure source is connected to this specific sound instance
        if (sound.current && connectedRef.current !== sound.current) {
            sound.current.setMediaElementSource(audio);
            sound.current.setRefDistance(1);
            connectedRef.current = sound.current;
        }
        
        if (onLoad) onLoad({ audioElement: audio });
        if (content.autoplay) audio.play().catch(e => console.error("Audio autoplay failed:", e));
        else if (!audio.paused) audio.pause();
    }, [content.audioUrl, content.loop, content.autoplay, listener, onLoad, audio]);

    useEffect(() => () => {
        if (audio) {
            audio.pause();
            if(sound.current && sound.current.isPlaying) sound.current.stop();
            if(sound.current && sound.current.source) sound.current.disconnect();
        }
    }, [audio]);

    if (!listener || !audio) return null;

    return (
        <group>
            <positionalAudio ref={sound} args={[listener]} />
             <Html center>
                <div className="bg-purple-500 rounded-full p-2 w-10 h-10 flex items-center justify-center opacity-80 pointer-events-none">
                    <SpeakerIcon className="w-6 h-6 text-white" />
                </div>
            </Html>
        </group>
    );
};

const SceneContent = ({ 
    target, 
    contentRefs, 
    onSelect, 
    isRunning,
    onError,
    onContentUpdate,
    onObjectMounted
}: {
    target: Target | undefined,
    contentRefs: React.MutableRefObject<Map<string, THREE.Object3D>>,
    onSelect: (targetId: string, contentId?: string) => void,
    isRunning: boolean,
    onError: (error: Error | null) => void,
    onContentUpdate: (content: Content) => void,
    onObjectMounted: (id: string) => void
}) => {
    const { handleScriptClick, error } = useScriptEngine(target, contentRefs, isRunning);
    const { camera } = useThree();
    
    const [listener] = useState<THREE.AudioListener | null>(() => {
        if (typeof window === 'undefined') return null; // SSR Guard
        return new THREE.AudioListener();
    });

    useEffect(() => {
        if (listener) {
            camera.add(listener);
            return () => { camera.remove(listener); };
        }
    }, [camera, listener]);

    useEffect(() => { onError(error); }, [error, onError]);

    const handleContentLoad = (id: string, data: any) => {
        const group = contentRefs.current.get(id);
        if (group) Object.assign(group.userData, data);
    };

    const setRef = (id: string, node: THREE.Object3D | null) => {
        if (node) {
            contentRefs.current.set(id, node);
            onObjectMounted(id);
        } else {
            contentRefs.current.delete(id);
        }
    };

    return (
        <group>
             {target && (target.visible ?? true) && (
                <group>
                    {target.contents.map(content => {
                        const safeRotation = content.transform.rotation || [0,0,0];
                        const safeScale = content.transform.scale || [1,1,1];
                        const safePosition = content.transform.position || [0,0,0];
                        const isText = content.type === ContentType.TEXT && content.textContent;
                        const isImage = content.type === ContentType.IMAGE && content.imageUrl;
                        const isEmbed = content.type === ContentType.STREAMING_VIDEO || 
                                        (content.type === ContentType.ICON_YOUTUBE) || 
                                        (content.type === ContentType.VIDEO && typeof content.videoUrl === 'string' && 
                                        (content.videoUrl.includes('youtube') || content.videoUrl.includes('vimeo') || /^[a-zA-Z0-9_-]{11}$/.test(content.videoUrl)));
                        const isVideoFile = content.type === ContentType.VIDEO && !isEmbed && content.videoUrl;
                        const isAudio = content.type === ContentType.AUDIO && content.audioUrl;
                        const isModel = content.type === ContentType.MODEL && content.modelUrl;
                        const isVisible = content.visible ?? true;
                        const fontUrl = content.font ? FONT_MAP[content.font] : undefined;

                        // Sanitize outline color. THREE does not accept 'transparent'.
                        // If transparent is needed, width should be 0.
                        let outlineColor = content.outlineColor || '#000000';
                        if (outlineColor === 'transparent') outlineColor = '#000000';

                        const renderContent = () => (
                            <>
                                {isImage && <Suspense fallback={null}><ImageContent content={content} /></Suspense>}
                                {isEmbed && <Suspense fallback={null}><EmbedContent content={content} onLoad={(data) => handleContentLoad(content.id, data)} isRunning={isRunning} /></Suspense>}
                                {isVideoFile && <Suspense fallback={null}><VideoFileContent content={content} onLoad={(data) => handleContentLoad(content.id, data)} isRunning={isRunning} /></Suspense>}
                                {isAudio && <AudioContent content={content} listener={listener} onLoad={(data) => handleContentLoad(content.id, data)} />}
                                {isModel && <Suspense fallback={null}><ModelContent content={content} onLoad={(data) => handleContentLoad(content.id, data)} onUpdateMaterialNames={(names) => onContentUpdate({...content, materialNames: names})} /></Suspense>}
                                {isText && (
                                    <Text
                                        color={content.color || '#000000'}
                                        anchorX={(content.align as any) || 'center'}
                                        textAlign={(content.align as any) || 'center'}
                                        anchorY="middle"
                                        fontSize={content.size ? content.size * 0.05 : 0.05}
                                        font={fontUrl}
                                        outlineWidth={content.outlineWidth ? `${content.outlineWidth}%` : 0}
                                        outlineColor={outlineColor}
                                    >
                                        {content.textContent || ''}
                                    </Text>
                                )}
                            </>
                        );

                        return (
                            <group
                                key={content.id}
                                visible={isVisible}
                                ref={(node) => setRef(content.id, node)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (handleScriptClick(content)) return;
                                    if (!isRunning) onSelect(target.id, content.id);
                                }}
                                position={safePosition as [number, number, number]}
                                rotation={new THREE.Euler(...safeRotation.map(d => THREE.MathUtils.degToRad(d)) as [number, number, number])}
                                scale={safeScale as [number, number, number]}
                            >
                                {content.alwaysFacingUser ? (
                                    <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                                        {renderContent()}
                                    </Billboard>
                                ) : renderContent()}
                            </group>
                        );
                    })}
                </group>
            )}
        </group>
    );
}

interface ScenePanelProps {
  target: Target | undefined;
  selectedContent: Content | undefined;
  onContentUpdate: (content: Content) => void;
  onContentAdd: (content: Content) => void;
  onSelect: (targetId: string, contentId?: string) => void;
  onDeleteContent?: (targetId: string, contentId: string) => void;
  isPreviewMode?: boolean;
  assets?: Asset[];
  onAddAsset?: (asset: Asset) => void;
  sceneSettings?: SceneSettings; 
}

const ScenePanel: React.FC<ScenePanelProps> = ({ 
    target, 
    selectedContent, 
    onContentUpdate, 
    onContentAdd, 
    onSelect, 
    onDeleteContent,
    isPreviewMode = false,
    assets = [],
    onAddAsset,
    sceneSettings
}) => {
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isRunning, setIsRunning] = useState(isPreviewMode);
  const [scriptError, setScriptError] = useState<Error | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isDockOpen, setIsDockOpen] = useState(true);
  const [_, forceUpdate] = useState(0); 
  const contentRefs = useRef<Map<string, THREE.Object3D>>(new Map());

  // UPDATED: Default camera looking straight at the XY plane (MindAR style)
  // Z=10 gives a good overview of the target at z=0.
  const defaultCameraPos: [number, number, number] = [0, 0, 2];
  const previewCameraPos: [number, number, number] = [0, 0, 2.5];

  const handleObjectMounted = useCallback((id: string) => {
      if (selectedContent?.id === id) forceUpdate(n => n + 1);
  }, [selectedContent]);

  useEffect(() => {
    if (isPreviewMode) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftDown(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftDown(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPreviewMode]);

  useEffect(() => {
    if (isPreviewMode || isRunning) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
        switch (e.key.toLowerCase()) {
            case 'w': setTransformMode('translate'); break;
            case 'e': setTransformMode('rotate'); break;
            case 'r': setTransformMode('scale'); break;
            case 'backspace':
            case 'delete': if (target && selectedContent && onDeleteContent) onDeleteContent(target.id, selectedContent.id); break;
            case 'escape': if (target) onSelect(target.id); break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewMode, isRunning, target, selectedContent, onDeleteContent, onSelect]);

  useEffect(() => {
      if (!isPreviewMode) {
          setIsRunning(false);
          setScriptError(null);
      }
  }, [target?.id, isPreviewMode]);

  useEffect(() => { if (isPreviewMode) setIsRunning(true); }, [isPreviewMode]);

  const selectedObject = selectedContent ? contentRefs.current.get(selectedContent.id) : undefined;

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    
    // Enforce: Can only add content if a target is selected
    if (!target || isPreviewMode) {
        alert("Please add and select a Target first.");
        return;
    }

    const internalAssetData = e.dataTransfer.getData('application/json');
    if (internalAssetData) {
        try {
            const asset: Asset = JSON.parse(internalAssetData);
            let type: ContentType | null = null;
            if (asset.type === 'image') type = ContentType.IMAGE;
            else if (asset.type === 'video') type = ContentType.VIDEO;
            else if (asset.type === 'audio') type = ContentType.AUDIO;
            else if (asset.type === 'model') type = ContentType.MODEL;
            if (type) {
                let defaultScale: [number, number, number] = [1, 1, 1];
                // Scaled down to match 1-unit world size
                if (type === ContentType.VIDEO) defaultScale = [0.5, 0.5, 0.5];
                if (type === ContentType.IMAGE) defaultScale = [0.4, 0.4, 0.4];
                if (type === ContentType.MODEL) defaultScale = [0.1, 0.1, 0.1];

                const newContent: Content = {
                    id: `content_${Date.now()}`,
                    name: asset.name,
                    type: type,
                    transform: { position: [0, 0, 0.1], rotation: [0, 0, 0], scale: defaultScale },
                    visible: true,
                    autoplay: false,
                    loop: false
                };
                if (type === ContentType.IMAGE) newContent.imageUrl = asset.url;
                else if (type === ContentType.VIDEO) newContent.videoUrl = asset.url;
                else if (type === ContentType.AUDIO) newContent.audioUrl = asset.url;
                else if (type === ContentType.MODEL) newContent.modelUrl = asset.url;
                onContentAdd(newContent);
            }
        } catch (e) { console.error(e); }
        return;
    }
    if (!e.dataTransfer.files?.length) return;
    const file = e.dataTransfer.files[0];
    let type: ContentType | null = null;
    if (file.type.startsWith('image/')) type = ContentType.IMAGE;
    else if (file.type.startsWith('video/')) type = ContentType.VIDEO;
    else if (file.type.startsWith('audio/')) type = ContentType.AUDIO;
    else if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) type = ContentType.MODEL;
    // Note: We deliberately exclude .mind files here as they should be targets, not content. 

    if (type) {
        try {
            const base64Url = await fileToBase64(file);
            // Auto-add to assets library
            if (onAddAsset) {
                onAddAsset({
                    id: `asset_${Date.now()}`,
                    name: file.name.split('.').slice(0, -1).join('.') || 'New Asset',
                    type: type === ContentType.IMAGE ? 'image' : type === ContentType.AUDIO ? 'audio' : type === ContentType.MODEL ? 'model' : 'video',
                    url: base64Url,
                    thumbnail: type === ContentType.IMAGE ? base64Url : undefined
                });
            }
            let defaultScale: [number, number, number] = [1, 1, 1];
            if (type === ContentType.VIDEO) defaultScale = [0.5, 0.5, 0.5];
            if (type === ContentType.IMAGE) defaultScale = [0.4, 0.4, 0.4];
            if (type === ContentType.MODEL) defaultScale = [0.1, 0.1, 0.1];
            
            // Create Content attached to the current Target
            const newContent: Content = {
                id: `content_${Date.now()}`,
                name: file.name.split('.').slice(0, -1).join('.') || `New ${type}`,
                type: type,
                transform: { position: [0, 0, 0.1], rotation: [0, 0, 0], scale: defaultScale },
                visible: true,
                autoplay: false,
                loop: false,
            };
            if (type === ContentType.IMAGE) newContent.imageUrl = base64Url;
            else if (type === ContentType.VIDEO) newContent.videoUrl = base64Url;
            else if (type === ContentType.AUDIO) newContent.audioUrl = base64Url;
            else if (type === ContentType.MODEL) newContent.modelUrl = base64Url;
            onContentAdd(newContent);
        } catch (error) { alert("Failed to load file."); }
    } else alert('Unsupported file type for content.');
  };

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
      e.dataTransfer.setData('application/json', JSON.stringify(asset));
      e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTransformChange = () => {
        if (selectedObject && selectedContent) {
            const { position, rotation, scale } = selectedObject;
            onContentUpdate({
                ...selectedContent,
                transform: {
                    position: [position.x, position.y, position.z],
                    rotation: [THREE.MathUtils.radToDeg(rotation.x), THREE.MathUtils.radToDeg(rotation.y), THREE.MathUtils.radToDeg(rotation.z)],
                    scale: [scale.x, scale.y, scale.z],
                }
            });
        }
  }

  const isSnapping = snapEnabled || isShiftDown;

  return (
    <main 
      className={`flex-1 relative ${isPreviewMode ? 'w-full h-full bg-transparent' : 'bg-background-primary'}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (target) setIsDraggingOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
      onDrop={handleDrop}
    >
      {isDraggingOver && target && !isPreviewMode && (
        <div className="absolute inset-0 bg-accent-primary bg-opacity-50 flex items-center justify-center z-30 pointer-events-none">
            <p className="text-white text-2xl font-bold">Drop File Here to Add Content</p>
        </div>
      )}
      {!isPreviewMode && (
        <div className="absolute top-2 left-2 z-20 bg-background-secondary p-1 rounded-md flex gap-1 shadow-lg border border-border-default">
            <button onClick={() => setTransformMode('translate')} className={`p-2 rounded ${transformMode === 'translate' ? 'bg-accent-primary text-white' : 'bg-background-tertiary text-text-secondary hover:bg-background-hover'}`} disabled={isRunning}><MoveIcon className="w-4 h-4" /></button>
            <button onClick={() => setTransformMode('rotate')} className={`p-2 rounded ${transformMode === 'rotate' ? 'bg-accent-primary text-white' : 'bg-background-tertiary text-text-secondary hover:bg-background-hover'}`} disabled={isRunning}><RotateIcon className="w-4 h-4" /></button>
            <button onClick={() => setTransformMode('scale')} className={`p-2 rounded ${transformMode === 'scale' ? 'bg-accent-primary text-white' : 'bg-background-tertiary text-text-secondary hover:bg-background-hover'}`} disabled={isRunning}><ScaleIcon className="w-4 h-4" /></button>
            <div className="w-px bg-border-default mx-1"></div>
            <button onClick={() => setSnapEnabled(!snapEnabled)} className={`p-2 rounded ${isSnapping ? 'bg-accent-primary text-white' : 'bg-background-tertiary text-text-secondary hover:bg-background-hover'}`} title={`Toggle Snap (Hold Shift) - ${isSnapping ? 'ON' : 'OFF'}`} disabled={isRunning}><MagnetIcon className="w-4 h-4" /></button>
            <div className="w-px bg-border-default mx-1"></div>
            <button onClick={() => setIsRunning(!isRunning)} className={`px-3 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors ${isRunning ? 'bg-accent-danger text-white hover:bg-accent-danger/90' : 'bg-accent-success text-white hover:bg-accent-success/90'}`}>{isRunning ? 'STOP' : 'RUN SCRIPT'}</button>
        </div>
      )}
      {isRunning && !isPreviewMode && <div className="absolute top-2 right-2 z-20 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md animate-pulse pointer-events-none">LIVE PREVIEW</div>}
      {scriptError && (
          <div className="absolute top-14 left-2 right-2 z-50 bg-red-500 text-white p-3 rounded-md shadow-lg flex justify-between items-start">
              <div><p className="font-bold text-sm">Script Error</p><p className="text-xs mt-1 font-mono">{scriptError.message}</p></div>
              <button onClick={() => setScriptError(null)} className="hover:text-gray-200"><XMarkIcon className="w-5 h-5" /></button>
          </div>
      )}
      <Canvas 
        camera={{ position: isPreviewMode ? previewCameraPos : defaultCameraPos, fov: 50 }} 
        shadows 
        // explicit gl config to help with context loss management. Alpha enabled for preview transparency.
        gl={{ preserveDrawingBuffer: true, powerPreference: "default", alpha: true }}
      >
        <ambientLight intensity={sceneSettings?.ambientLightIntensity ?? 0.8} />
        <directionalLight 
            position={sceneSettings?.directionalLightPosition ?? [0, 0, 5]} 
            intensity={sceneSettings?.directionalLightIntensity ?? 1.5} 
            castShadow 
        />
        {!isPreviewMode && sceneSettings?.showGrid && <gridHelper args={[20, 20]} rotation={[Math.PI / 2, 0, 0]} />}
        {!isPreviewMode && sceneSettings?.showAxes && <axesHelper args={[2]} />}
        {target && (target.visible ?? true) && (
          <>
            <Suspense fallback={null}><TargetPlane target={target} onDeselect={() => !isRunning && onSelect(target.id)} /></Suspense>
            <SceneContent 
                target={target} 
                contentRefs={contentRefs} 
                onSelect={onSelect} 
                isRunning={isRunning} 
                onError={setScriptError}
                onContentUpdate={onContentUpdate}
                onObjectMounted={handleObjectMounted}
            />
          </>
        )}
        {selectedObject && selectedContent && !isRunning && !isPreviewMode && (
          <TransformControls
            object={selectedObject}
            mode={transformMode}
            onObjectChange={handleTransformChange}
            translationSnap={isSnapping ? 0.05 : null}
            rotationSnap={isSnapping ? Math.PI / 12 : null}
            scaleSnap={isSnapping ? 0.1 : null}
          />
        )}
        <OrbitControls makeDefault enabled={!isRunning || isPreviewMode} />
        {!isPreviewMode && <GizmoHelper alignment="top-right" margin={[80, 80]}><GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" /></GizmoHelper>}
      </Canvas>
       {!target && !isPreviewMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
           <div className="bg-white/80 backdrop-blur-sm text-black p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-2">No Target Selected</h2>
            <p className="text-sm">Add a new target or select one from the left panel to begin.</p>
          </div>
        </div>
      )}
      {!isPreviewMode && (
          <div className={`absolute bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out transform ${isDockOpen ? 'translate-y-0' : 'translate-y-[calc(100%-30px)]'}`}>
              <div className="bg-slate-900/90 backdrop-blur-sm border-t border-gray-700 flex flex-col h-40">
                  <div className="h-6 flex justify-center items-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsDockOpen(!isDockOpen)}>
                      <div className="w-10 h-1 bg-gray-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 overflow-x-auto p-4 flex gap-4">
                      {assets.length === 0 ? (
                          <div className="w-full flex items-center justify-center text-gray-400 text-sm italic">
                              Drag and drop files onto the scene to add them to your library.
                          </div>
                      ) : (
                          assets.map((asset) => (
                              <div key={asset.id} draggable onDragStart={(e) => handleDragStart(e, asset)} className="min-w-[100px] w-[100px] flex flex-col items-center gap-1 group cursor-grab active:cursor-grabbing">
                                  <div className="w-20 h-20 bg-gray-800 rounded-md overflow-hidden border border-gray-600 group-hover:border-blue-500 transition-colors flex items-center justify-center relative">
                                      {asset.type === 'image' && <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />}
                                      {asset.type === 'video' && (
                                          <>
                                            <VideoIcon className="w-8 h-8 text-gray-500 absolute" />
                                            {asset.thumbnail && <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover opacity-50" />}
                                          </>
                                      )}
                                      {asset.type === 'audio' && <AudioIcon className="w-8 h-8 text-gray-500" />}
                                      {asset.type === 'model' && <CubeIcon className="w-8 h-8 text-gray-500" />}
                                      {asset.type === 'mind' && <img src={asset.thumbnail || PLACEHOLDER_MIND} alt="Mind" className="w-full h-full object-contain" />}
                                      {asset.type === 'script' && <img src={asset.thumbnail || PLACEHOLDER_SCRIPT} alt="Script" className="w-full h-full object-contain" />}
                                  </div>
                                  <span className="text-[10px] text-gray-300 truncate w-full text-center px-1">{asset.name}</span>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </main>
  );
};

export default ScenePanel;
