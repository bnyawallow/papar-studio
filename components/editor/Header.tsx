
"use client";

import React, { useState } from 'react';
import { ChevronLeftIcon, PencilIcon, EyeIcon, PanelLeftIcon, UndoIcon, RedoIcon, SettingsIcon } from '../icons/Icons';

interface HeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onGoToDashboard: () => void;
  onToggleLeftPanel: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isLeftPanelOpen?: boolean;
  onPublish?: () => void;
  onHelp?: () => void;
  onPreview?: () => void;
  onSave?: () => void;
  onSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  projectName, 
  onProjectNameChange, 
  onGoToDashboard, 
  onToggleLeftPanel, 
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isLeftPanelOpen = true,
  onPublish,
  onHelp,
  onPreview,
  onSave,
  onSettings
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(projectName);

  const handleNameSave = () => {
    onProjectNameChange(name);
    setIsEditingName(false);
  };

  return (
    <header className="bg-white shadow-md h-12 flex items-center justify-between px-2 sm:px-4 flex-shrink-0 z-50 relative">
      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
        <button 
            onClick={onToggleLeftPanel} 
            className={`p-2 rounded-md hover:bg-gray-100 ${isLeftPanelOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
            aria-label="Toggle left panel"
        >
          <PanelLeftIcon className="w-5 h-5" />
        </button>
        <button onClick={onGoToDashboard} className="flex items-center text-blue-600 hover:text-blue-800 flex-shrink-0">
          <ChevronLeftIcon className="w-5 h-5" />
          <span className="font-semibold hidden sm:block">Projects</span>
        </button>
        <span className="text-gray-300">/</span>
        {isEditingName ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
            className="px-2 py-1 border rounded-md"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-gray-800 truncate">{projectName}</h1>
            <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-gray-800 flex-shrink-0" aria-label="Edit project name">
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-4 flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-md hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
          aria-label="Undo"
          title="Undo"
        >
          <UndoIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-md hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
          aria-label="Redo"
          title="Redo"
        >
          <RedoIcon className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
        <button 
            onClick={onSettings}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            title="Project Settings"
        >
            <SettingsIcon className="w-5 h-5" />
        </button>
        <button 
            onClick={onHelp}
            className="text-sm font-medium text-gray-600 hover:text-black hidden md:block"
        >
            Help
        </button>
        <button 
            onClick={onSave}
            className="text-sm font-medium px-2 sm:px-4 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 active:bg-gray-200"
        >
            Save
        </button>
        <button 
            onClick={onPublish}
            className="text-sm font-medium px-2 sm:px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
            Publish...
        </button>
        <button 
            onClick={onPreview}
            className="p-2 bg-gray-700 text-white rounded-full hover:bg-black" 
            aria-label="Preview"
            title="Preview Mode"
        >
          <EyeIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
