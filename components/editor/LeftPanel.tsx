
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Target, ContentType, Content } from '../../types';
import { 
    EyeIcon, PencilIcon, DuplicateIcon, TrashIcon,
    ImageIcon, VideoIcon, AudioIcon, TextIcon, EyeSlashIcon, CubeIcon
} from '../icons/Icons';
import ConfirmationModal from './ConfirmationModal';

interface LeftPanelProps {
  isOpen: boolean;
  width: number;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
  targets: Target[];
  selectedTargetId: string | null;
  selectedContentId: string | null;
  onSelect: (targetId: string, contentId?: string) => void;
  projectSize: string;
  onAddTarget: () => void;
  onDeleteTarget: (targetId: string) => void;
  onDuplicateTarget: (targetId: string) => void;
  onRenameTarget: (targetId: string, newName: string) => void;
  onTargetUpdate: (target: Target) => void;
  onAddContent: (type: ContentType) => void;
  onDeleteContent: (targetId: string, contentId: string) => void;
  onDuplicateContent: (targetId: string, contentId: string) => void;
  onRenameContent: (targetId: string, contentId: string, newName: string) => void;
  onContentUpdate: (content: Content) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ 
    isOpen,
    width,
    isResizing,
    onResizeStart,
    targets, 
    selectedTargetId, 
    selectedContentId, 
    onSelect, 
    projectSize,
    onAddTarget,
    onDeleteTarget,
    onDuplicateTarget,
    onRenameTarget,
    onTargetUpdate,
    onAddContent,
    onDeleteContent,
    onDuplicateContent,
    onRenameContent,
    onContentUpdate,
}) => {
  const [contentMenuTargetId, setContentMenuTargetId] = useState<string | null>(null);
  const [renamingTargetId, setRenamingTargetId] = useState<string | null>(null);
  const [renamingContentId, setRenamingContentId] = useState<string | null>(null);
  const [deletingTargetId, setDeletingTargetId] = useState<string | null>(null);

  const addContentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (contentMenuTargetId &&
            addContentRefs.current[contentMenuTargetId] &&
            !addContentRefs.current[contentMenuTargetId]!.contains(event.target as Node))
        {
            setContentMenuTargetId(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contentMenuTargetId]);

  const handleAddContentClick = (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setContentMenuTargetId(prev => (prev === targetId ? null : targetId));
    onSelect(targetId);
  }

  const handleAddContentSelect = (type: ContentType) => {
    onAddContent(type);
    setContentMenuTargetId(null);
  }

  const handleDeleteConfirm = () => {
    if (deletingTargetId) {
      onDeleteTarget(deletingTargetId);
      setDeletingTargetId(null);
    }
  };

  return (
    <>
      <aside 
        style={{ width: isOpen ? width : 0 }}
        className={`bg-gray-800 text-white flex flex-col flex-shrink-0 overflow-hidden relative ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 min-w-[200px]">
            {targets.map(target => (
              <div key={target.id} className="mb-2">
                <div 
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer group ${selectedTargetId === target.id && !selectedContentId ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                  onClick={() => onSelect(target.id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    {renamingTargetId === target.id ? (
                        <input
                            id={`rename-target-${target.id}`}
                            type="text"
                            defaultValue={target.name}
                            autoFocus
                            onBlur={(e) => {
                                onRenameTarget(target.id, e.target.value);
                                setRenamingTargetId(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onRenameTarget(target.id, (e.target as HTMLInputElement).value);
                                    setRenamingTargetId(null);
                                } else if (e.key === 'Escape') {
                                    setRenamingTargetId(null);
                                }
                            }}
                            className="bg-gray-900 text-white w-full"
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <>
                            <span className="font-semibold truncate">{target.name}</span>
                            <PencilIcon 
                                className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); setRenamingTargetId(target.id); }}
                            />
                        </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    { (target.visible ?? true) ? 
                        <EyeIcon className="w-4 h-4 cursor-pointer hover:text-white" onClick={(e) => {
                            e.stopPropagation();
                            onTargetUpdate({ ...target, visible: !(target.visible ?? true) });
                        }} /> :
                        <EyeSlashIcon className="w-4 h-4 cursor-pointer hover:text-white" onClick={(e) => {
                            e.stopPropagation();
                            onTargetUpdate({ ...target, visible: !(target.visible ?? true) });
                        }} />
                    }
                    <DuplicateIcon 
                      className="w-4 h-4 cursor-pointer hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateTarget(target.id);
                      }}
                    />
                     <TrashIcon 
                      className="w-4 h-4 cursor-pointer hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTargetId(target.id);
                      }}
                    />
                  </div>
                </div>
                <div className="pl-4 border-l-2 border-gray-700 ml-2 mt-1">
                  {target.contents.map(content => (
                    <div 
                      key={content.id} 
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer group ${selectedContentId === content.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                      onClick={() => onSelect(target.id, content.id)}
                    >
                      <div className="flex items-center gap-2 text-sm truncate">
                        {renamingContentId === content.id ? (
                            <input
                                id={`rename-content-${content.id}`}
                                type="text"
                                defaultValue={content.name}
                                autoFocus
                                onBlur={(e) => {
                                    onRenameContent(target.id, content.id, e.target.value);
                                    setRenamingContentId(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onRenameContent(target.id, content.id, (e.target as HTMLInputElement).value);
                                        setRenamingContentId(null);
                                    } else if (e.key === 'Escape') {
                                        setRenamingContentId(null);
                                    }
                                }}
                                className="bg-gray-900 text-white w-full"
                            />
                        ) : (
                            <>
                                <span className="truncate">{content.name}</span>
                                <PencilIcon 
                                    className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0"
                                    onClick={(e) => { e.stopPropagation(); setRenamingContentId(content.id); }}
                                />
                            </>
                        )}
                      </div>
                       <div className="flex items-center gap-2 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        { (content.visible ?? true) ?
                            <EyeIcon className="w-4 h-4 cursor-pointer hover:text-white" onClick={(e) => {
                                e.stopPropagation();
                                onContentUpdate({ ...content, visible: !(content.visible ?? true) });
                            }}/> :
                            <EyeSlashIcon className="w-4 h-4 cursor-pointer hover:text-white" onClick={(e) => {
                                e.stopPropagation();
                                onContentUpdate({ ...content, visible: !(content.visible ?? true) });
                            }}/>
                        }
                        <DuplicateIcon 
                            className="w-4 h-4 cursor-pointer hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateContent(target.id, content.id);
                            }}
                        />
                        <TrashIcon className="w-4 h-4 cursor-pointer hover:text-white" onClick={(e) => {
                            e.stopPropagation();
                            onDeleteContent(target.id, content.id);
                        }}/>
                      </div>
                    </div>
                  ))}
                   <div className="relative" ref={node => { addContentRefs.current[target.id] = node; }}>
                    <button 
                      onClick={(e) => handleAddContentClick(target.id, e)} 
                      className="w-full text-left p-2 mt-1 rounded-md hover:bg-gray-700 text-sm text-gray-400 flex items-center gap-1"
                    >
                      <span>+</span> Add Asset
                    </button>
                    {contentMenuTargetId === target.id && (
                      <div className="absolute left-0 mt-1 w-48 bg-gray-900 rounded-md shadow-lg z-20 border border-gray-700">
                        <button onClick={() => handleAddContentSelect(ContentType.IMAGE)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                          <ImageIcon className="w-4 h-4" /> Image
                        </button>
                        <button onClick={() => handleAddContentSelect(ContentType.VIDEO)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                          <VideoIcon className="w-4 h-4" /> Video Clip
                        </button>
                        <button onClick={() => handleAddContentSelect(ContentType.STREAMING_VIDEO)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                          <VideoIcon className="w-4 h-4" /> Streaming Video
                        </button>
                        <button onClick={() => handleAddContentSelect(ContentType.AUDIO)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                          <AudioIcon className="w-4 h-4" /> Audio
                        </button>
                        <button onClick={() => handleAddContentSelect(ContentType.TEXT)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                          <TextIcon className="w-4 h-4" /> Text
                        </button>
                        <button onClick={() => handleAddContentSelect(ContentType.MODEL)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                          <CubeIcon className="w-4 h-4" /> 3D Model
                        </button>
                      </div>
                    )}
                   </div>
                </div>
              </div>
            ))}
            <button 
                onClick={onAddTarget}
                className="w-full text-center p-2 mt-4 rounded-md border-2 border-dashed border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-colors flex items-center justify-center gap-1"
            >
                <span>+</span> Add Image Target
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 min-w-[200px]">
          <p className="text-sm">project size: {projectSize}</p>
        </div>
        <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 z-20"
            onMouseDown={onResizeStart}
        />
      </aside>
      <ConfirmationModal
        isOpen={!!deletingTargetId}
        onClose={() => setDeletingTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Target"
        message={`Are you sure you want to delete the target "${targets.find(t => t.id === deletingTargetId)?.name}"? This action cannot be undone.`}
      />
    </>
  );
};

export default LeftPanel;
