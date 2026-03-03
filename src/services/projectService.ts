
import { Project } from '../../types';
import { supabase } from './supabase';
import { MOCK_PROJECTS } from '../data/mockData';
import { getContentType } from '../../utils/contentType';
import {
  saveProjectsToLocalStorage,
  loadProjectsFromLocalStorage,
  deleteProjectFromLocalStorage,
  isQuotaExceededError,
  isStorageNearLimit,
  getStorageStats as getLocalStorageStats
} from '../../utils/storageManager';
import {
  saveProjectToIndexedDB,
  saveProjectsToIndexedDB,
  loadProjectsFromIndexedDB,
  getProjectByIdFromIndexedDB,
  deleteProjectFromIndexedDB,
  isIndexedDBSupported,
  migrateFromLocalStorage,
  getIndexedDBStats
} from '../../utils/indexedDBManager';

const STORAGE_KEY = 'papar_projects';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

// Connection state management
let connectionStatus: ConnectionStatus = 'checking';
let connectionListeners: ((status: ConnectionStatus) => void)[] = [];

export const getConnectionStatus = (): ConnectionStatus => connectionStatus;

export const setConnectionStatus = (status: ConnectionStatus) => {
  connectionStatus = status;
  connectionListeners.forEach(listener => listener(status));
};

export const subscribeToConnectionStatus = (listener: (status: ConnectionStatus) => void) => {
  connectionListeners.push(listener);
  return () => {
    connectionListeners = connectionListeners.filter(l => l !== listener);
  };
};

export const loadProjects = async (): Promise<Project[]> => {
  // First try IndexedDB (primary local storage)
  if (isIndexedDBSupported()) {
    try {
      const idbProjects = await loadProjectsFromIndexedDB();
      if (idbProjects.length > 0) {
        return idbProjects;
      }
    } catch (e) {
      console.warn('[Storage] IndexedDB load failed, trying localStorage:', e);
    }
  }

  // Fallback to localStorage
  if (!supabase) {
    console.warn("Supabase not connected. Using local storage.");
    // Use storage manager for localStorage with quota handling
    const stored = loadProjectsFromLocalStorage();
    if (stored) {
      return stored;
    }
    // Return mocks if no local data
    return MOCK_PROJECTS;
  }

  try {
    const { data, error, status } = await supabase
      .from('projects')
      .select('*')
      .order('last_updated', { ascending: false });

    // Handle 406 Not Acceptable - often indicates RLS or header issues
    if (error) {
      console.error('Supabase load error:', error);
      // Check for common error codes that might manifest as 406
      if (error.code === 'PGRST116' || status === 406) {
        console.warn('Supabase returned 406 - falling back to local storage');
        const stored = loadProjectsFromLocalStorage();
        return stored || [];
      }
      throw error;
    }

    if (data && data.length > 0) {
      return data.map((row: any) => ({
        ...row.data,
        id: row.id,
        name: row.name,
        lastUpdated: new Date(row.last_updated).toLocaleString(),
        status: row.status
      }));
    }
  } catch (e) {
    console.warn("Failed to load from Supabase (returning empty list):", e);
  }
  
  return [];
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  // Try IndexedDB first (primary local storage)
  if (isIndexedDBSupported()) {
    try {
      const project = await getProjectByIdFromIndexedDB(id);
      if (project) {
        return project;
      }
    } catch (e) {
      console.warn('[Storage] IndexedDB getProjectById failed:', e);
    }
  }

  if (!supabase) {
    // Use storage manager for localStorage
    const stored = loadProjectsFromLocalStorage();
    if (stored) {
      return stored.find(p => p.id === id) || null;
    }
    return MOCK_PROJECTS.find(p => p.id === id) || null;
  }

  try {
    const { data, error, status } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    // Don't throw on PGRST116 (no rows) - return null instead so fallback to slug works
    if (error) {
      // Handle 406 errors - fallback to localStorage
      if (error.code === 'PGRST116' || status === 406) {
        console.warn('Project not found in Supabase, trying local storage');
        const stored = loadProjectsFromLocalStorage();
        if (stored) {
          return stored.find(p => p.id === id) || null;
        }
        return null;
      }
      throw error;
    }
    
    if (data) {
      return {
        ...data.data,
        id: data.id,
        name: data.name,
        publishedSlug: data.published_slug,
        lastUpdated: new Date(data.last_updated).toLocaleString(),
        status: data.status
      };
    }
  } catch (e) {
    console.error("Failed to load project:", e);
    // Fallback to localStorage on any error
    const stored = loadProjectsFromLocalStorage();
    if (stored) {
      return stored.find(p => p.id === id) || null;
    }
  }
  return null;
};

