
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from '../components/dashboard/Dashboard';
import Editor from '../components/editor/Editor';
import { Project } from '../types';
import { MOCK_TEMPLATES } from '../data/mockData';
import { loadProjects, saveProjects, checkCloudConnection, deleteProjectFromStorage } from '../utils/storage';
import Toast, { ToastType } from '../components/ui/Toast';

export type View = 'dashboard' | 'editor';

const Page: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [areProjectsLoading, setAreProjectsLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  useEffect(() => {
    setIsMounted(true);
    
    // Check connection
    checkCloudConnection().then(status => setIsConnected(status));

    setAreProjectsLoading(true);
    loadProjects().then(loaded => {
        setProjects(loaded);
        setAreProjectsLoading(false);
    });
  }, []);

  const handleCreateProject = useCallback((template: Project) => {
    const newProject: Project = {
      ...template,
      id: `proj_${Date.now()}`,
      name: template.name === 'Blank Project' ? 'Untitled Project' : `${template.name} Clone`,
      lastUpdated: new Date().toLocaleString(),
      status: 'Draft',
    };
    const newProjects = [newProject, ...projects];
    setProjects(newProjects);
    saveProjects(newProjects);
    setActiveProject(newProject);
    setView('editor');
  }, [projects]);

  const handleOpenProject = useCallback((projectId: string) => {
    const projectToOpen = projects.find(p => p.id === projectId);
    if (projectToOpen) {
      setActiveProject(projectToOpen);
      setView('editor');
    }
  }, [projects]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    const previousProjects = projects;
    // Optimistic update
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);

    // Persist deletion
    const success = await deleteProjectFromStorage(projectId);
    
    if (success) {
        showToast("Project deleted successfully.", 'success');
    } else {
        // Rollback
        setProjects(previousProjects);
        showToast("Failed to delete project.", 'error');
    }
  }, [projects]);

  const handleGoToDashboard = useCallback(() => {
    setActiveProject(null);
    setView('dashboard');
    // Reload projects to ensure sync state
    setAreProjectsLoading(true);
    loadProjects().then(loaded => {
        setProjects(loaded);
        setAreProjectsLoading(false);
    });
  }, []);
  
  const handleUpdateProject = useCallback((updatedProject: Project) => {
    setActiveProject(updatedProject);
    setProjects(prevProjects => {
      const newProjects = prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p);
      // Auto-save logic can still fire-and-forget, or we can handle it silently
      saveProjects(newProjects); 
      return newProjects;
    });
  }, []);

  // Dedicated save handler that returns success/failure
  const handleSaveProject = useCallback(async (project: Project): Promise<boolean> => {
    setActiveProject(project);
    let updatedList: Project[] = [];
    
    // Synchronously update state to get the full list for saving
    setProjects(prevProjects => {
      updatedList = prevProjects.map(p => p.id === project.id ? project : p);
      return updatedList;
    });

    // If projects state was empty or sync failed (rare in this flow), try to construct it or fail
    if (updatedList.length === 0) {
        // Fallback: try to save just this project if we can't merge with list? 
        // For now, assume list merge worked.
        updatedList = [project]; 
    }

    return await saveProjects(updatedList);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background-primary flex-col gap-4">
        <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-text-secondary font-semibold text-sm tracking-widest uppercase animate-pulse">Initializing Studio...</div>
      </div>
    );
  }

  if (view === 'editor' && activeProject) {
    return (
      <Editor 
        project={activeProject} 
        onGoToDashboard={handleGoToDashboard} 
        onUpdateProject={handleUpdateProject} 
        onSaveProject={handleSaveProject}
      />
    );
  }

  return (
    <>
      <Dashboard
        projects={projects}
        templates={MOCK_TEMPLATES}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onDeleteProject={handleDeleteProject}
        isConnected={isConnected}
        isLoading={areProjectsLoading}
      />
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={closeToast} 
      />
    </>
  );
};

export default Page;
