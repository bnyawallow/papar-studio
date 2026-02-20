
"use client";

import React from 'react';
import { Project, Template } from '../../types';
import { XMarkIcon, CloneIcon } from '../icons/Icons';
import { clsx } from 'clsx';

interface NewProjectModalProps {
  templates: Template[];
  onClose: () => void;
  onCreate: (template: Project) => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ templates, onClose, onCreate }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background-secondary border border-border-default rounded-lg shadow-elevation3 w-full max-w-4xl p-6 animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-h3 text-text-primary font-semibold">Create New Project</h3>
            <p className="text-sm text-text-secondary mt-1">Start from a blank project or choose a template</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-background-hover rounded-md transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map((template, index) => (
            <div 
              key={template.id} 
              className={clsx(
                'group border border-border-default rounded-lg p-3 flex flex-col',
                'bg-background-tertiary hover:border-accent-primary hover:shadow-elevation2',
                'transition-all duration-200 cursor-pointer'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onCreate(template.project)}
            >
              {/* Thumbnail */}
              <div className="relative h-28 rounded-md overflow-hidden mb-3">
                <img 
                  src={template.imageUrl} 
                  alt={template.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              
              {/* Info */}
              <h4 className="text-sm font-medium text-text-primary mb-1">{template.name}</h4>
              <p className="text-xs text-text-tertiary mb-3 h-8 line-clamp-2">{template.description}</p>
              
              {/* Action Button */}
              <button
                className={clsx(
                  'mt-auto w-full px-3 py-2 text-sm font-medium rounded-md',
                  'flex items-center justify-center gap-2',
                  'bg-accent-primary text-white',
                  'hover:bg-accent-primary/90 transition-colors'
                )}
              >
                <CloneIcon className="w-4 h-4" />
                <span>{template.name === 'Blank Project' ? 'Create' : 'Clone'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