// Generate slug from project name
const generateSlug = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Get project by slug (for published apps accessed via /apps/project-name)
export const getProjectBySlug = async (slug: string): Promise<Project | null> => {
  if (!supabase) {
    // Use storage manager for localStorage
    const stored = loadProjectsFromLocalStorage();
    if (stored) {
      // Find project with matching slug (either generated from name or stored publishedSlug)
      const found = stored.find(p => 
        generateSlug(p.name) === slug || 
        ((p as any).publishedSlug && (p as any).publishedSlug === slug)
      );
      return found || null;
    }
    // Check mock projects
    return MOCK_PROJECTS.find(p => generateSlug(p.name) === slug) || null;
  }

  try {
    // Query directly by published_slug for efficiency
    const { data, error, status } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'Published')
      .or('published_slug.eq.' + slug + ',name.ilike.' + slug)
      .limit(1);

    // Handle 406 errors - fallback to localStorage
    if (error) {
      console.warn('Supabase slug query error:', error);
      if (status === 406) {
        console.warn('Supabase returned 406 - falling back to local storage for slug lookup');
        const stored = loadProjectsFromLocalStorage();
        if (stored) {
          const found = stored.find(p => 
            generateSlug(p.name) === slug || 
            ((p as any).publishedSlug && (p as any).publishedSlug === slug)
          );
          return found || null;
        }
      }
      throw error;
    }
    
    if (data && data.length > 0) {
      const found = data[0];
      // Check if slug matches either published_slug or generated name slug
      if (found.published_slug === slug || generateSlug(found.name) === slug) {
        return {
          ...found.data,
          id: found.id,
          name: found.name,
          publishedSlug: found.published_slug,
          lastUpdated: new Date(found.last_updated).toLocaleString(),
          status: found.status
        };
      }
    }
  } catch (e) {
    console.error("Failed to load project by slug:", e);
    // Fallback to localStorage on error
    const stored = loadProjectsFromLocalStorage();
    if (stored) {
      return stored.find(p => 
        generateSlug(p.name) === slug || 
        ((p as any).publishedSlug && (p as any).publishedSlug === slug)
      ) || null;
    }
  }
  return null;
};

// Check if a project name already exists (for duplicate prevention)
export const checkProjectNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  if (!supabase) {
    // Check localStorage using storage manager
    const stored = loadProjectsFromLocalStorage();
    if (stored) {
      return stored.some(p => 
        (p.name.toLowerCase() === name.toLowerCase() || 
         generateSlug(p.name) === slug) && 
        p.id !== excludeId
      );
    }
    // Check mock projects
    return MOCK_PROJECTS.some(p => 
      p.name.toLowerCase() === name.toLowerCase() && 
      p.id !== excludeId
    );
  }

  try {
    // Check Supabase - compare both name and slug
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, published_slug')
      .or(`name.ilike.${name},published_slug.eq.${slug}`)
      .neq('id', excludeId || '')
      .limit(1);

    if (error) {
      console.warn('Error checking project name:', error);
      return false;
    }

    return !!data && data.length > 0;
  } catch (e) {
    console.warn('Error checking project name:', e);
    return false;
  }
};

// Offline queue for pending saves
let pendingSaves: Project[] = [];
let isSyncing = false;

export const getPendingSavesCount = (): number => pendingSaves.length;

export const queueProjectForSync = (projects: Project[]): void => {
  pendingSaves = projects;
  // Fire and forget - process async but don't block
  processPendingSaves().catch(err => {
    console.error('Background sync failed:', err);
  });
};

const processPendingSaves = async (): Promise<void> => {
  if (isSyncing || pendingSaves.length === 0 || connectionStatus !== 'connected') {
    return;
  }
  
  isSyncing = true;
  const projectsToSave = [...pendingSaves];
  pendingSaves = [];
  
  try {
    await saveProjectsToSupabase(projectsToSave);
  } catch (e) {
    console.error('Failed to sync pending saves:', e);
    // Re-queue failed saves
    pendingSaves = [...projectsToSave, ...pendingSaves];
  } finally {
    isSyncing = false;
  }
};

