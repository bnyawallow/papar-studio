
"use client";

import React, { useState } from 'react';
import { Project, Template } from '../../types';
import NewProjectModal from './NewProjectModal';
import ProjectList from './ProjectList';
import ConfirmationModal from '../editor/ConfirmationModal';
import Sidebar from '../ui/Sidebar';
import { Search, Plus, Cloud, CloudOff, Crown } from '../icons/Icons';

interface DashboardProps {
  projects: Project[];
  templates: Template[];
  onCreateProject: (template: Project) => void;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  isConnected: boolean;
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    projects, 
    templates, 
    onCreateProject, 
    onOpenProject, 
    onDeleteProject,
    isConnected,
    isLoading = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDeleteClick = (projectId: string) => {
      setProjectToDelete(projectId);
  };

  const confirmDelete = () => {
      if (projectToDelete) {
          onDeleteProject(projectToDelete);
          setProjectToDelete(null);
      }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background-primary flex">
      {/* Sidebar */}
      <Sidebar activeItem="dashboard" />

      {/* Main Content */}
      <main className="flex-1 ml-16 transition-all duration-300">
        {/* Header */}
        <header className="h-16 bg-background-secondary border-b border-border-default sticky top-0 z-10">
          <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
            {/* Page Title */}
            <div className="flex items-center gap-4">
              <h1 className="text-h3 text-text-primary font-semibold">Dashboard</h1>
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                isConnected 
                  ? 'bg-accent-success/10 text-accent-success border border-accent-success/20' 
                  : 'bg-accent-tertiary/10 text-accent-tertiary border border-accent-tertiary/20'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-accent-success animate-pulse' : 'bg-accent-tertiary'}`}></div>
                {isConnected ? 'Cloud Connected' : 'Local Mode'}
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 bg-background-tertiary border border-border-default rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all"
                />
              </div>

              {/* Account Badge */}
              <div className="flex items-center gap-2 bg-accent-primary/10 px-3 py-1.5 rounded-full border border-accent-primary/20">
                <Crown className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-medium text-accent-primary">Unlimited</span>
              </div>

              {/* Create Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors shadow-elevation1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Create Project</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Status Banner */}
          {isConnected ? (
            <div className="bg-accent-secondary/10 border border-accent-secondary/20 text-text-primary px-4 py-3 rounded-lg mb-6 flex items-start gap-3 shadow-elevation1">
              <Cloud className="w-5 h-5 text-accent-secondary flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5 text-sm">Server Sync Active</strong>
                <span className="text-sm text-text-secondary">Projects are saved securely to your Supabase database. You can access your projects from any device connected to this database.</span>
              </div>
            </div>
          ) : (
            <div className="bg-accent-tertiary/10 border border-accent-tertiary/20 text-text-primary px-4 py-3 rounded-lg mb-6 flex items-start gap-3 shadow-elevation1">
              <CloudOff className="w-5 h-5 text-accent-tertiary flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5 text-sm">Local Mode Active</strong>
                <span className="text-sm text-text-secondary">Database connection not configured. Projects are currently being mocked or not saved to cloud. Configure Supabase in <code className="text-xs bg-background-tertiary px-1 py-0.5 rounded">.env.local</code> to enable sync.</span>
              </div>
            </div>
          )}

          {/* Projects Section */}
          <div className="bg-background-secondary border border-border-default rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-h4 text-text-primary font-semibold">Your Projects</h2>
              <span className="text-sm text-text-secondary">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</span>
            </div>
            <ProjectList 
              projects={filteredProjects} 
              onOpenProject={onOpenProject} 
              onDeleteProject={handleDeleteClick}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      {isModalOpen && (
        <NewProjectModal
          templates={templates}
          onClose={() => setIsModalOpen(false)}
          onCreate={onCreateProject}
        />
      )}

      <ConfirmationModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Dashboard;
