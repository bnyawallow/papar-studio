/**
 * Storage Manager Utility
 * Handles localStorage operations with quota management and error handling
 */

import { Project } from '../types';

const STORAGE_KEY = 'papar_projects';
const MAX_PROJECTS_IN_STORAGE = 20; // Limit number of projects stored locally
const STORAGE_WARNING_THRESHOLD = 0.8; // Warn when 80% of quota is used

/**
 * Check if a QuotaExceededError occurred
 */
export const isQuotaExceededError = (error: unknown): boolean => {
  return error instanceof DOMException && (
    error.code === 22 || // Legacy QuotaExceededError code
    error.code === 1014 || // Firefox specific
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
};

/**
 * Get approximate localStorage usage
 */
export const getStorageUsage = (): { used: number; quota: number; percentage: number } => {
  let used = 0;
  let quota = 0;
  
  try {
    // Estimate usage by iterating through all keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        used += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16 = 2 bytes per char
      }
    }
    
    // Quota varies by browser: ~5-10MB for localStorage
    // We'll use a conservative estimate
    quota = 5 * 1024 * 1024; // 5MB conservative estimate
  } catch (e) {
    console.warn('Failed to calculate storage usage:', e);
  }
  
  return {
    used,
    quota,
    percentage: quota > 0 ? used / quota : 0
  };
};

/**
 * Check if storage is nearly full
 */
export const isStorageNearLimit = (): boolean => {
  const { percentage } = getStorageUsage();
  return percentage >= STORAGE_WARNING_THRESHOLD;
};

/**
 * Compress project data by removing unnecessary fields for storage
 */
const compressProjectForStorage = (project: Project): Partial<Project> => {
  // Create a minimal copy for local storage
  const minimal = {
    id: project.id,
    name: project.name,
    status: project.status,
    lastUpdated: project.lastUpdated,
    publishedSlug: project.publishedSlug,
    sizeMB: project.sizeMB,
    targets: project.targets?.map((target: any) => ({
      id: target.id,
      name: target.name,
      imageUrl: target.imageUrl,
      mindFileUrl: target.mindFileUrl,
      visible: target.visible,
      script: target.script,
      // Store minimal content data - references to assets rather than full data
      contents: target.contents?.map((content: any) => ({
        id: content.id,
        name: content.name,
        type: content.type,
        transform: content.transform,
        visible: content.visible,
        // Store only URLs/references, not full base64 data
        imageUrl: content.imageUrl,
        videoUrl: content.videoUrl,
        audioUrl: content.audioUrl,
        modelUrl: content.modelUrl,
        textContent: content.textContent,
        // Store material overrides but not texture maps (which are URLs)
        materialOverrides: content.materialOverrides
      }))
    })) || [],
    assets: project.assets?.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      url: asset.url,
      thumbnail: asset.thumbnail
    })) || [],
    mindARConfig: project.mindARConfig
  };
  
  return minimal;
};

/**
 * Safely save projects to localStorage with quota handling
 */
export const saveProjectsToLocalStorage = (projects: Project[]): boolean => {
  try {
    // Compress projects to reduce storage size
    const compressedProjects = projects.map(p => compressProjectForStorage(p) as Project);
    const data = JSON.stringify(compressedProjects);
    
    // Check if we're near the limit before saving
    const { percentage } = getStorageUsage();
    const dataSize = data.length * 2; // UTF-16
    const projectedUsage = percentage + (dataSize / (5 * 1024 * 1024));
    
    if (projectedUsage > STORAGE_WARNING_THRESHOLD) {
      console.warn(`[Storage] Warning: Storage is ${(percentage * 100).toFixed(1)}% full. Attempting cleanup...`);
      
      // Try to clean up old projects before saving
      cleanupOldProjects(compressedProjects as Project[]);
    }
    
    localStorage.setItem(STORAGE_KEY, data);
    console.log(`[Storage] Saved ${projects.length} projects to localStorage (${(data.length / 1024).toFixed(1)}KB)`);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.error('[Storage] Quota exceeded! Attempting emergency cleanup...');
      
      // Emergency cleanup: keep only the most recent projects
      const minimalProjects = projects.slice(0, 5);
      
      // Log data loss if it will occur
      if (minimalProjects.length < projects.length) {
        console.error(`[Storage] DATA LOSS: Reducing from ${projects.length} to 5 projects to fit in localStorage`);
      }
      
      const compressedMinimal = minimalProjects.map(p => compressProjectForStorage(p) as Project);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compressedMinimal));
        console.warn('[Storage] Emergency cleanup: Saved only 5 most recent projects');
        // Return false if data was lost, true only if all projects fit
        return projects.length <= 5;
      } catch (retryError) {
        console.error('[Storage] Even emergency cleanup failed:', retryError);
        return false;
      }
    }
    
    console.error('[Storage] Failed to save to localStorage:', error);
    return false;
  }
};

/**
 * Load projects from localStorage
 */
export const loadProjectsFromLocalStorage = (): Project[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const projects = JSON.parse(data);
    console.log(`[Storage] Loaded ${projects.length} projects from localStorage`);
    return projects;
  } catch (error) {
    console.error('[Storage] Failed to load from localStorage:', error);
    return null;
  }
};

/**
 * Delete project from localStorage
 */
export const deleteProjectFromLocalStorage = (projectId: string): boolean => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return true;
    
    const projects: Project[] = JSON.parse(data);
    const filtered = projects.filter((p: Project) => p.id !== projectId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete from localStorage:', error);
    return false;
  }
};

/**
 * Clean up old/archived projects to free space
 */
const cleanupOldProjects = (projects: Project[]): void => {
  if (projects.length <= MAX_PROJECTS_IN_STORAGE) {
    return; // No cleanup needed
  }
  
  // Sort by lastUpdated and keep only the most recent
  const sorted = [...projects].sort((a: Project, b: Project) => {
    const dateA = new Date(a.lastUpdated || 0).getTime();
    const dateB = new Date(b.lastUpdated || 0).getTime();
    return dateB - dateA;
  });
  
  const kept = sorted.slice(0, MAX_PROJECTS_IN_STORAGE);
  console.log(`[Storage] Cleanup: Reduced from ${projects.length} to ${kept.length} projects`);
  
  // Save the cleaned list
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch (e) {
    console.warn('[Storage] Cleanup failed:', e);
  }
};

/**
 * Clear all projects from localStorage
 */
export const clearLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Storage] Cleared all projects from localStorage');
  } catch (error) {
    console.error('[Storage] Failed to clear localStorage:', error);
  }
};

/**
 * Get storage statistics
 */
export const getStorageStats = (): {
  projectCount: number;
  estimatedSizeKB: number;
  usagePercentage: number;
  isNearLimit: boolean;
} => {
  let projectCount = 0;
  let estimatedSizeKB = 0;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const projects = JSON.parse(data);
      projectCount = projects.length;
      estimatedSizeKB = (data.length * 2) / 1024;
    }
  } catch (e) {
    console.warn('[Storage] Failed to get stats:', e);
  }
  
  const { percentage } = getStorageUsage();
  
  return {
    projectCount,
    estimatedSizeKB: Math.round(estimatedSizeKB),
    usagePercentage: Math.round(percentage * 100),
    isNearLimit: percentage >= STORAGE_WARNING_THRESHOLD
  };
};