const saveProjectsToSupabase = async (projects: Project[]): Promise<boolean> => {
  if (!supabase) {
    console.warn("[Storage] Supabase not configured - using IndexedDB primary storage");
    // Save to IndexedDB with fallback to localStorage
    if (isIndexedDBSupported()) {
      const success = await saveProjectsToIndexedDB(projects);
      if (success) return true;
    }
    // Final fallback to localStorage
    const localSuccess = saveProjectsToLocalStorage(projects);
    return localSuccess;
  }

  const payload = projects.map(p => ({
    id: p.id,
    name: p.name,
    published_slug: (p as any).publishedSlug || null,
    last_updated: new Date().toISOString(),
    status: p.status,
    data: p
  }));

  try {
    const { error } = await supabase
      .from('projects')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
    
    // Also save to IndexedDB for offline access
    if (isIndexedDBSupported()) {
      await saveProjectsToIndexedDB(projects);
    }
    
    return true;
  } catch (e) {
    console.error("Failed to save to Supabase", e);
    throw e;
  }
};

// Main save function - uses offline queue when disconnected
export const saveProjects = async (projects: Project[]): Promise<boolean> => {
  // If connected, try to save directly
  if (connectionStatus === 'connected') {
    try {
      return await saveProjectsToSupabase(projects);
    } catch (e) {
      console.error('Direct save failed, queueing for later:', e);
      // Fall through to queue
    }
  }
  
  // If not connected, queue for later
  if (connectionStatus === 'disconnected') {
    console.warn('Offline: Queuing project for sync when connection is restored');
    queueProjectForSync(projects);
    // Return true to indicate we'll handle it later
    return true;
  }
  
  // If checking, queue it
  queueProjectForSync(projects);
  return true;
};

export const deleteProjectFromStorage = async (projectId: string): Promise<boolean> => {
  // Always try to delete from IndexedDB first (primary local storage)
  let localDeleted = false;
  
  if (isIndexedDBSupported()) {
    try {
      localDeleted = await deleteProjectFromIndexedDB(projectId);
    } catch (e) {
      console.warn('[Storage] IndexedDB delete failed:', e);
      // Fallback to localStorage
      localDeleted = deleteProjectFromLocalStorage(projectId);
    }
  } else {
    localDeleted = deleteProjectFromLocalStorage(projectId);
  }
  
  if (!supabase) {
    console.warn("[Storage] Supabase not configured - local only");
    return localDeleted;
  }

  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    return true; // Cloud deletion succeeded
  } catch (e) {
    console.error("Failed to delete project from cloud", e);
    return localDeleted; // Fall back to local result
  }
};

export const checkCloudConnection = async (): Promise<boolean> => {
  if (!supabase) {
    console.warn("[Storage] Supabase client not initialized.");
    setConnectionStatus('disconnected');
    return false;
  }
  try {
    setConnectionStatus('checking');
    const { error } = await supabase.from('projects').select('id').limit(1);
    if (error) {
      console.error("[Storage] Connection check failed:", error.message);
      setConnectionStatus('disconnected');
      return false;
    }
    setConnectionStatus('connected');
    // Try to sync any pending saves when connection is restored
    processPendingSaves();
    return true;
  } catch (e) {
    console.error("[Storage] Connection check exception:", e);
    setConnectionStatus('disconnected');
    return false;
  }
};

// File utilities
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const uploadFileToStorage = async (file: File): Promise<string> => {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  // Determine content type based on file extension
  const contentType = getContentType(fileExt);

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
  return data.publicUrl;
};

// Storage type for UI display
export type StorageType = 'indexeddb' | 'localstorage' | 'supabase';

// Get current storage type
export const getCurrentStorageType = (): StorageType => {
  if (supabase) return 'supabase';
  if (isIndexedDBSupported()) return 'indexeddb';
  return 'localstorage';
};

// Migrate from localStorage to IndexedDB
export const migrateLocalStorageToIndexedDB = async (): Promise<{ migrated: number; failed: number }> => {
  if (!isIndexedDBSupported()) {
    console.warn('[Storage] IndexedDB not supported, cannot migrate');
    return { migrated: 0, failed: 0 };
  }
  
  return await migrateFromLocalStorage();
};

// Get storage statistics
export const getStorageStats = async (): Promise<{
  type: StorageType;
  projectCount: number;
  estimatedSizeKB: number;
  idbStats?: { projectCount: number; estimatedSizeKB: number };
}> => {
  const type = getCurrentStorageType();
  
  if (type === 'indexeddb') {
    const idbStats = await getIndexedDBStats();
    return {
      type,
      ...idbStats
    };
  }
  
  // Fallback to localStorage stats
  const localStats = getLocalStorageStats();
  return {
    type: 'localstorage',
    projectCount: localStats.projectCount,
    estimatedSizeKB: localStats.estimatedSizeKB
  };
};
