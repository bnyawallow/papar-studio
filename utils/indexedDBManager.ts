/**
 * IndexedDB Manager Utility
 * Handles local storage operations using IndexedDB for improved capacity and individual file storage
 * Replaces localStorage with a more robust solution
 */

import { Project } from '../types';
import { exportProjectToJSON as exportToJsonFunc, importProjectFromJSON as importFromJsonFunc } from './fileExportImport';

const DB_NAME = 'papar_studio';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

// Connection caching for performance - with proper state management
let cachedDB: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;
let isConnectionValid: boolean = true;

/**
 * Check if the cached database connection is valid and ready
 */
const isDBConnectionValid = (): boolean => {
  if (!cachedDB || !isConnectionValid) return false;
  
  try {
    // Verify the connection is still usable by checking its state
    // If we can create a transaction, it's still valid
    const testTransaction = cachedDB.transaction(PROJECTS_STORE, 'readonly');
    testTransaction.abort(); // We don't actually need it
    return true;
  } catch (e) {
    console.warn('[IndexedDB] Cached connection invalid:', e);
    return false;
  }
};

/**
 * Invalidate the cached connection (call on errors or context lost)
 */
const invalidateCache = (): void => {
  isConnectionValid = false;
  if (cachedDB) {
    try {
      cachedDB.close();
    } catch (e) {
      // Ignore close errors
    }
  }
  cachedDB = null;
  dbOpenPromise = null;
};

/**
 * Open and initialize the IndexedDB database
 * Uses connection caching for better performance with proper state validation
 */
const openDB = (): Promise<IDBDatabase> => {
  // Check if cached connection is valid
  if (cachedDB && isDBConnectionValid()) {
    return Promise.resolve(cachedDB);
  }
  
  // Invalidate stale cache
  invalidateCache();
  
  // Prevent multiple concurrent open requests
  if (dbOpenPromise) {
    return dbOpenPromise;
  }
  
  dbOpenPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      dbOpenPromise = null;
      isConnectionValid = false;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      
      // Set up event handlers to detect connection issues
      db.onclose = () => {
        console.log('[IndexedDB] Database connection closed');
        invalidateCache();
      };
      
      db.onerror = (event) => {
        console.error('[IndexedDB] Database error:', event);
      };
      
      cachedDB = db;
      isConnectionValid = true;
      dbOpenPromise = null;
      console.log('[IndexedDB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create projects store if it doesn't exist
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        // Create indexes for common queries
        projectStore.createIndex('name', 'name', { unique: false });
        projectStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        projectStore.createIndex('status', 'status', { unique: false });
        console.log('[IndexedDB] Projects store created with indexes');
      }
    };
  });
  
  return dbOpenPromise;
};

/**
 * Save a single project to IndexedDB
 */
