
"use client";

import React, { useState } from 'react';
import { 
    ChevronLeftIcon, PencilIcon, EyeIcon, PanelLeftIcon, UndoIcon, RedoIcon, SettingsIcon,
    SaveIcon, CheckIcon, LoaderIcon, HelpCircle
} from '../icons/Icons';
import { clsx } from 'clsx';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

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
  saveStatus?: SaveStatus;
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
  saveStatus = 'saved',
  onSettings
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(projectName);

  const handleNameSave = () => {
    onProjectNameChange(name);
    setIsEditingName(false);
  };

  const getSaveButtonContent = () => {
    if (saveStatus === 'saving') return <LoaderIcon className="w-4 h-4 animate-spin" />;
    if (saveStatus === 'saved') return <CheckIcon className="w-4 h-4" />;
    return <SaveIcon className="w-4 h-4" />;
  };

  const getSaveButtonStyle = () => {
    const baseStyle = "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-sm font-medium";
    if (saveStatus === 'unsaved') return `${baseStyle} bg-accent-primary text-white hover:bg-accent-primary/90`;
    if (saveStatus === 'saving') return `${baseStyle} bg-background-hover text-text-secondary cursor-wait`;
    if (saveStatus === 'error') return `${baseStyle} bg-accent-danger text-white hover:bg-accent-danger/90`;
    // saved
    return `${baseStyle} bg-background-tertiary text-text-tertiary border border-border-default cursor-default`; 
  };

  return (
    <header className="bg-background-secondary border-b border-border-default h-14 flex items-center justify-between px-4 flex-shrink-0 z-50 relative">
      {/* Left Section */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button 
            onClick={onToggleLeftPanel} 
            className={clsx(
                "p-2 rounded-md transition-colors",
                isLeftPanelOpen 
                    ? 'bg-background-active text-accent-primary' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-hover'
            )}
            aria-label="Toggle left panel"
        >
          <PanelLeftIcon className="w-5 h-5" />
        </button>
        
        <button 
            onClick={onGoToDashboard} 
            className="flex items-center gap-1 text-text-secondary hover:text-accent-primary transition-colors flex-shrink-0"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          <span className="font-medium hidden sm:block">Projects</span>
        </button>
        
        <span className="text-text-tertiary">/</span>
        
        {isEditingName ? (
          <input
            id="header-project-name"
            name="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
            className="px-2 py-1 bg-background-tertiary border border-border-focus rounded-md text-text-primary text-sm outline-none"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-semibold text-text-primary truncate">{projectName}</h1>
            <button 
                onClick={() => setIsEditingName(true)} 
                className="text-text-tertiary hover:text-accent-primary transition-colors flex-shrink-0" 
                aria-label="Edit project name"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Center Section - Undo/Redo */}
      <div className="hidden md:flex-shrink-0 px-4 flex items-center gap-1 bg-background-tertiary rounded-lg p-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={clsx(
            "p-1.5 rounded-md transition-colors",
            canUndo 
                ? "text-text-secondary hover:text-text-primary hover:bg-background-hover" 
                : "text-text-tertiary cursor-not-allowed"
          )}
          aria-label="Undo"
          title="Undo"
        >
          <UndoIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border-default" />
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={clsx(
            "p-1.5 rounded-md transition-colors",
            canRedo 
                ? "text-text-secondary hover:text-text-primary hover:bg-background-hover" 
                : "text-text-tertiary cursor-not-allowed"
          )}
          aria-label="Redo"
          title="Redo"
        >
          <RedoIcon className="w-4 h-4" />
        </button>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <button 
            onClick={onSettings}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-background-hover rounded-md transition-colors"
            title="Project Settings"
        >
            <SettingsIcon className="w-5 h-5" />
        </button>
        <button 
            onClick={onHelp}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-background-hover rounded-md transition-colors hidden md:flex"
            title="Help"
        >
            <HelpCircle className="w-5 h-5" />
        </button>
        
        {/* Save Button */}
        <button 
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className={getSaveButtonStyle()}
            title={saveStatus === 'saved' ? "All changes saved" : saveStatus === 'error' ? "Error saving" : "Save changes"}
        >
            {getSaveButtonContent()}
            <span className="hidden sm:inline">
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
            </span>
        </button>
        
        <button 
            onClick={onPublish}
            className="text-sm font-medium px-4 py-1.5 bg-accent-secondary text-white rounded-md hover:bg-accent-secondary/90 transition-colors"
        >
            Publish
        </button>
        <button 
            onClick={onPreview}
            className="p-2 bg-background-tertiary text-text-primary border border-border-default rounded-md hover:bg-background-hover hover:border-accent-primary transition-colors" 
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
