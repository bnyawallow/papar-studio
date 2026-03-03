/**
 * File Export/Import Utilities
 * Provides JSON export/import functionality for project backup
 */

import { Project } from '../types';
import JSZip from 'jszip';

/**
 * Export a single project to JSON file
 */
export const exportProjectToJSON = (project: Project): string => {
  // Clean up any internal fields before export
  const cleanProject = { ...project };
  delete (cleanProject as any)._savedAt;
  
  return JSON.stringify(cleanProject, null, 2);
};

/**
 * Export a project with its assets as a ZIP file
 * This provides a complete backup that can be imported later
 */
export const exportProjectToZip = async (
  project: Project,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; failedAssets: string[] }> => {
  const zip = new JSZip();
  const projectFolder = zip.folder(project.id) || zip;
  const failedAssets: string[] = [];
  
  // Add project JSON
  onProgress?.(10);
  const projectJson = exportProjectToJSON(project);
  projectFolder.file(`${project.name.replace(/[^a-z0-9]/gi, '_')}.json`, projectJson);
  
  onProgress?.(10);
  
  // Collect all asset URLs from the project
  const assetUrls: { url: string; id: string; type: string }[] = [];
  
  for (const target of project.targets) {
    for (const content of target.contents) {
      if (content.type === 'image' && content.imageUrl && !content.imageUrl.startsWith('data:')) {
        assetUrls.push({ url: content.imageUrl, id: content.id, type: 'image' });
      }
      if (content.type === 'video' && content.videoUrl && !content.videoUrl.startsWith('data:')) {
        assetUrls.push({ url: content.videoUrl, id: content.id, type: 'video' });
      }
      if (content.type === 'audio' && content.audioUrl && !content.audioUrl.startsWith('data:')) {
        assetUrls.push({ url: content.audioUrl, id: content.id, type: 'audio' });
      }
      if (content.type === 'model' && content.modelUrl && !content.modelUrl.startsWith('data:')) {
        assetUrls.push({ url: content.modelUrl, id: content.id, type: 'model' });
      }
    }
    
    // Target images
    if (target.imageUrl && !target.imageUrl.startsWith('data:')) {
      assetUrls.push({ url: target.imageUrl, id: target.id, type: 'target' });
    }
  }
  
  // Download assets
  const assetsFolder = projectFolder.folder('assets');
  const totalAssets = assetUrls.length;
  
  for (let i = 0; i < totalAssets; i++) {
    const asset = assetUrls[i];
    try {
      const response = await fetch(asset.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const ext = getExtensionFromBlob(blob, asset.type);
      const filename = `${asset.type}_${asset.id.substring(0, 8)}.${ext}`;
      assetsFolder?.file(filename, blob);
    } catch (e) {
      console.warn(`[Export] Failed to download asset: ${asset.url}`, e);
      failedAssets.push(asset.url);
    }
    
    onProgress?.(10 + Math.round((i / totalAssets) * 80));
  }
  
  onProgress?.(95);
  
  // Add manifest with failed assets information
  const manifest = {
    projectName: project.name,
    exportedAt: new Date().toISOString(),
    totalAssets: totalAssets,
    failedAssets: failedAssets,
    warning: failedAssets.length > 0 
      ? `${failedAssets.length} asset(s) could not be exported. They may be from external sources or have access restrictions.`
      : undefined
  };
  projectFolder.file('_manifest.json', JSON.stringify(manifest, null, 2));
  
  onProgress?.(100);
  
  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, failedAssets };
};

/**
 * Import a project from JSON file
 */
export const importProjectFromJSON = (jsonString: string): Project | null => {
  try {
    const project = JSON.parse(jsonString) as Project;
    
    // Validate required fields
    if (!project.id || !project.name || !project.targets) {
      console.error('[Import] Invalid project JSON: missing required fields');
      return null;
    }
    
    // Generate new ID if needed to avoid conflicts
    const newId = generateProjectId();
    const importedProject: Project = {
      ...project,
      id: newId,
      name: `${project.name} (Imported)`,
      lastUpdated: new Date().toLocaleString()
    };
    
    return importedProject;
  } catch (error) {
    console.error('[Import] Failed to parse project JSON:', error);
    return null;
  }
};

/**
 * Import a project from ZIP file (with assets)
 */
export const importProjectFromZip = async (
  zipBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Project | null> => {
  try {
    onProgress?.(10);
    
    const zip = await JSZip.loadAsync(zipBlob);
    
    // Find JSON file
    const jsonFiles = Object.keys(zip.files).filter(
      name => name.endsWith('.json') && !name.includes('/assets/')
    );
    
    if (jsonFiles.length === 0) {
      console.error('[Import] No project JSON found in ZIP');
      return null;
    }
    
    onProgress?.(30);
    
    // Parse JSON
    const jsonContent = await zip.file(jsonFiles[0])?.async('string');
    if (!jsonContent) {
      console.error('[Import] Failed to read JSON file');
      return null;
    }
    
    const project = importProjectFromJSON(jsonContent);
    if (!project) return null;
    
    onProgress?.(50);
    
    // Map old asset URLs to new local paths
    const assetMap = new Map<string, string>();
    const assetsFolder = zip.folder('assets');
    
    if (assetsFolder) {
      const assetFiles = Object.keys(assetsFolder.files);
      const totalAssets = assetFiles.length;
      
      for (let i = 0; i < totalAssets; i++) {
        const filename = assetFiles[i];
        const file = assetsFolder.files[filename];
        
        if (!file.dir) {
          const blob = await file.async('blob');
          const url = URL.createObjectURL(blob);
          const id = filename.split('_')[1]?.replace(/\.[^/.]+$/, '') || filename;
          assetMap.set(id, url);
        }
        
        onProgress?.(50 + Math.round((i / totalAssets) * 40));
      }
    }
    
    // Update content URLs with local blob URLs
    for (const target of project.targets) {
      for (const content of target.contents) {
        const localUrl = assetMap.get(content.id);
        if (localUrl) {
          if (content.type === 'image') content.imageUrl = localUrl;
          if (content.type === 'video') content.videoUrl = localUrl;
          if (content.type === 'audio') content.audioUrl = localUrl;
          if (content.type === 'model') content.modelUrl = localUrl;
        }
      }
    }
    
    onProgress?.(100);
    
    return project;
  } catch (error) {
    console.error('[Import] Failed to import from ZIP:', error);
    return null;
  }
};

/**
 * Download a file to the user's computer
 */
export const downloadFile = (content: string | Blob, filename: string, mimeType: string = 'application/json'): void => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Create a file input for importing projects
 */
export const createFileInput = (
  accept: string = '.json',
  onFileSelected: (file: File) => void
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };
  return input;
};

/**
 * Read file as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * Read file as blob
 */
export const readFileAsBlob = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  return new Blob([arrayBuffer], { type: file.type });
};

// Helper functions

function generateProjectId(): string {
  return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

function getExtensionFromBlob(blob: Blob, type: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'model/gltf-binary': 'glb',
    'application/octet-stream': 'glb'
  };
  
  if (mimeToExt[blob.type]) {
    return mimeToExt[blob.type];
  }
  
  // Fallback based on type
  const typeToExt: Record<string, string> = {
    'image': 'jpg',
    'video': 'mp4',
    'audio': 'mp3',
    'model': 'glb',
    'target': 'jpg'
  };
  
  return typeToExt[type] || 'bin';
}
