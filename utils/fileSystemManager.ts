/**
 * File System Access API Manager
 * Provides direct file system access for saving projects as individual files
 * Note: Only works in Chromium browsers (Chrome, Edge)
 * 
 * @experimental - File System Access API is not yet standardized
 */

import { Project } from '../types';

// Extended window type for File System Access API
declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: string;
    }) => Promise<any>;
  }
}

/**
 * Check if File System Access API is supported
 */
export const isFileSystemSupported = (): boolean => {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
};

/**
 * Request access to a directory for storing projects
 * Returns a handle to the directory
 */
export const requestProjectsDirectory = async (): Promise<any | null> => {
  if (!isFileSystemSupported()) {
    console.warn('[FileSystem] File System Access API not supported in this browser');
    return null;
  }

  try {
    const dirHandle = await window.showDirectoryPicker?.({
      id: 'papar-studio-projects',
      mode: 'readwrite',
      startIn: 'documents'
    });

    if (dirHandle) {
      console.log('[FileSystem] Directory access granted:', dirHandle.name);
    }
    return dirHandle;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[FileSystem] Directory selection cancelled');
    } else {
      console.error('[FileSystem] Failed to get directory:', error);
    }
    return null;
  }
};

/**
 * Get or create the projects directory
 * Uses persisted permission if available
 */
export const getProjectsDirectory = async (): Promise<any | null> => {
  if (!isFileSystemSupported()) {
    return null;
  }

  try {
    const dirHandle = await window.showDirectoryPicker?.({
      id: 'papar-studio-projects',
      mode: 'readwrite'
    });
    return dirHandle || null;
  } catch {
    return requestProjectsDirectory();
  }
};

/**
 * Save a project to the file system as a JSON file
 */
export const saveProjectToFileSystem = async (
  project: Project,
  dirHandle?: any
): Promise<boolean> => {
  if (!isFileSystemSupported()) {
    console.warn('[FileSystem] File System not supported');
    return false;
  }

  try {
    let directory = dirHandle;
    
    if (!directory) {
      directory = await requestProjectsDirectory();
      if (!directory) return false;
    }

    const projectFolderName = sanitizeFileName(project.name) + '_' + project.id.substring(0, 8);
    let projectFolder: any;
    
    try {
      projectFolder = await directory.getDirectoryHandle(projectFolderName, { create: true });
    } catch {
      projectFolder = await directory.getDirectoryHandle(projectFolderName);
    }

    const projectFileName = 'project.json';
    const projectFile = await projectFolder.getFileHandle(projectFileName, { create: true });
    const writable = await projectFile.createWritable();
    
    await writable.write(JSON.stringify(project, null, 2));
    await writable.close();

    console.log('[FileSystem] Project saved:', project.name);
    return true;
  } catch (error) {
    console.error('[FileSystem] Failed to save project:', error);
    return false;
  }
};

/**
 * Load a project from the file system
 */
export const loadProjectFromFileSystem = async (
  projectId: string,
  dirHandle?: any
): Promise<Project | null> => {
  if (!isFileSystemSupported()) {
    return null;
  }

  try {
    let directory = dirHandle;
    
    if (!directory) {
      directory = await getProjectsDirectory();
      if (!directory) return null;
    }

    for await (const entry of directory.values()) {
      if (entry.kind === 'directory' && entry.name.endsWith('_' + projectId.substring(0, 8))) {
        const projectFile = await entry.getFileHandle('project.json');
        const file = await projectFile.getFile();
        const content = await file.text();
        return JSON.parse(content) as Project;
      }
    }

    console.warn('[FileSystem] Project not found:', projectId);
    return null;
  } catch (error) {
    console.error('[FileSystem] Failed to load project:', error);
    return null;
  }
};

/**
 * List all projects in the directory
 */
export const listProjectsInDirectory = async (
  dirHandle?: any
): Promise<{ name: string; id: string }[]> => {
  if (!isFileSystemSupported()) {
    return [];
  }

  try {
    let directory = dirHandle;
    
    if (!directory) {
      directory = await getProjectsDirectory();
      if (!directory) return [];
    }

    const projects: { name: string; id: string }[] = [];

    for await (const entry of directory.values()) {
      if (entry.kind === 'directory') {
        const parts = entry.name.split('_');
        if (parts.length >= 2) {
          const id = parts.pop() || '';
          const name = parts.join('_');
          projects.push({ name, id });
        }
      }
    }

    return projects;
  } catch (error) {
    console.error('[FileSystem] Failed to list projects:', error);
    return [];
  }
};

/**
 * Delete a project from the file system
 */
export const deleteProjectFromFileSystem = async (
  projectId: string,
  dirHandle?: any
): Promise<boolean> => {
  if (!isFileSystemSupported()) {
    return false;
  }

  try {
    let directory = dirHandle;
    
    if (!directory) {
      directory = await getProjectsDirectory();
      if (!directory) return false;
    }

    for await (const entry of directory.values()) {
      if (entry.kind === 'directory' && entry.name.endsWith('_' + projectId.substring(0, 8))) {
        await directory.removeEntry(entry.name, { recursive: true });
        console.log('[FileSystem] Project deleted:', projectId);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[FileSystem] Failed to delete project:', error);
    return false;
  }
};

/**
 * Export project to a downloadable file (works in all browsers)
 */
export const exportProjectToDownload = (project: Project): void => {
  const json = JSON.stringify(project, null, 2);
  const filename = `${sanitizeFileName(project.name)}.json`;
  
  downloadFile(json, filename, 'application/json');
};

/**
 * Check if directory permission is granted
 */
export const checkDirectoryPermission = async (): Promise<boolean> => {
  if (!isFileSystemSupported()) {
    return false;
  }

  try {
    const dirHandle = await window.showDirectoryPicker?.({
      id: 'papar-studio-projects',
      mode: 'readwrite'
    });
    
    return !!dirHandle;
  } catch {
    return false;
  }
};

// Helper functions

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
