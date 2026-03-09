
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '../../types';
import { XMarkIcon, LinkIcon, QrCodeIcon, CheckIcon, LoaderIcon } from '../icons/Icons';
import { compileFiles } from '../../utils/compiler';
import { ToastType } from '../ui/Toast';
import { uploadFileToStorage } from '../../utils/storage';
import { getPublishedMetadata, savePublishedMetadata } from '../../utils/storage';
import { getProjectBySlug } from '../../src/services/projectService';
import QRCode from 'qrcode';

// Publishing step types
type PublishStep = 'idle' | 'compiling' | 'generating' | 'uploading' | 'finalizing' | 'complete' | 'error';

interface PublishProgress {
  step: PublishStep;
  progress: number;
  message: string;
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (project: Project) => void;
  onNotify: (message: string, type: ToastType) => void;
}

const PublishModal: React.FC<PublishModalProps> = ({ 
    isOpen, 
    onClose, 
    project, 
    onUpdateProject,
    onNotify
}) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  
  // New: Publishing step progress tracking
  const [publishProgress, setPublishProgress] = useState<PublishProgress>({
    step: 'idle',
    progress: 0,
    message: ''
  });
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showRepublishConfirm, setShowRepublishConfirm] = useState(false);

  // Determine if project has been published before
  const isAlreadyPublished = useMemo(() => {
    return project.status === 'Published' && project.targets.some(t => t.mindFileUrl);
  }, [project.status, project.targets]);

  // Load stored publish data when modal opens
  useEffect(() => {
    if (isOpen && project.id) {
      const storedMetadata = getPublishedMetadata(project.id);
      if (storedMetadata) {
        setPublishUrl(storedMetadata.publishUrl);
        setQrCodeUrl(storedMetadata.qrCodeDataUrl);
      }
    }
  }, [isOpen, project.id]);

  const handlePublish = async () => {
      // Check for duplicate slug before publishing
      const projectSlug = project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Check if slug is taken by another project
      const existingProject = await getProjectBySlug(projectSlug);
      if (existingProject && existingProject.id !== project.id) {
        onNotify("A project with this name already exists. Please choose a different name or rename the existing project.", "error");
        return;
      }

      setIsCompiling(true);
      setPublishError(null);
      setPublishProgress({ step: 'compiling', progress: 5, message: 'Compiling tracker file...' });
      setProgress(0);
      
      try {
          const targets = project.targets;
          if (targets.length === 0) {
              throw new Error("No targets to compile.");
          }

          // Gather images
          const files: File[] = [];
          for (let i = 0; i < targets.length; i++) {
              try {
                const res = await fetch(targets[i].imageUrl);
                if (!res.ok) {
                  throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
                }
                const blob = await res.blob();
                files.push(new File([blob], `target_${i}.jpg`, { type: 'image/jpeg' }));
              } catch (fetchError) {
                throw new Error(`Failed to load target image: ${targets[i].name}. Ensure the image URL allows CORS access.`);
              }
          }

          // Compile - Step 1: Compiling tracker file
          setPublishProgress({ step: 'compiling', progress: 10, message: 'Compiling tracker file...' });
          const mindData = await compileFiles(files, (p) => {
            const adjustedProgress = 10 + (p * 0.35); // 10-45%
            setProgress(adjustedProgress);
            setPublishProgress(prev => ({ ...prev, progress: adjustedProgress, message: 'Compiling tracker file...' }));
          });
          
          // Step 2: Generating HTML
          setPublishProgress({ step: 'generating', progress: 45, message: 'Generating HTML...' });
          setProgress(45);
          
          // Create Blob from compiled mind data
          const mindBlob = new Blob([mindData], { type: 'application/octet-stream' });
          const mindFile = new File([mindBlob], 'targets.mind', { type: 'application/octet-stream' });

          // Step 3: Uploading to cloud
          setPublishProgress({ step: 'uploading', progress: 55, message: 'Uploading assets to cloud...' });
          setProgress(55);

          // Upload to Supabase Storage
          let uploadedUrl = '';
          try {
             uploadedUrl = await uploadFileToStorage(mindFile);
          } catch (uploadError) {
             console.error("Cloud upload failed:", uploadError);
             setPublishError("Failed to upload to cloud storage. Please check your Supabase configuration and try again.");
             onNotify("Failed to upload to cloud storage. Please check your Supabase configuration and try again.", "error");
             setPublishProgress({ step: 'error', progress: 55, message: 'Upload failed' });
             throw uploadError;
          }

          // Step 4: Finalizing deployment
          setPublishProgress({ step: 'finalizing', progress: 80, message: 'Finalizing deployment...' });
          setProgress(80);
          
          // Update Project with new mind file URL
          const updatedTargets = project.targets.map((t, i) => 
            i === 0 ? { ...t, mindFileUrl: uploadedUrl } : t
          );
          
          onUpdateProject({
              ...project,
              targets: updatedTargets,
              status: 'Published',
              publishedSlug: projectSlug
          });

          // Generate Viewer Link
          const viewerUrl = `${window.location.origin}/apps/${projectSlug}`;
          setPublishUrl(viewerUrl);

          // Generate QR Code
          let qrDataUrl = '';
          try {
            const qrData = await QRCode.toDataURL(viewerUrl, { width: 200, margin: 1 });
            setQrCodeUrl(qrData);
            qrDataUrl = qrData;
          } catch (qrError) {
            console.error("Failed to generate QR", qrError);
          }
          
          // Save published metadata to localStorage
          savePublishedMetadata(project.id, viewerUrl, qrDataUrl, projectSlug);
          
          // Complete
          setPublishProgress({ step: 'complete', progress: 100, message: 'Publishing complete!' });
          setProgress(100);
          
          onNotify("Project published successfully!", "success");
      } catch (e: any) {
          console.error(e);
          setPublishError(e.message || 'Publishing failed');
          setPublishProgress({ step: 'error', progress: 0, message: e.message || 'Publishing failed' });
          onNotify(e.message || "Publishing failed.", "error");
      } finally {
          setIsCompiling(false);
      }
  };

  // Handle download of QR code as image
  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `${project.name.replace(/\s+/g, '_')}_qrcode.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  // Handle copying link to clipboard
  const handleCopyLink = () => {
    if (!publishUrl) return;
    navigator.clipboard.writeText(publishUrl).then(() => {
      onNotify('Link copied to clipboard!', 'success');
    }).catch(() => {
      onNotify('Failed to copy link', 'error');
    });
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-gray-800">Publish Project</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        
        <div className="space-y-6">
            <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">1. Compile Target Images</h4>
                <p className="text-sm text-gray-500">Processing images to create the tracking file (.mind). This may take a while.</p>
                {isCompiling ? (
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        <p className="text-xs text-center mt-1 text-gray-600">{Math.round(progress)}%</p>
                    </div>
                ) : (
                    <button 
                        onClick={() => {
                            if (isAlreadyPublished) {
                                setShowRepublishConfirm(true);
                            } else {
                                handlePublish();
                            }
                        }} 
                        className={`w-full py-2 text-white rounded-md font-medium transition-colors ${
                            isAlreadyPublished 
                                ? 'bg-amber-600 hover:bg-amber-700' 
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {isAlreadyPublished ? 'Republish' : 'Publish Project'}
                    </button>
                )}
            </div>

            {/* Republish Warning Message */}
            {isAlreadyPublished && !isCompiling && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm">
                        ⚠️ <strong>Warning:</strong> This will delete the existing published version and create a fresh one. The previous URL will no longer be accessible.
                    </p>
                </div>
            )}

            {/* Step-by-Step Progress Display */}
            {isCompiling && publishProgress.step !== 'idle' && (
                <div className="space-y-3 mt-4">
                    <div className="space-y-2">
                        {[
                            { step: 'compiling', message: 'Compiling tracker file...' },
                            { step: 'generating', message: 'Generating HTML...' },
                            { step: 'uploading', message: 'Uploading assets to cloud...' },
                            { step: 'finalizing', message: 'Finalizing deployment...' }
                        ].map((s) => (
                            <div 
                                key={s.step} 
                                className={`flex items-center gap-3 ${
                                    publishProgress.step === s.step ? 'text-blue-600' : 
                                    (publishProgress.step === 'complete' || 
                                     (publishProgress.step !== 'error' && ['compiling', 'generating', 'uploading', 'finalizing'].indexOf(s.step) < ['compiling', 'generating', 'uploading', 'finalizing'].indexOf(publishProgress.step))) 
                                        ? 'text-green-600' : 'text-gray-400'
                                }`}
                            >
                                {publishProgress.step === s.step ? (
                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                ) : publishProgress.step === 'complete' || (publishProgress.step !== 'error' && ['compiling', 'generating', 'uploading', 'finalizing'].indexOf(s.step) < ['compiling', 'generating', 'uploading', 'finalizing'].indexOf(publishProgress.step)) ? (
                                    <CheckIcon className="w-4 h-4" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                )}
                                <span className="text-sm">{s.message}</span>
                            </div>
                        ))}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                        <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${publishProgress.progress}%` }} />
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-1">{Math.round(publishProgress.progress)}%</p>
                </div>
            )}

            {/* Error Display */}
            {publishError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <p className="text-red-800 text-sm">{publishError}</p>
                </div>
            )}

            {/* Success State */}
            {(project.targets[0]?.mindFileUrl || publishUrl) && (
                <div className="space-y-4 pt-4 border-t">
                    {/* Success Banner */}
                    {publishProgress.step === 'complete' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3">
                                <CheckIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                                <div>
                                    <h4 className="text-lg font-semibold text-green-800">Published Successfully!</h4>
                                    <p className="text-sm text-green-700">Your project is now live and accessible.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <h4 className="font-semibold text-gray-700">2. Share & Download</h4>
                    
                    {publishUrl && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Public App Link</p>
                                <div className="flex gap-2">
                                    <input id="publish-url" name="publish-url" readOnly value={publishUrl} className="flex-1 bg-gray-100 border px-2 py-1 text-sm rounded text-gray-700 select-all" />
                                    <button onClick={handleCopyLink} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 flex items-center gap-1">
                                        <LinkIcon className="w-4 h-4" /> Copy
                                    </button>
                                    <button onClick={() => window.open(publishUrl, '_blank')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200">Open</button>
                                </div>
                            </div>
                            
                            {qrCodeUrl && (
                                <div className="flex flex-col items-center justify-center p-4 border rounded bg-gray-50">
                                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border-2 border-white bg-white" />
                                    <p className="text-xs text-gray-500 mt-3">Scan to preview on mobile</p>
                                    <button 
                                        onClick={handleDownloadQR}
                                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                        <QrCodeIcon className="w-4 h-4" /> Download QR Code
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>

    {/* Republish Confirmation Dialog */}
    {showRepublishConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Republish</h3>
                <p className="text-gray-600 mb-6">
                    Are you sure you want to republish this project? This will delete the existing published version and create a fresh one. The previous URL will no longer be accessible.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            setShowRepublishConfirm(false);
                            handlePublish();
                        }}
                        className="flex-1 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-medium"
                    >
                        Republish
                    </button>
                    <button 
                        onClick={() => setShowRepublishConfirm(false)}
                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-100 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default PublishModal;
