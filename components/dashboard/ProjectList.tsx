
"use client";

import React from 'react';
import { Project } from '../../types';
import { TrashIcon, PencilIcon, EyeIcon, DuplicateIcon, MoreVertical } from '../icons/Icons';
import { clsx } from 'clsx';

interface ProjectListProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  isLoading?: boolean;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onOpenProject, onDeleteProject, isLoading = false }) => {
  if (isLoading) {
      return (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-background-tertiary rounded-lg overflow-hidden border border-border-default">
                  <div className="h-40 bg-background-hover"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-background-hover rounded w-3/4"></div>
                    <div className="h-3 bg-background-hover rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
  }

  if (projects.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4-tertiary flex items-center justify-center">
          <svg className="w-8 h-8 text-text-ter rounded-full bg-backgroundtiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">No projects yet</h3>
        <p className="text-sm text-text-secondary">Create your first project to get started with PapAR Studio.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((project, index) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onOpen={onOpenProject}
            onDelete={onDeleteProject}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

interface ProjectCardProps {
  project: Project;
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  index: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete, index }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div 
      className={clsx(
        'group bg-background-tertiary rounded-lg overflow-hidden border transition-all duration-200',
        'hover:-translate-y-1 hover:shadow-elevation2 cursor-pointer',
        isHovered ? 'border-accent-primary' : 'border-border-default'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
      onClick={() => onOpen(project.id)}
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-background-hover overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-12 h-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </div>
        
        {/* Hover overlay */}
        <div className={clsx(
          'absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity duration-200',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}>
          <button 
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(project.id);
            }}
          >
            <EyeIcon className="w-5 h-5 text-white" />
          </button>
          <button 
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(project.id);
            }}
          >
            <PencilIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={clsx(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            project.status === 'Published' 
              ? 'bg-accent-success/20 text-accent-success border border-accent-success/20'
              : 'bg-accent-tertiary/20 text-accent-tertiary border border-accent-tertiary/20'
          )}>
            {project.status}
          </span>
        </div>

        {/* More menu button */}
        <div className="absolute top-2 right-2">
          <button 
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              isHovered ? 'bg-black/40 text-white' : 'bg-black/0 text-transparent'
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 w-36 bg-background-secondary border border-border-default rounded-md shadow-elevation2 overflow-hidden z-10">
              <button 
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-hover flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(project.id);
                }}
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
              <button 
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-hover flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  // Duplicate functionality would go here
                }}
              >
                <DuplicateIcon className="w-4 h-4" />
                Duplicate
              </button>
              <div className="border-t border-border-subtle" />
              <button 
                className="w-full px-3 py-2 text-left text-sm text-accent-danger hover:bg-accent-danger/10 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-text-primary truncate mb-1">
          {project.name}
        </h3>
        <p className="text-xs text-text-tertiary">
          Updated {project.lastUpdated}
        </p>
      </div>
    </div>
  );
};

export default ProjectList;
