/**
 * Runtime - Barrel export for all runtime classes.
 * 
 * This module provides the core runtime architecture mirroring refcode.
 */

// Base classes
export { ContentObject, type ScriptAPI, type ContentObjectOptions } from './ContentObject';
export { SceneObject, type SceneScriptAPI, type SystemControl } from './SceneObject';
export { EditorControls, type EditorControlsOptions } from './EditorControls';

// Content object classes
export { ImageObject } from './ImageObject';
export { VideoObject, type VideoScriptAPI } from './VideoObject';
export { AudioObject, type AudioScriptAPI } from './AudioObject';
export { ModelObject, type ModelScriptAPI, type ModelData } from './ModelObject';
export { TextObject } from './TextObject';
export { EmbedObject, type EmbedScriptAPI, type EmbedPlayer } from './EmbedObject';

// Main orchestrator
export { 
  Player, 
  type PlayerOptions, 
  type TargetRuntime, 
  type ScriptFunctions, 
  type ScriptEventParams 
} from './Player';

// Re-export legacy RuntimeObjects for backwards compatibility
// These can be gradually migrated to the new architecture
export { 
  ContentObject as LegacyContentObject,
  VideoObject as LegacyVideoObject,
  EmbedObject as LegacyEmbedObject,
  ModelObject as LegacyModelObject,
  AudioObject as LegacyAudioObject
} from './RuntimeObjects';
