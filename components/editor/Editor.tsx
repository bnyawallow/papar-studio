
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Project, Target, Content, Asset, ContentType, MindARConfig, SceneSettings } from '../../types';
import Header from './Header';
import LeftPanel from './LeftPanel';
import ScenePanel from './ScenePanel';
import RightPanel from './RightPanel';
import AssetsModal from './AssetsModal';
import PublishModal from './PublishModal';
import HelpModal from './HelpModal';
import PreviewModal from './PreviewModal';
import SettingsModal from './SettingsModal';
import Toast, { ToastType } from '../ui/Toast';
import { useHistoryState } from '../../hooks/useHistoryState';
import { fileToBase64 } from '../../utils/storage';

interface EditorProps {
  project: Project;
  onGoToDashboard: () => void;
  onUpdateProject: (project: Project) => void;
  onSaveProject: (project: Project) => Promise<boolean>;
}

const getUniqueName = (baseName: string, existingNames: string[]): string => {
  if (!existingNames.includes(baseName)) return baseName;

  let name = baseName;
  let counter = 1;
  
  // Try to extract existing number if baseName ends with " 123"
  const match = baseName.match(/^(.*?) (\d+)$/);
  if (match) {
    name = match[1];
    counter = parseInt(match[2], 10) + 1;
  }

  while (existingNames.includes(`${name} ${counter}`)) {
    counter++;
  }
  return `${name} ${counter}`;
};

const DEFAULT_CONFIG: MindARConfig = {
    maxTrack: 1,
    warmupTolerance: 5,
    missTolerance: 5,
    filterMinCF: 0.0001,
    filterBeta: 0.001
};

