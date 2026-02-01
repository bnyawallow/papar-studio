
"use client";

import React from 'react';
import { Project } from '../../types';
import { TrashIcon } from '../icons/Icons';

interface ProjectListProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onOpenProject, onDeleteProject }) => {
  return (
    <div>
      {/* Table for medium and larger screens */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Last Updated</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">#Views</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No projects found. Click "Create Project" to get started.
                    </td>
                </tr>
            ) : (
                projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline cursor-pointer" onClick={() => onOpenProject(project.id)}>
                    {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.lastUpdated}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {project.status}
                    </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                        }}
                        title="Delete Project"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards for small screens */}
      <div className="md:hidden space-y-4">
        {projects.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
                No projects found.
            </div>
        ) : (
            projects.map(project => (
            <div key={project.id} className="bg-gray-50 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                <div 
                    className="font-medium text-blue-600 hover:underline cursor-pointer break-all pr-2"
                    onClick={() => onOpenProject(project.id)}
                >
                    {project.name}
                </div>
                <button 
                    className="text-red-600 hover:text-red-900 flex-shrink-0 p-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                    }}
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
                </div>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p><strong className="font-medium text-gray-800">Last Updated:</strong> {project.lastUpdated}</p>
                <div className="flex items-center"><strong className="font-medium text-gray-800">Status:</strong>
                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {project.status}
                    </span>
                </div>
                <p><strong className="font-medium text-gray-800">#Views:</strong> -</p>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ProjectList;
