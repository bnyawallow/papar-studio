
"use client";

import React, { useState } from 'react';
import { Project } from '../../types';
import { XMarkIcon, LinkIcon, QrCodeIcon } from '../icons/Icons';
import { compileFiles } from '../../utils/compiler';
import { generateProjectZip } from '../../utils/exportUtils';
import { ToastType } from '../ui/Toast';
import { uploadFileToStorage } from '../../utils/storage';
import { getProjectBySlug } from '../../src/services/projectService';
import QRCode from 'qrcode';

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

  if (!isOpen) return null;

  const handleCompile = async () => {
      // Check for duplicate slug before publishing
      const projectSlug = project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Check if slug is taken by another project
      const existingProject = await getProjectBySlug(projectSlug);
      if (existingProject && existingProject.id !== project.id) {
        onNotify("A project with this name already exists. Please choose a different name or rename the existing project.", "error");
        return;
      }

      setIsCompiling(true);
      setProgress(0);
      try {
          const targets = project.targets;
          if (targets.length === 0) {
              throw new Error("No targets to compile.");
          }

          // Gather images
          // Note: compileFiles expects File objects. We need to convert URLs/Base64 to Files.
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

          // Compile
          const mindData = await compileFiles(files, (p) => setProgress(p));
          
          // Create Blob
          const mindBlob = new Blob([mindData], { type: 'application/octet-stream' });
          const mindFile = new File([mindBlob], 'targets.mind', { type: 'application/octet-stream' });

          // Upload to Supabase Storage
          let uploadedUrl = '';
          try {
             uploadedUrl = await uploadFileToStorage(mindFile);
          } catch (uploadError) {
             console.error("Cloud upload failed:", uploadError);
             onNotify("Failed to upload to cloud storage. Please check your Supabase configuration and try again.", "error");
             throw uploadError; // Re-throw to stop the publish process
          }

          // Update Project with new mind file URL (we attach it to the first target or a project field)
          const updatedTargets = [...project.targets];
          updatedTargets[0] = { ...updatedTargets[0], mindFileUrl: uploadedUrl };
          
          // Generate and store the slug for title-based publishing
          // Note: projectSlug already computed above for validation
          
          onUpdateProject({
              ...project,
              targets: updatedTargets,
              status: 'Published',
              publishedSlug: projectSlug
          });

          // Generate Viewer Link using project name for cleaner URLs
          const viewerUrl = `${window.location.origin}/apps/${projectSlug}`;
          setPublishUrl(viewerUrl);

          // Generate QR Code
          try {
            const qrData = await QRCode.toDataURL(viewerUrl, { width: 200, margin: 1 });
            setQrCodeUrl(qrData);
          } catch (qrError) {
            console.error("Failed to generate QR", qrError);
          }
          
          onNotify("Compilation successful!", "success");
      } catch (e) {
          console.error(e);
          onNotify("Compilation failed.", "error");
      } finally {
          setIsCompiling(false);
      }
  };

  // Helper to generate slug from project name
  const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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

  // Handle download of ZIP file for the published web app
  const handleDownloadZip = async () => {
    const mindFileUrl = project.targets[0]?.mindFileUrl;
    if (!mindFileUrl) {
      onNotify("Please compile the project first.", 'error');
      return;
    }
    
    try {
      const blob = await generateProjectZip(project, mindFileUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify("ZIP downloaded successfully!", 'success');
    } catch(e) {
      console.error(e);
      onNotify("Failed to generate ZIP.", 'error');
    }
  };

  return (
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
                        onClick={handleCompile} 
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                        {project.targets[0]?.mindFileUrl ? "Re-Compile" : "Compile"}
                    </button>
                )}
            </div>

            {project.targets[0]?.mindFileUrl && (
                <div className="space-y-4 pt-4 border-t">
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

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={handleDownloadZip}
                            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            Download ZIP
                        </button>
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
  );
};

export default PublishModal;
