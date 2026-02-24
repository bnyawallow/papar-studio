
import { Project } from '../types';
import { supabase } from '../src/services/supabase';
import { MOCK_PROJECTS } from '../data/mockData';

export const loadProjects = async (): Promise<Project[]> => {
  if (!supabase) {
    console.warn("Supabase not connected. Using local mocks.");
    // Return mocks to ensure the app is usable without backend
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
      // Map the DB structure back to our Typescript interfaces
      // We store the heavy lifting in the 'data' jsonb column
      return data.map((row: any) => ({
        ...row.data,
        id: row.id, // Ensure top level ID matches
        name: row.name,
        lastUpdated: new Date(row.last_updated).toLocaleString(),
        status: row.status
      }));
    }
  } catch (e) {
    console.warn("Failed to load from Supabase (returning empty list):", e);
  }
  
  // Return empty array if connected but no projects found (and no error thrown)
  return []; 
};

export const getProjectById = async (id: string): Promise<Project | null> => {
    if (!supabase) {
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
}

export const saveProjects = async (projects: Project[]): Promise<boolean> => {
  if (!supabase) return true; // Local mode always succeeds in memory (for UI purposes)

  // We only save the active project usually, but this function signature expects the whole list.
  // In a real cloud app, we usually save one project at a time. 
  // For compatibility with existing architecture, we will upsert all of them.
  
  const payload = projects.map(p => ({
    id: p.id,
    name: p.name,
    last_updated: new Date().toISOString(),
    status: p.status,
    data: p // Store the full JSON object in the data column
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
    if (!supabase) return true; // Local mode always succeeds
    try {
        const { error } = await supabase.from('projects').delete().eq('id', projectId);
        if(error) throw error;
        return true;
    } catch(e) {
        console.error("Failed to delete project", e);
        return false;
    }
}

// Convert file to base64 (kept for legacy or small files if needed)
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// New: Upload to Supabase Storage
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
}

export const checkCloudConnection = async (): Promise<boolean> => {
    if (!supabase) {
        console.warn("[Storage] Supabase client not initialized.");
        return false;
    }
    try {
        // Simple lightweight query to check connection/auth
        const { error } = await supabase.from('projects').select('id').limit(1);
        if (error) {
            console.error("[Storage] Connection check failed:", error.message);
            if (error.code === '42P01') {
                console.error("HINT: The 'projects' table might not exist in your database.");
            }
            return false;
        }
        return true;
    } catch (e) {
        console.error("[Storage] Connection check exception:", e);
        return false;
    }
}
