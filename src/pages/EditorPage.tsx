import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import EditorComponent from '../../components/editor/Editor';
import { Project } from '../types';
import { loadProjects, getProjectById, saveProjects } from '../services/projectService';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if project was passed via navigation state
    const stateProject = location.state?.project as Project | undefined;
    
    if (stateProject && stateProject.id === id) {
      setProject(stateProject);
      setIsLoading(false);
    } else if (id) {
      // Load from storage
      getProjectById(id).then(loaded => {
        setProject(loaded);
        setIsLoading(false);
      }).catch(err => {
        console.error("Failed to load project:", err);
        setIsLoading(false);
      });
    }
  }, [id, location.state]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleUpdateProject = useCallback((updatedProject: Project) => {
    setProject(updatedProject);
  }, []);

  const handleSaveProject = useCallback(async (proj: Project): Promise<boolean> => {
    // Get all projects from storage and merge with current project
    const allProjects = await loadProjects();
    const updatedProjects = allProjects.map(p => p.id === proj.id ? proj : p);
    
    const success = await saveProjects(updatedProjects);
    if (success) {
      setProject(proj);
    }
    return success;
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background-primary flex-col gap-4">
        <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-text-secondary font-semibold text-sm tracking-widest uppercase animate-pulse">Loading Project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background-primary flex-col gap-4">
        <div className="text-text-secondary font-semibold text-lg">Project not found</div>
        <button 
          onClick={handleGoToDashboard}
          className="px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <EditorComponent 
      project={project} 
      onGoToDashboard={handleGoToDashboard} 
      onUpdateProject={handleUpdateProject} 
      onSaveProject={handleSaveProject}
    />
  );
};

export default EditorPage;
