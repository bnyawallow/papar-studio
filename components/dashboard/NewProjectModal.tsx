"use client";

import React from 'react';
import { Project, Template } from '../../types';
import { XMarkIcon, CloneIcon } from '../icons/Icons';

interface NewProjectModalProps {
  templates: Template[];
  onClose: () => void;
  onCreate: (template: Project) => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ templates, onClose, onCreate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Create a blank project or start from a template</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map(template => (
            <div key={template.id} className="border rounded-md p-4 flex flex-col justify-between items-start hover:shadow-lg transition-shadow">
              <img src={template.imageUrl} alt={template.name} className="w-full h-24 object-cover rounded-md mb-2" />
              <h4 className="font-bold">{template.name}</h4>
              <p className="text-xs text-gray-500 mb-2 h-10">{template.description}</p>
              <button
                onClick={() => onCreate(template.project)}
                className="w-full mt-auto px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 flex items-center justify-center gap-2"
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
