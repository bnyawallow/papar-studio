
"use client";

import React, { useState } from 'react';
import { Project, Template } from '../../types';
import NewProjectModal from './NewProjectModal';
import ProjectList from './ProjectList';
import ConfirmationModal from '../editor/ConfirmationModal';

interface DashboardProps {
  projects: Project[];
  templates: Template[];
  onCreateProject: (template: Project) => void;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  isConnected: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    projects, 
    templates, 
    onCreateProject, 
    onOpenProject, 
    onDeleteProject,
    isConnected 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleDeleteClick = (projectId: string) => {
      setProjectToDelete(projectId);
  };

  const confirmDelete = () => {
      if (projectToDelete) {
          onDeleteProject(projectToDelete);
          setProjectToDelete(null);
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 text-center sm:text-left">PapAR Studio</h1>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase flex items-center gap-1 ${isConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                {isConnected ? 'Cloud Connected' : 'Local Mode'}
            </div>
          </div>
          <div className="text-sm font-bold text-purple-600 text-center sm:text-right flex items-center gap-2 justify-center sm:justify-end bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            <span>👑</span> Unlimited Account
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isConnected ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md relative mb-6 flex items-start gap-3 shadow-sm" role="alert">
            <span className="text-xl">☁️</span>
            <div>
                <strong className="font-semibold block mb-1">Server Sync Active</strong>
                <span className="block sm:inline text-sm">Projects are saved securely to your Supabase database. You can access your projects from any device connected to this database.</span>
            </div>
            </div>
        ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md relative mb-6 flex items-start gap-3 shadow-sm" role="alert">
            <span className="text-xl">💾</span>
            <div>
                <strong className="font-semibold block mb-1">Local Mode Active</strong>
                <span className="block sm:inline text-sm">Database connection not configured. Projects are currently being mocked or not saved to cloud. Configure Supabase in <code>.env.local</code> to enable sync.</span>
            </div>
            </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold">Projects</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto shadow-sm"
            >
              Create Project...
            </button>
          </div>
          <ProjectList 
            projects={projects} 
            onOpenProject={onOpenProject} 
            onDeleteProject={handleDeleteClick}
          />
        </div>
      </main>

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
