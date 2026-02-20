
"use client";

import React, { useState } from 'react';
import { Project } from '../../types';
import { XMarkIcon } from '../icons/Icons';
import { compileFiles } from '../../utils/compiler';
import { generateProjectZip } from '../../utils/exportUtils';
import { ToastType } from '../ui/Toast';
import { uploadFileToStorage } from '../../utils/storage';
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
              const res = await fetch(targets[i].imageUrl);
              const blob = await res.blob();
              files.push(new File([blob], `target_${i}.jpg`, { type: 'image/jpeg' }));
          }

          // Compile
          const mindData = await compileFiles(files, (p) => setProgress(p));
          
          // Create Blob
          const mindBlob = new Blob([mindData], { type: 'application/octet-stream' });
          const mindFile = new File([mindBlob], 'targets.mind', { type: 'application/octet-stream' });

          // Upload or use Object URL
          let uploadedUrl = '';
          try {
             uploadedUrl = await uploadFileToStorage(mindFile);
          } catch (e) {
             console.warn("Cloud upload failed or not configured, using local blob URL.");
             uploadedUrl = URL.createObjectURL(mindBlob);
          }

          // Update Project with new mind file URL (we attach it to the first target or a project field)
          const updatedTargets = [...project.targets];
          updatedTargets[0] = { ...updatedTargets[0], mindFileUrl: uploadedUrl };
          
          onUpdateProject({
              ...project,
              targets: updatedTargets,
              status: 'Published'
          });

          // Generate Viewer Link
          // Point to the Next.js API route that serves the raw HTML
          const viewerUrl = `${window.location.origin}/apps/${project.id}`;
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
                                    <button onClick={() => window.open(publishUrl, '_blank')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200">Open</button>
                                </div>
                            </div>
                            
                            {qrCodeUrl && (
                                <div className="flex flex-col items-center justify-center p-4 border rounded bg-gray-50">
                                    <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 border bg-white" />
                                    <p className="text-xs text-gray-500 mt-2">Scan to preview on mobile</p>
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
