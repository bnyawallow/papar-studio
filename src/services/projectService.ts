
import { Project } from '../types';
import { supabase } from './supabase';
import { MOCK_PROJECTS } from '../../data/mockData';

const STORAGE_KEY = 'papar_projects';

export const loadProjects = async (): Promise<Project[]> => {
  if (!supabase) {
    console.warn("Supabase not connected. Using local storage.");
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored projects", e);
      }
    }
    // Return mocks if no local data
    return MOCK_PROJECTS;
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Supabase load error:', error);
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
  if (!supabase) {
    // Try localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const projects: Project[] = JSON.parse(stored);
        return projects.find(p => p.id === id) || null;
      } catch (e) {
        console.error("Failed to parse stored projects", e);
      }
    }
    return MOCK_PROJECTS.find(p => p.id === id) || null;
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
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
    // Try localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const projects: Project[] = JSON.parse(stored);
        // Find project with matching slug (either generated from name or stored publishedSlug)
        const found = projects.find(p => 
          generateSlug(p.name) === slug || 
          ((p as any).publishedSlug && (p as any).publishedSlug === slug)
        );
        return found || null;
      } catch (e) {
        console.error("Failed to parse stored projects", e);
      }
    }
    // Check mock projects
    return MOCK_PROJECTS.find(p => generateSlug(p.name) === slug) || null;
  }

  try {
    // Query directly by published_slug for efficiency
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'Published')
      .or('published_slug.eq.' + slug + ',name.ilike.' + slug)
      .limit(1);

    if (error) throw error;
    
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
  }
  return null;
};

// Check if a project name already exists (for duplicate prevention)
export const checkProjectNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  if (!supabase) {
    // Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const projects: Project[] = JSON.parse(stored);
        return projects.some(p => 
          (p.name.toLowerCase() === name.toLowerCase() || 
           generateSlug(p.name) === slug) && 
          p.id !== excludeId
        );
      } catch (e) {
        console.error("Failed to parse stored projects", e);
      }
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

export const saveProjects = async (projects: Project[]): Promise<boolean> => {
  // Always save to localStorage first as backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
  }

  if (!supabase) {
    return true; // Local mode always succeeds
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
    return true;
  } catch (e) {
    console.error("Failed to save to Supabase", e);
    return false;
  }
};

export const deleteProjectFromStorage = async (projectId: string): Promise<boolean> => {
  // Remove from localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const projects: Project[] = JSON.parse(stored);
      const filtered = projects.filter(p => p.id !== projectId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn("Failed to delete from localStorage:", e);
  }

  if (!supabase) return true;

  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Failed to delete project", e);
    return false;
  }
};

export const checkCloudConnection = async (): Promise<boolean> => {
  if (!supabase) {
    console.warn("[Storage] Supabase client not initialized.");
    return false;
  }
  try {
    const { error } = await supabase.from('projects').select('id').limit(1);
    if (error) {
      console.error("[Storage] Connection check failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Storage] Connection check exception:", e);
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

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
  return data.publicUrl;
};
