
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
  AUDIO = 'audio',
  MODEL = 'model',
}

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface MaterialProperties {
  color?: string;
  map?: string;
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
  color?: string;
  outlineColor?: string;
  outlineWidth?: number;
  font?: string;
  style?: 'normal' | 'italic';
  weight?: 'normal' | 'bold';
  size?: number;
  align?: 'left' | 'center' | 'right';
  textContent?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  streamingService?: 'youtube' | 'vimeo';
  videoClickToggle?: boolean;
  videoControls?: boolean;
  videoFullScreen?: boolean;
  chromaKey?: boolean;
  chromaColor?: string;
  modelUrl?: string;
  animateAutostart?: boolean;
  animateLoop?: 'once' | 'repeat' | 'pingpong';
  textureOverrides?: Record<string, string>;
  materialOverrides?: Record<string, MaterialProperties>;
  materialNames?: string[];
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'model' | 'mind' | 'script';
  url: string;
  thumbnail?: string;
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
}

export interface Template {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  project: Project;
}

export interface SceneSettings {
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  directionalLightPosition: [number, number, number];
  showGrid: boolean;
  showAxes: boolean;
}

export const FONT_MAP: Record<string, string> = {
  'Roboto': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
  'Arial': 'https://fonts.gstatic.com/s/arimo/v28/P5sMzZCDf9_T_10ZxCKE.woff2', 
  'Courier New': 'https://fonts.gstatic.com/s/cousine/v25/d6lIkPgBpSg_A7tF9i8d.woff2', 
  'Times New Roman': 'https://fonts.gstatic.com/s/tinos/v25/buE4poGqeOy1m54nmD8S.woff2', 
  'Montserrat': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
  'Oswald': 'https://fonts.gstatic.com/s/oswald/v49/TK3iWkUHHAIjg75oxSD03w.woff2',
};
