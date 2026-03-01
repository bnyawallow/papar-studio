

export enum ContentType {
  AVATAR = 'avatar',
  RESUME = 'resume',
  ICON_FACEBOOK = 'icon-facebook',
  ICON_EMAIL = 'icon-email',
  ICON_YOUTUBE = 'icon-youtube',
  ICON_WEBSITE = 'icon-website',
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  STREAMING_VIDEO = 'streaming-video',
  // TODO: Implement YOUTUBE content type support - used for embedding YouTube videos directly
  YOUTUBE = 'youtube',
  // TODO: Implement VIMEO content type support - used for embedding Vimeo videos directly
  VIMEO = 'vimeo',
  AUDIO = 'audio',
  MODEL = 'model',
  // TODO: Implement EMBED content type support - used for embedding third-party content (iframes, etc.)
  EMBED = 'embed',
}

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface MaterialProperties {
  color?: string;
  map?: string; // Texture URL
  metalness?: number;
  roughness?: number;
  emissive?: string;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
}

export interface Content {
  id: string;
  name: string;
  type: ContentType;
  transform: Transform;
  alwaysFacingUser?: boolean;
  visible?: boolean;
  // Text specific
  color?: string;
  outlineColor?: string;
  outlineWidth?: number;
  font?: string;
  style?: 'normal' | 'italic';
  weight?: 'normal' | 'bold';
  size?: number;
  align?: 'left' | 'center' | 'right';
  textContent?: string;
  // Image specific
  imageUrl?: string;
  // Video/Audio specific
  videoUrl?: string;
  audioUrl?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  streamingService?: 'youtube' | 'vimeo'; // Explicit service selector
  videoClickToggle?: boolean; // Toggle play/pause on click
  videoControls?: boolean; // Show playback controls
  videoFullScreen?: boolean; // Allow fullscreen
  chromaKey?: boolean;
  chromaColor?: string;
  // Model specific
  modelUrl?: string;
  animateAutostart?: boolean;
  animateLoop?: 'once' | 'repeat' | 'pingpong';
  textureOverrides?: Record<string, string>; // materialName -> imageUrl (Legacy)
  materialOverrides?: Record<string, MaterialProperties>; // Advanced material editing
  materialNames?: string[]; // Detected material names
  // Pictarize Studio additional properties
  // TODO: Implement embedUrl support - for EMBED content type rendering
  embedUrl?: string; // For EMBED content type
  // TODO: Implement aspectRatio support - for controlling video/image aspect ratios
  aspectRatio?: string; // e.g., '16:9', '4:3'
  // TODO: Implement fitMode support - for object-fit style rendering
  fitMode?: 'cover' | 'contain' | 'fill';
  // Note: opacity is already defined in MaterialProperties, keeping here for content-level control
  opacity?: number;
  // TODO: Implement animationIn/Out - for entry/exit animations on content
  animationIn?: string; // Entry animation
  animationOut?: string; // Exit animation
  // TODO: Implement delay/duration - for controlling animation timing
  delay?: number; // Animation delay in ms
  duration?: number; // Animation duration in ms
}

export interface Asset {
    id: string; // Add ID for better tracking
    name: string;
    type: 'image' | 'video' | 'audio' | 'model' | 'mind' | 'script' | 'embed';
    url: string; // Generic URL field
    thumbnail?: string; // For videos/models
    contentType?: ContentType; // Link to ContentType for compatibility
    metadata?: Record<string, unknown>; // Additional metadata
}

export interface Target {
  id: string;
  name: string;
  imageUrl: string;
  mindFileUrl?: string;
  contents: Content[];
  visible?: boolean;
  script?: string; 
}

export interface MindARConfig {
    maxTrack: number;
    warmupTolerance: number;
    missTolerance: number;
    filterMinCF: number;
    filterBeta: number;
    autoSaveDelay?: number; // Auto-save delay in milliseconds (default: 10000)
}

export interface Project {
  id: string;
  name: string;
  targets: Target[];
  assets?: Asset[];
  mindARConfig?: MindARConfig;
  lastUpdated: string;
  status: 'Draft' | 'Published';
  sizeMB: number;
  publishedSlug?: string; // Store the slug used when published for URL consistency
  // Template metadata
  templateId?: string; // ID of template used to create this project
  templateName?: string; // Human-readable template name
}

export interface Template {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    project: Project;
    version?: string; // Template version for migrations
    category?: string; // e.g., 'business', 'education', 'entertainment'
}

export interface SceneSettings {
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  directionalLightPosition: [number, number, number];
  showGrid: boolean;
  showAxes: boolean;
}

// Font Mapping for reliable rendering
export const FONT_MAP: Record<string, string> = {
  'Roboto': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
  'Arial': 'https://fonts.gstatic.com/s/arimo/v28/P5sMzZCDf9_T_10ZxCKE.woff2', 
  'Courier New': 'https://fonts.gstatic.com/s/cousine/v25/d6lIkPgBpSg_A7tF9i8d.woff2', 
  'Times New Roman': 'https://fonts.gstatic.com/s/tinos/v25/buE4poGqeOy1m54nmD8S.woff2', 
  'Montserrat': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
  'Oswald': 'https://fonts.gstatic.com/s/oswald/v49/TK3iWkUHHAIjg75oxSD03w.woff2',
};