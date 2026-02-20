
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Project, Target, Content, Asset, ContentType, SceneSettings } from '../../types';
import Header, { SaveStatus } from './Header';
import LeftPanel from './LeftPanel';
import ScenePanel from './ScenePanel';
import RightPanel from './RightPanel';
import AssetsModal from './AssetsModal';
import PreviewModal from './PreviewModal';
import PublishModal from './PublishModal';
import SettingsModal from './SettingsModal';
import HelpModal from './HelpModal';
import Toast, { ToastType } from '../ui/Toast';
import { useHistoryState } from '../../hooks/useHistoryState';
import { fileToBase64, uploadFileToStorage } from '../../utils/storage';
import { compileFiles } from '../../utils/compiler';
import { generateProjectJson, generateProjectZip } from '../../utils/exportUtils';
import { useDebounce } from '../../hooks/useDebounce';
import { equal } from '@wry/equality';

interface EditorProps {
  project: Project;
  onGoToDashboard: () => void;
  onUpdateProject: (project: Project) => void;
  onSaveProject: (project: Project) => Promise<boolean>;
}

const Editor: React.FC<EditorProps> = ({ 
    project: initialProject, 
    onGoToDashboard, 
    onUpdateProject, 
    onSaveProject 
}) => {
  // History State for Undo/Redo
  const [project, setProject, undo, redo, canUndo, canRedo] = useHistoryState<Project>(initialProject);
  
  // Auto-Save State
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const lastSavedProject = useRef<Project>(initialProject);
  const debouncedProject = useDebounce(project, 2000); // Auto-save after 2s of inactivity

  // Selection State
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  // UI State
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [sceneSettings, setSceneSettings] = useState<SceneSettings>({
      ambientLightIntensity: 0.8,
      directionalLightIntensity: 1.5,
      directionalLightPosition: [10, 10, 5],
      showGrid: true,
      showAxes: true
  });

  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Update parent when project changes (debounced or on certain actions ideally, but direct for now)
  // Note: onUpdateProject updates the state in Page.tsx, which might conflict with local history state if not handled carefully.
  // Ideally Page.tsx holds the list, and Editor manages the active project instance until saved.
  // However, for simplicity let's assume we sync occasionally or on save.

  const selectedTarget = project.targets.find(t => t.id === selectedTargetId);
  const selectedContent = selectedTarget?.contents.find(c => c.id === selectedContentId);

  // Detect changes for Auto-Save status
  useEffect(() => {
      if (!equal(project, lastSavedProject.current)) {
          setSaveStatus('unsaved');
      }
  }, [project]);

  const performSave = async () => {
      if (equal(project, lastSavedProject.current)) return;
      
      setSaveStatus('saving');
      try {
          const success = await onSaveProject(project);
          if (success) {
              lastSavedProject.current = project;
              setSaveStatus('saved');
          } else {
              setSaveStatus('error');
              showToast("Failed to auto-save project.", 'error');
          }
      } catch (e) {
          setSaveStatus('error');
          console.error(e);
      }
  };

  // Trigger Auto-Save
  useEffect(() => {
      if (saveStatus === 'unsaved') {
          performSave();
      }
  }, [debouncedProject]);

  const handleProjectNameChange = (name: string) => {
    setProject(prev => ({ ...prev, name }));
  };

  const handleAddTarget = useCallback(() => {
      // Open assets modal to select image for target
      setIsAssetsModalOpen(true);
  }, []);

  const handleAssetSelectedForTarget = async (asset: Asset) => {
      if (asset.type !== 'image') {
          showToast("Only images can be used as targets.", 'error');
          return;
      }

      const newTarget: Target = {
          id: `target_${Date.now()}`,
          name: asset.name,
          imageUrl: asset.url,
          contents: [],
          visible: true
      };

      setProject(prev => ({
          ...prev,
          targets: [...prev.targets, newTarget]
      }));
      setSelectedTargetId(newTarget.id);
      setIsAssetsModalOpen(false);
  };

  const handleAddContent = useCallback((type: ContentType) => {
      if (!selectedTargetId) {
          showToast("Select a target first.", 'error');
          return;
      }

      const newContent: Content = {
          id: `content_${Date.now()}`,
          name: `New ${type}`,
          type: type,
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          visible: true
      };

      // Set default props based on type
      if (type === ContentType.TEXT) {
          newContent.textContent = "New Text";
          newContent.color = "#000000";
          newContent.size = 20;
      } else if (type === ContentType.IMAGE) {
          // Placeholder or open file dialog?
          // For now, let's just create it and let user set properties in RightPanel
          newContent.imageUrl = ""; // Empty initially
      }

      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(t => {
              if (t.id === selectedTargetId) {
                  return { ...t, contents: [...t.contents, newContent] };
              }
              return t;
          })
      }));
      setSelectedContentId(newContent.id);
  }, [selectedTargetId, setProject]);

  const handleContentUpdate = useCallback((updatedContent: Content) => {
      if (!selectedTargetId) return;
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(t => {
              if (t.id === selectedTargetId) {
                  return {
                      ...t,
                      contents: t.contents.map(c => c.id === updatedContent.id ? updatedContent : c)
                  };
              }
              return t;
          })
      }));
  }, [selectedTargetId, setProject]);

  const handleTargetUpdate = useCallback((updatedTarget: Target) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(t => t.id === updatedTarget.id ? updatedTarget : t)
      }));
  }, [setProject]);

  const handleDeleteTarget = useCallback((targetId: string) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.filter(t => t.id !== targetId)
      }));
      if (selectedTargetId === targetId) {
          setSelectedTargetId(null);
          setSelectedContentId(null);
      }
  }, [selectedTargetId, setProject]);

  const handleDeleteContent = useCallback((targetId: string, contentId: string) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(t => {
              if (t.id === targetId) {
                  return { ...t, contents: t.contents.filter(c => c.id !== contentId) };
              }
              return t;
          })
      }));
      if (selectedContentId === contentId) {
          setSelectedContentId(null);
      }
  }, [selectedContentId, setProject]);

  const handleDuplicateTarget = useCallback((targetId: string) => {
      const target = project.targets.find(t => t.id === targetId);
      if (target) {
          const newTarget = {
              ...target,
              id: `target_${Date.now()}`,
              name: `${target.name} (Copy)`,
              contents: target.contents.map(c => ({
                  ...c,
                  id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              }))
          };
          setProject(prev => ({
              ...prev,
              targets: [...prev.targets, newTarget]
          }));
      }
  }, [project.targets, setProject]);

  const handleDuplicateContent = useCallback((targetId: string, contentId: string) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(t => {
              if (t.id === targetId) {
                  const content = t.contents.find(c => c.id === contentId);
                  if (content) {
                      const newContent = {
                          ...content,
                          id: `content_${Date.now()}`,
                          name: `${content.name} (Copy)`
                      };
                      return { ...t, contents: [...t.contents, newContent] };
                  }
              }
              return t;
          })
      }));
  }, [setProject]);
  
  const handleRenameTarget = useCallback((targetId: string, name: string) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(t => t.id === targetId ? { ...t, name } : t)
      }));
  }, [setProject]);

  const handleRenameContent = useCallback((targetId: string, contentId: string, name: string) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(t => {
              if (t.id === targetId) {
                  return {
                      ...t,
                      contents: t.contents.map(c => c.id === contentId ? { ...c, name } : c)
                  };
              }
              return t;
          })
      }));
  }, [setProject]);

  // Resizing Logic
  const handleMouseDownLeft = (e: React.MouseEvent) => {
      setIsResizingLeft(true);
      e.preventDefault();
  };
  const handleMouseDownRight = (e: React.MouseEvent) => {
      setIsResizingRight(true);
      e.preventDefault();
  };
  
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizingLeft) {
              setLeftPanelWidth(Math.max(200, Math.min(400, e.clientX)));
          } else if (isResizingRight) {
              // Increased minimum width to 320px to prevent layout breakage
              setRightPanelWidth(Math.max(280, Math.min(480, window.innerWidth - e.clientX)));
          }
      };
      const handleMouseUp = () => {
          setIsResizingLeft(false);
          setIsResizingRight(false);
      };
      if (isResizingLeft || isResizingRight) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizingLeft, isResizingRight]);

  const handleManualSave = async () => {
      // Force immediate save
      await performSave();
      if (saveStatus === 'saved') showToast("Project saved successfully.", 'success');
  };

  const handleAddAsset = useCallback((asset: Asset) => {
      setProject(prev => ({
          ...prev,
          assets: [...(prev.assets || []), asset]
      }));
  }, [setProject]);
  
  // File upload for content directly from scene
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Handled in ScenePanel or via AssetsModal usually
      // If we want a hidden input for direct file loading
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background-primary">
      <Header 
        projectName={project.name}
        onProjectNameChange={handleProjectNameChange}
        onGoToDashboard={onGoToDashboard}
        onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onPublish={() => setIsPublishModalOpen(true)}
        onHelp={() => setIsHelpModalOpen(true)}
        onPreview={() => setIsPreviewModalOpen(true)}
        onSave={handleManualSave}
        saveStatus={saveStatus}
        onSettings={() => setIsSettingsModalOpen(true)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
            isOpen={isLeftPanelOpen}
            width={leftPanelWidth}
            isResizing={isResizingLeft}
            onResizeStart={handleMouseDownLeft}
            targets={project.targets}
            selectedTargetId={selectedTargetId}
            selectedContentId={selectedContentId}
            onSelect={(tId, cId) => { setSelectedTargetId(tId); setSelectedContentId(cId || null); }}
            projectSize={`${(project.sizeMB || 0).toFixed(1)} MB`}
            onAddTarget={handleAddTarget}
            onDeleteTarget={handleDeleteTarget}
            onDuplicateTarget={handleDuplicateTarget}
            onRenameTarget={handleRenameTarget}
            onTargetUpdate={handleTargetUpdate}
            onAddContent={handleAddContent}
            onDeleteContent={handleDeleteContent}
            onDuplicateContent={handleDuplicateContent}
            onRenameContent={handleRenameContent}
            onContentUpdate={handleContentUpdate}
        />
        
        <ScenePanel
            target={selectedTarget}
            selectedContent={selectedContent}
            onContentUpdate={handleContentUpdate}
            onContentAdd={(content) => {
                // Handle content dropped onto scene
                if (!selectedTargetId) {
                     showToast("Please select a target first.", 'error');
                     return;
                }
                setProject(prev => ({
                    ...prev,
                    targets: prev.targets.map(t => {
                        if (t.id === selectedTargetId) {
                            return { ...t, contents: [...t.contents, content] };
                        }
                        return t;
                    })
                }));
            }}
            onSelect={(tId, cId) => { setSelectedTargetId(tId); setSelectedContentId(cId || null); }}
            onDeleteContent={handleDeleteContent}
            assets={project.assets}
            onAddAsset={handleAddAsset}
            sceneSettings={sceneSettings}
        />
        
        <RightPanel
            width={rightPanelWidth}
            isResizing={isResizingRight}
            onResizeStart={handleMouseDownRight}
            selectedContent={selectedContent}
            selectedTarget={selectedTarget}
            onContentUpdate={handleContentUpdate}
            onTargetUpdate={handleTargetUpdate}
            onNotify={showToast}
            assets={project.assets}
            onAddAsset={handleAddAsset}
            sceneSettings={sceneSettings}
            onSceneSettingsChange={setSceneSettings}
        />
      </div>

      <AssetsModal
        isOpen={isAssetsModalOpen}
        onClose={() => setIsAssetsModalOpen(false)}
        onAddTarget={handleAssetSelectedForTarget}
        assets={project.assets || []}
        onAddAsset={handleAddAsset}
      />

      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        target={selectedTarget}
      />
      
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        project={project}
        onUpdateProject={setProject} // Save mind file url back to project
        onNotify={showToast}
      />
      
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={project.mindARConfig || {
            maxTrack: 1,
            warmupTolerance: 5,
            missTolerance: 5,
            filterMinCF: 0.0001,
            filterBeta: 0.001
        }}
        onUpdate={(config) => setProject(prev => ({ ...prev, mindARConfig: config }))}
      />
      
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={closeToast} 
      />
      <input id="editor-file-upload" type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
    </div>
  );
};

export default Editor;
