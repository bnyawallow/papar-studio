
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
        lastUpdated: new Date(data.last_updated).toLocaleString(),
        status: data.status
      };
    }
  } catch (e) {
    console.error("Failed to load project:", e);
  }
  return null;
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
