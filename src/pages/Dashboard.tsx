import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardComponent from '../../components/dashboard/Dashboard';
import { Project } from '../types';
import { MOCK_TEMPLATES } from '../data/mockData';
import { loadProjects, saveProjects, checkCloudConnection, deleteProjectFromStorage } from '../services/projectService';
import Toast, { ToastType } from '../../components/ui/Toast';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [areProjectsLoading, setAreProjectsLoading] = useState(true);
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
    // Navigate to editor
    navigate(`/editor/${newProject.id}`, { state: { project: newProject } });
  }, [projects, navigate]);

  const handleOpenProject = useCallback((projectId: string) => {
    const projectToOpen = projects.find(p => p.id === projectId);
    if (projectToOpen) {
      navigate(`/editor/${projectId}`, { state: { project: projectToOpen } });
    }
  }, [projects, navigate]);

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
  }, [projects, showToast]);

  if (!isMounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background-primary flex-col gap-4">
        <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-text-secondary font-semibold text-sm tracking-widest uppercase animate-pulse">Initializing Studio...</div>
      </div>
    );
  }

  return (
    <>
      <DashboardComponent
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

export default Dashboard;