const Editor: React.FC<EditorProps> = ({ project: initialProject, onGoToDashboard, onUpdateProject, onSaveProject }) => {
  const [project, setProject, undo, redo, canUndo, canRedo] = useHistoryState<Project>({
      ...initialProject,
      assets: initialProject.assets || [],
      mindARConfig: initialProject.mindARConfig || DEFAULT_CONFIG
  });
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(project.targets[0]?.id || null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  
  const [sceneSettings, setSceneSettings] = useState<SceneSettings>({
    ambientLightIntensity: 0.8,
    directionalLightIntensity: 1.5,
    directionalLightPosition: [10, 10, 5],
    showGrid: true,
    showAxes: true,
  });

  // Derived state for assets
  const assets = project.assets || [];

  const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);
  // Context state to know if we are adding a Target (top level) or Content (child)
  const [assetSelectionMode, setAssetSelectionMode] = useState<'target' | 'content'>('content');

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestedContentTypeRef = useRef<ContentType | null>(null);
  
  // This hook ensures implicit state sync, but we use onSaveProject for explicit manual saves
  useEffect(() => {
    onUpdateProject(project);
  }, [project, onUpdateProject]);

  const startResizeLeft = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingLeft(true);
  }, []);

  const startResizeRight = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingRight(true);
  }, []);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizingLeft) {
              const newWidth = Math.max(200, Math.min(e.clientX, 600));
              setLeftPanelWidth(newWidth);
          }
          if (isResizingRight) {
              const newWidth = Math.max(250, Math.min(window.innerWidth - e.clientX, 600));
              setRightPanelWidth(newWidth);
          }
      };

      const handleMouseUp = () => {
          setIsResizingLeft(false);
          setIsResizingRight(false);
      };

      if (isResizingLeft || isResizingRight) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
      } else {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
      }

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
      };
  }, [isResizingLeft, isResizingRight]);

  const handleProjectNameChange = useCallback((newName: string) => {
    setProject(prev => ({ ...prev, name: newName }));
  }, [setProject]);
  
  const handleSelectionChange = useCallback((targetId: string, contentId?: string) => {
      setSelectedTargetId(targetId);
      setSelectedContentId(contentId || null);
  }, []);

  const handleContentUpdate = useCallback((updatedContent: Content) => {
      if (!selectedTargetId) return;
      
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(target => {
              if (target.id === selectedTargetId) {
                  return {
                      ...target,
                      contents: target.contents.map(content => 
                          content.id === updatedContent.id ? updatedContent : content
                      )
                  };
              }
              return target;
          })
      }));
  }, [selectedTargetId, setProject]);

  const handleContentAdd = useCallback((newContent: Content) => {
    setProject(prev => {
        const targetId = selectedTargetId || prev.targets[0]?.id;
        if (!targetId) {
            return prev;
        }

        return {
            ...prev,
            targets: prev.targets.map(target => {
                if (target.id === targetId) {
                    return {
                        ...target,
                        contents: [...target.contents, newContent]
                    };
                }
                return target;
            })
        };
    });
    setSelectedContentId(newContent.id);
  }, [selectedTargetId, setProject]);
  
  const handleRequestContent = (type: ContentType) => {
    const target = project.targets.find(t => t.id === selectedTargetId) || project.targets[0];
    if (!target) {
        showToast("Please add and select an Image Target first.", 'error');
        return;
    }

    const existingNames = target.contents.map(c => c.name);

    if (type === ContentType.TEXT) {
      const name = getUniqueName('New Text', existingNames);
      const newContent: Content = {
        id: `content_${Date.now()}`,
        name,
        type: ContentType.TEXT,
        transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
        textContent: 'Text Goes Here',
        color: '#000000',
        outlineColor: '#000000', // Use black, control visibility via width=0
        outlineWidth: 0,
        size: 50,
        visible: true,
      };
      handleContentAdd(newContent);
      return;
    }

    if (type === ContentType.STREAMING_VIDEO) {
        const name = getUniqueName('Streaming Video', existingNames);
        const newContent: Content = {
            id: `content_${Date.now()}`,
            name,
            type: ContentType.STREAMING_VIDEO,
            streamingService: 'youtube', 
            transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            videoUrl: 'Y_plhk1FUQA', 
            autoplay: false,
            loop: false,
            muted: false,
            videoClickToggle: true,
            videoControls: true,
            videoFullScreen: true,
            visible: true,
        };
        handleContentAdd(newContent);
        return;
    }

    if (type === ContentType.IMAGE || type === ContentType.VIDEO || type === ContentType.MODEL || type === ContentType.AUDIO) {
        setAssetSelectionMode('content'); // Ensure we are in content mode
        setIsAssetsModalOpen(true);
        requestedContentTypeRef.current = type;
        const input = fileInputRef.current;
        if (!input) return;

        if (type === ContentType.IMAGE) input.accept = "image/*";
        else if (type === ContentType.VIDEO) input.accept = "video/*";
        else if (type === ContentType.AUDIO) input.accept = "audio/*";
        else if (type === ContentType.MODEL) input.accept = ".glb,.gltf";
        
        // Note: We open the modal first, but if user cancels modal and uses file picker, this ref handles the direct upload logic.
        // The modal is preferred.
    }
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = requestedContentTypeRef.current;
    if (!file || !type) return;

    // We can't access project state safely in async callback for naming if we rely on closures,
    // so we use functional updates or best effort naming.
    // 'assets' and 'project' from closure are the ones when handleFileSelected was created.
    const existingAssetNames = assets.map(a => a.name); 

    const FILE_SIZE_LIMIT = 20 * 1024 * 1024;
    if (file.size > FILE_SIZE_LIMIT) {
        showToast(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Limit is 20MB.`, 'error');
        if (e.target) e.target.value = '';
        return;
    }

    try {
        const base64Url = await fileToBase64(file);
        const rawName = file.name.split('.').slice(0, -1).join('.') || (type === ContentType.VIDEO ? 'Video Clip' : `New ${type}`);
        
        const assetName = getUniqueName(rawName, existingAssetNames);
        
        const newAsset: Asset = {
            id: `asset_${Date.now()}`,
            name: assetName,
            type: type === ContentType.IMAGE ? 'image' : type === ContentType.AUDIO ? 'audio' : type === ContentType.MODEL ? 'model' : 'video',
            url: base64Url,
            thumbnail: type === ContentType.IMAGE ? base64Url : undefined
        };

        let defaultScale: [number, number, number] = [1, 1, 1];
        if (type === ContentType.VIDEO) defaultScale = [5, 5, 5];
        if (type === ContentType.IMAGE) defaultScale = [4, 4, 4];

        // Combined atomic update
        setProject(prev => {
            const currentAssets = prev.assets || [];
            const targetId = selectedTargetId || prev.targets[0]?.id;
            
            // Re-calculate content name inside to ensure uniqueness against latest state
            const target = targetId ? prev.targets.find(t => t.id === targetId) : undefined;
            const existingContentNames = target ? target.contents.map(c => c.name) : [];
            const contentName = getUniqueName(rawName, existingContentNames);

            const newContent: Content = {
                id: `content_${Date.now()}`,
                name: contentName,
                type: type,
                transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: defaultScale },
                autoplay: false,
                loop: false,
                visible: true,
            };
            if (type === ContentType.IMAGE) newContent.imageUrl = base64Url;
            if (type === ContentType.AUDIO) newContent.audioUrl = base64Url;
            if (type === ContentType.MODEL) newContent.modelUrl = base64Url;
            if (type === ContentType.VIDEO) {
                newContent.videoUrl = base64Url;
                newContent.videoClickToggle = true;
            }

            if (!targetId) {
                // If no target, we just add the asset, but can't add content.
                // But handleRequestContent should have caught this.
                return {
                    ...prev,
                    assets: [newAsset, ...currentAssets]
                };
            }

            const updatedTargets = prev.targets.map(t => {
                if (t.id === targetId) {
                    return {
                        ...t,
                        contents: [...t.contents, newContent]
                    };
                }
                return t;
            });

            return {
                ...prev,
                assets: [newAsset, ...currentAssets],
                targets: updatedTargets
            };
        });
        
        const contentId = `content_${Date.now()}`;
        setSelectedContentId(contentId); 

        showToast(`${type === ContentType.VIDEO ? 'Video Clip' : type} added successfully!`, 'success');
        setIsAssetsModalOpen(false); // Close modal if it was open behind this
    } catch (error) {
        console.error("Error processing file:", error);
        showToast("Failed to load file.", 'error');
    }
    if (e.target) e.target.value = '';
  }

  const handleAddTargetClick = useCallback(() => {
    setAssetSelectionMode('target');
    setIsAssetsModalOpen(true);
  }, []);

  const handleAssetSelected = useCallback((asset: Asset) => {
    // 1. If mode is TARGET, create a new Target
    if (assetSelectionMode === 'target') {
        if (asset.type !== 'image' && asset.type !== 'mind') {
             showToast("Only Images or .mind files can be used as Targets.", 'error');
             return;
        }

        const newTargetId = `target_${Date.now()}`;
        setProject(prev => {
            const imageUrl = (asset.type === 'mind' && asset.thumbnail) ? asset.thumbnail : asset.url;
            const existingTargetNames = prev.targets.map(t => t.name);
            const targetName = getUniqueName(asset.name.replace(/\.[^/.]+$/, ""), existingTargetNames);
    
            const newTarget: Target = {
                id: newTargetId,
                name: targetName,
                imageUrl: imageUrl, 
                mindFileUrl: asset.type === 'mind' ? asset.url : undefined, 
                contents: [],
                visible: true,
            };
    
            return {
                ...prev,
                targets: [...prev.targets, newTarget],
            };
        });
        
        setSelectedTargetId(newTargetId);
        setSelectedContentId(null);
        showToast("New Target created.", 'success');
        setIsAssetsModalOpen(false);
        return;
    }

    // 2. If mode is CONTENT, add as child to selected Target
    if (assetSelectionMode === 'content') {
        setProject(prev => {
            const targetId = selectedTargetId || prev.targets[0]?.id;
            const target = targetId ? prev.targets.find(t => t.id === targetId) : undefined;
            
            if (!target) {
                // Should be handled by UI checks, but safety net
                return prev;
            }

            const existingNames = target.contents.map(c => c.name);
            const name = getUniqueName(asset.name, existingNames);
            const newContentId = `content_${Date.now()}`;

            let newContent: Content = {
                id: newContentId,
                name: name,
                type: ContentType.IMAGE, // Default fallback
                transform: { position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
                visible: true,
                autoplay: false,
                loop: false,
            };

            if (asset.type === 'image') {
                newContent.type = ContentType.IMAGE;
                newContent.imageUrl = asset.url;
                newContent.transform.scale = [4, 4, 4];
            } else if (asset.type === 'video') {
                newContent.type = ContentType.VIDEO;
                newContent.videoUrl = asset.url;
                newContent.transform.scale = [5, 5, 1];
                newContent.videoClickToggle = true;
            } else if (asset.type === 'audio') {
                newContent.type = ContentType.AUDIO;
                newContent.audioUrl = asset.url;
            } else if (asset.type === 'model') {
                newContent.type = ContentType.MODEL;
                newContent.modelUrl = asset.url;
            }

            const updatedTargets = prev.targets.map(t => {
                if (t.id === targetId) {
                    return { ...t, contents: [...t.contents, newContent] };
                }
                return t;
            });

            return { ...prev, targets: updatedTargets };
        });
        
        showToast("Asset added to scene.", 'success');
        setIsAssetsModalOpen(false);
    }

  }, [selectedTargetId, assetSelectionMode, setProject, showToast]);

  const handleDeleteTarget = useCallback((targetId: string) => {
    setProject(prev => {
        const updatedTargets = prev.targets.filter(t => t.id !== targetId);
        return { ...prev, targets: updatedTargets };
    });

    if (selectedTargetId === targetId) {
        setSelectedTargetId(null); 
        setSelectedContentId(null);
    }
    showToast("Target deleted.", 'info');
  }, [setProject, selectedTargetId, showToast]);

  const handleDuplicateTarget = useCallback((targetId: string) => {
    setProject(prev => {
        const targetToDuplicate = prev.targets.find(t => t.id === targetId);
        if (!targetToDuplicate) return prev;

        const existingTargetNames = prev.targets.map(t => t.name);
        const newName = getUniqueName(targetToDuplicate.name, existingTargetNames);
        const newId = `target_${Date.now()}`;

        const duplicatedTarget: Target = {
            ...JSON.parse(JSON.stringify(targetToDuplicate)),
            id: newId,
            name: newName,
            visible: true,
        };
        
        duplicatedTarget.contents = duplicatedTarget.contents.map(content => ({
            ...content,
            id: `content_${Date.now()}_${Math.random()}`.replace('.', '')
        }));

        const targetIndex = prev.targets.findIndex(t => t.id === targetId);
        const updatedTargets = [...prev.targets];
        updatedTargets.splice(targetIndex + 1, 0, duplicatedTarget);

        return { ...prev, targets: updatedTargets };
    });
    showToast("Target duplicated.", 'success');
  }, [setProject, showToast]);

  const handleDeleteContent = useCallback((targetId: string, contentId: string) => {
    setProject(prev => ({
        ...prev,
        targets: prev.targets.map(target => {
            if (target.id === targetId) {
                return {
                    ...target,
                    contents: target.contents.filter(content => content.id !== contentId)
                };
            }
            return target;
        })
    }));
    if (selectedContentId === contentId) {
        setSelectedContentId(null);
    }
  }, [setProject, selectedContentId]);

  const handleDuplicateContent = useCallback((targetId: string, contentId: string) => {
      setProject(prev => {
          const target = prev.targets.find(t => t.id === targetId);
          if (!target) return prev;
          const contentToDuplicate = target.contents.find(c => c.id === contentId);
          if (!contentToDuplicate) return prev;

          const existingNames = target.contents.map(c => c.name);
          const newName = getUniqueName(contentToDuplicate.name, existingNames);

          const duplicatedContent: Content = {
              ...JSON.parse(JSON.stringify(contentToDuplicate)),
              id: `content_${Date.now()}`,
              name: newName
          };
          duplicatedContent.transform.position[0] += 0.5;
          duplicatedContent.transform.position[1] += 0.5;

          return {
              ...prev,
              targets: prev.targets.map(t => {
                  if (t.id === targetId) {
                      return { ...t, contents: [...t.contents, duplicatedContent] };
                  }
                  return t;
              })
          };
      });
      showToast("Content duplicated.", 'success');
  }, [setProject, showToast]);

  const handleRenameContent = useCallback((targetId: string, contentId: string, newName: string) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(target => {
              if (target.id === targetId) {
                  return {
                      ...target,
                      contents: target.contents.map(content =>
                          content.id === contentId ? { ...content, name: newName } : content
                      )
                  };
              }
              return target;
          })
      }));
  }, [setProject]);

  const handleRenameTarget = useCallback((targetId: string, newName: string) => {
      setProject(prev => ({
          ...prev,
          targets: prev.targets.map(target =>
              target.id === targetId ? { ...target, name: newName } : target
          )
      }));
  }, [setProject]);

  const handleTargetUpdate = useCallback((updatedTarget: Target) => {
    setProject(prev => ({
        ...prev,
        targets: prev.targets.map(t => t.id === updatedTarget.id ? updatedTarget : t)
    }));
  }, [setProject]);

  const handleManualSave = useCallback(async () => {
      const success = await onSaveProject(project);
      if (success) {
          showToast("Project saved successfully.", 'success');
      } else {
          showToast("Failed to save project. Check your connection.", 'error');
      }
  }, [project, onSaveProject, showToast]);

  // Pass a functional asset adder
  const handleAddAsset = useCallback((asset: Asset) => {
      setProject(prev => ({
          ...prev,
          assets: [asset, ...(prev.assets || [])]
      }));
  }, [setProject]);

  const handleConfigUpdate = useCallback((newConfig: MindARConfig) => {
      setProject(prev => ({ ...prev, mindARConfig: newConfig }));
      showToast("Project settings updated.", 'success');
  }, [setProject, showToast]);

  const selectedTarget = project.targets.find(t => t.id === selectedTargetId);
  const selectedContent = selectedTarget?.contents.find(c => c.id === selectedContentId);
  const totalSize = project.targets.reduce((acc, t) => acc + (t.contents.length * 0.2), 0.1).toFixed(1);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-200 font-sans overflow-hidden">
      <Header
        projectName={project.name}
        onProjectNameChange={handleProjectNameChange}
        onGoToDashboard={onGoToDashboard}
        onToggleLeftPanel={() => setIsLeftPanelOpen(p => !p)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isLeftPanelOpen={isLeftPanelOpen}
        onPublish={() => setIsPublishModalOpen(true)}
        onHelp={() => setIsHelpModalOpen(true)}
        onPreview={() => setIsPreviewModalOpen(true)}
        onSave={handleManualSave}
        onSettings={() => setIsSettingsModalOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <LeftPanel
          isOpen={isLeftPanelOpen}
          width={leftPanelWidth}
          isResizing={isResizingLeft}
          onResizeStart={startResizeLeft}
          targets={project.targets}
          selectedTargetId={selectedTargetId}
          selectedContentId={selectedContentId}
          onSelect={handleSelectionChange}
          projectSize={`${totalSize} KB`}
          onAddTarget={handleAddTargetClick}
          onDeleteTarget={handleDeleteTarget}
          onDuplicateTarget={handleDuplicateTarget}
          onRenameTarget={handleRenameTarget}
          onTargetUpdate={handleTargetUpdate}
          onAddContent={handleRequestContent}
          onDeleteContent={handleDeleteContent}
          onDuplicateContent={handleDuplicateContent}
          onRenameContent={handleRenameContent}
          onContentUpdate={handleContentUpdate}
        />
        <ScenePanel 
            target={selectedTarget}
            selectedContent={selectedContent}
            onContentUpdate={handleContentUpdate}
            onContentAdd={handleContentAdd}
            onDeleteContent={handleDeleteContent}
            onSelect={handleSelectionChange}
            assets={assets}
            onAddAsset={handleAddAsset}
            sceneSettings={sceneSettings}
        />
        <RightPanel 
            width={rightPanelWidth}
            isResizing={isResizingRight}
            onResizeStart={startResizeRight}
            selectedContent={selectedContent} 
            selectedTarget={selectedTarget}
            onContentUpdate={handleContentUpdate}
            onTargetUpdate={handleTargetUpdate}
            onNotify={showToast}
            assets={assets}
            onAddAsset={handleAddAsset}
            sceneSettings={sceneSettings}
            onSceneSettingsChange={setSceneSettings}
        />
      </div>
      <AssetsModal
        isOpen={isAssetsModalOpen}
        onClose={() => setIsAssetsModalOpen(false)}
        onAddTarget={handleAssetSelected}
        assets={assets}
        onAddAsset={handleAddAsset}
      />
      <PublishModal 
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        project={project}
      />
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={project.mindARConfig || DEFAULT_CONFIG}
        onUpdate={handleConfigUpdate}
      />
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        target={selectedTarget}
      />
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={closeToast} 
      />
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
    </div>
  );
};

export default Editor;