export const saveProjectToIndexedDB = async (project: Project): Promise<boolean> => {
  try {
    const db = await openDB();
    
    // Check connection state before operation
    if (!db || !isConnectionValid) {
      console.warn('[IndexedDB] Database connection invalid, invalidating cache and retrying');
      invalidateCache();
      return saveProjectToIndexedDB(project); // Retry with fresh connection
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      
      // Add timestamp for sorting
      const projectWithTimestamp = {
        ...project,
        _savedAt: new Date().toISOString()
      };
      
      const request = store.put(projectWithTimestamp);
      
      request.onsuccess = () => {
        console.log(`[IndexedDB] Project saved: ${project.name} (${project.id})`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to save project:', request.error);
        reject(request.error);
      };
      
      // Don't close the connection - let it be reused
      transaction.oncomplete = () => {};
      transaction.onerror = () => {
        console.error('[IndexedDB] Transaction error:', transaction.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving project:', error);
    invalidateCache();
    return false;
  }
};

/**
 * Save multiple projects to IndexedDB
 */
export const saveProjectsToIndexedDB = async (projects: Project[]): Promise<boolean> => {
  if (!projects || projects.length === 0) {
    return true;
  }
  
  try {
    const db = await openDB();
    
    // Check connection state before operation
    if (!db || !isConnectionValid) {
      console.warn('[IndexedDB] Database connection invalid, invalidating cache and retrying');
      invalidateCache();
      return saveProjectsToIndexedDB(projects);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      
      // Use Promise.all to avoid race conditions
      const savePromises = projects.map(project => {
        return new Promise<boolean>((res) => {
          const projectWithTimestamp = {
            ...project,
            _savedAt: new Date().toISOString()
          };
          
          const request = store.put(projectWithTimestamp);
          
          request.onsuccess = () => res(true);
          request.onerror = () => {
            console.error(`[IndexedDB] Failed to save project ${project.id}:`, request.error);
            res(false);
          };
        });
      });
      
      Promise.all(savePromises).then(results => {
        const allSucceeded = results.every(r => r);
        console.log(`[IndexedDB] Saved ${projects.length} projects, ${results.filter(r => !r).length} failed`);
        resolve(allSucceeded);
      }).catch(reject);
      
      // Don't close the connection
      transaction.oncomplete = () => {};
      transaction.onerror = () => {
        console.error('[IndexedDB] Transaction error:', transaction.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error saving projects:', error);
    invalidateCache();
    return false;
  }
};

/**
 * Load all projects from IndexedDB
 */
export const loadProjectsFromIndexedDB = async (): Promise<Project[]> => {
  try {
    const db = await openDB();
    
    // Check connection state before operation
    if (!db || !isConnectionValid) {
      console.warn('[IndexedDB] Database connection invalid, invalidating cache and retrying');
      invalidateCache();
      return loadProjectsFromIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const index = store.index('lastUpdated');
      
      // Get all projects sorted by lastUpdated descending
      const request = index.getAll();
      
      request.onsuccess = () => {
        const projects = request.result;
        // Sort by lastUpdated descending (newest first)
        const sortedProjects = projects.sort((a: any, b: any) => {
          const dateA = new Date(a.lastUpdated || a._savedAt || 0).getTime();
          const dateB = new Date(b.lastUpdated || b._savedAt || 0).getTime();
          return dateB - dateA;
        });
        
        // Remove internal timestamp fields
        const cleanProjects = sortedProjects.map((p: any) => {
          const { _savedAt, ...project } = p;
          return project as Project;
        });
        
        console.log(`[IndexedDB] Loaded ${cleanProjects.length} projects`);
        resolve(cleanProjects);
      };
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to load projects:', request.error);
        reject(request.error);
      };
      
      // Don't close the connection
      transaction.oncomplete = () => {};
    });
  } catch (error) {
    console.error('[IndexedDB] Error loading projects:', error);
    invalidateCache();
    return [];
  }
};

/**
 * Load a single project by ID from IndexedDB
 */
export const getProjectByIdFromIndexedDB = async (id: string): Promise<Project | null> => {
  try {
    const db = await openDB();
    
    // Check connection state before operation
    if (!db || !isConnectionValid) {
      console.warn('[IndexedDB] Database connection invalid, invalidating cache and retrying');
      invalidateCache();
      return getProjectByIdFromIndexedDB(id);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        const project = request.result;
        if (project) {
          const { _savedAt, ...cleanProject } = project;
          resolve(cleanProject as Project);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to get project:', request.error);
        reject(request.error);
      };
      
      // Don't close the connection
      transaction.oncomplete = () => {};
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting project:', error);
    invalidateCache();
    return null;
  }
};

/**
 * Delete a project from IndexedDB
 */
export const deleteProjectFromIndexedDB = async (projectId: string): Promise<boolean> => {
  try {
    const db = await openDB();
    
    // Check connection state before operation
    if (!db || !isConnectionValid) {
      console.warn('[IndexedDB] Database connection invalid, invalidating cache and retrying');
      invalidateCache();
      return deleteProjectFromIndexedDB(projectId);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      
      const request = store.delete(projectId);
      
      request.onsuccess = () => {
        console.log(`[IndexedDB] Project deleted: ${projectId}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to delete project:', request.error);
        reject(request.error);
      };
      
      // Don't close the connection
      transaction.oncomplete = () => {};
    });
  } catch (error) {
    console.error('[IndexedDB] Error deleting project:', error);
    invalidateCache();
    return false;
  }
};

/**
 * Delete all projects from IndexedDB
 */
export const clearIndexedDB = async (): Promise<boolean> => {
  try {
    const db = await openDB();
    
    // Check connection state before operation
    if (!db || !isConnectionValid) {
      console.warn('[IndexedDB] Database connection invalid, invalidating cache and retrying');
      invalidateCache();
      return clearIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('[IndexedDB] All projects cleared');
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to clear projects:', request.error);
        reject(request.error);
      };
      
      // Don't close the connection
      transaction.oncomplete = () => {};
    });
  } catch (error) {
    console.error('[IndexedDB] Error clearing database:', error);
    invalidateCache();
    return false;
  }
};

/**
 * Get storage statistics from IndexedDB
 */
export const getIndexedDBStats = async (): Promise<{
  projectCount: number;
  estimatedSizeKB: number;
}> => {
  try {
    const db = await openDB();
    
    // Check connection state before operation
    if (!db || !isConnectionValid) {
      console.warn('[IndexedDB] Database connection invalid, invalidating cache and retrying');
      invalidateCache();
      return getIndexedDBStats();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        // Estimate size by getting all and measuring
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const projects = getAllRequest.result;
          const dataString = JSON.stringify(projects);
          const estimatedSizeKB = (dataString.length * 2) / 1024; // UTF-16 to KB
          
          resolve({
            projectCount: count,
            estimatedSizeKB: Math.round(estimatedSizeKB)
          });
        };
        
        getAllRequest.onerror = () => {
          resolve({
            projectCount: count,
            estimatedSizeKB: 0
          });
        };
      };
      
      countRequest.onerror = () => {
        resolve({ projectCount: 0, estimatedSizeKB: 0 });
      };
      
      // Don't close the connection
      transaction.oncomplete = () => {};
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting stats:', error);
    invalidateCache();
    return { projectCount: 0, estimatedSizeKB: 0 };
  }
};

/**
 * Export a project to JSON file (for backup)
 * Note: Delegates to fileExportImport for implementation
 */
export const exportProjectToJSON = (project: Project): string => {
  return exportToJsonFunc(project);
};

/**
 * Import a project from JSON file
 * Note: Delegates to fileExportImport for implementation
 */
export const importProjectFromJSON = (jsonString: string): Project | null => {
  return importFromJsonFunc(jsonString);
};

/**
 * Check if IndexedDB is supported
 */
export const isIndexedDBSupported = (): boolean => {
  return 'indexedDB' in window && window.indexedDB !== null;
};

/**
 * Migrate projects from localStorage to IndexedDB
 */
export const migrateFromLocalStorage = async (): Promise<{
  migrated: number;
  failed: number;
}> => {
  try {
    // Import the localStorage loader
    const { loadProjectsFromLocalStorage } = await import('./storageManager');
    
    const localProjects = loadProjectsFromLocalStorage();
    
    if (!localProjects || localProjects.length === 0) {
      console.log('[IndexedDB] No projects found in localStorage to migrate');
      return { migrated: 0, failed: 0 };
    }
    
    console.log(`[IndexedDB] Migrating ${localProjects.length} projects from localStorage...`);
    
    let migrated = 0;
    let failed = 0;
    
    for (const project of localProjects) {
      const success = await saveProjectToIndexedDB(project);
      if (success) {
        migrated++;
      } else {
        failed++;
      }
    }
    
    console.log(`[IndexedDB] Migration complete: ${migrated} succeeded, ${failed} failed`);
    
    return { migrated, failed };
  } catch (error) {
    console.error('[IndexedDB] Migration failed:', error);
    return { migrated: 0, failed: 1 };
  }
};
