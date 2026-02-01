

import React, { useState, useEffect } from 'react';
import { XMarkIcon, FileIcon } from '../icons/Icons';
import { Project } from '../../types';
import { generateProjectJson, generateAFrameHtml } from '../../utils/exportUtils';
import { compileFiles } from '../../utils/compiler';
import { saveProjects } from '../../utils/storage';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, project }) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compiledMindFile, setCompiledMindFile] = useState<string | null>(null);
  const [projectJson, setProjectJson] = useState('');
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Reset state when opened
  useEffect(() => {
      if (isOpen) {
          setIsCompiling(false);
          setIsPublishing(false);
          setPublishUrl(null);
          setProgress(0);
          setCompiledMindFile(null);
          setProjectJson('');
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCompile = async () => {
      setIsCompiling(true);
      setProgress(0);
      try {
          // Convert all target images to Files
          const files: File[] = [];
          for (const target of project.targets) {
              const res = await fetch(target.imageUrl);
              const blob = await res.blob();
              files.push(new File([blob], `${target.name}.jpg`, { type: blob.type }));
          }

          if (files.length > 0) {
              const mindFileUrl = await compileFiles(files, (p) => setProgress(Math.round(p)));
              setCompiledMindFile(mindFileUrl);
              const json = generateProjectJson(project, mindFileUrl);
              setProjectJson(JSON.stringify(json, null, 2));
          } else {
              // No targets, just export structure
              const json = generateProjectJson(project, null);
              setProjectJson(JSON.stringify(json, null, 2));
          }
      } catch (e) {
          console.error("Compilation failed", e);
          alert("Failed to compile targets.");
      } finally {
          setIsCompiling(false);
      }
  };

  const handlePublish = async () => {
      setIsPublishing(true);
      try {
          // 1. Update Project Status
          const updatedProject: Project = { ...project, status: 'Published' };
          
          // 2. Save to DB
          // Note: In a real app we'd pass a specific save handler, here we use the global util 
          // which requires the full list, but we'll try to just update this one if possible or use what we have.
          // Since we don't have the full list prop here, we assume the parent updates local state, 
          // but we want to ensure DB persistence.
          await saveProjects([updatedProject]); 

          // 3. Generate Link
          // Get current origin (e.g., https://your-vercel-app.vercel.app or localhost)
          const origin = window.location.origin;
          const url = `${origin}/view/${project.id}`;
          setPublishUrl(url);

      } catch(e) {
          console.error(e);
          alert("Failed to publish.");
      } finally {
          setIsPublishing(false);
      }
  };

  const handleDownload = () => {
      if (!projectJson) return;
      const blob = new Blob([projectJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_config.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleDownloadMindFile = () => {
      if (!compiledMindFile) return;
      const a = document.createElement('a');
      a.href = compiledMindFile;
      a.download = "targets.mind";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }

  const handleDownloadHtml = () => {
      if (!compiledMindFile) return;
      const htmlContent = generateAFrameHtml(project);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "index.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 flex flex-col h-[85vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Publish & Export</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            
            {/* Step 1: Compilation */}
            <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-bold text-gray-700 mb-2">1. Compile Targets</h4>
                <p className="text-sm text-gray-600 mb-3">
                    Compile your image targets into a <code>.mind</code> file optimized for tracking.
                </p>
                {!compiledMindFile && !isCompiling && (
                    <button 
                        onClick={handleCompile}
                        className="w-full py-2 bg-indigo-600 text-white rounded-md font-bold hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                    >
                        Compile {project.targets.length} Targets
                    </button>
                )}
                
                {isCompiling && (
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden border">
                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                )}

                {compiledMindFile && (
                    <div className="flex items-center justify-between bg-white border border-green-200 p-2 rounded text-green-700 text-sm">
                        <span className="flex items-center gap-2">✅ Compiled Successfully</span>
                        <button onClick={handleDownloadMindFile} className="underline hover:text-green-900 font-bold">Download targets.mind</button>
                    </div>
                )}
            </div>

            {/* Step 2: Publish */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">2. Publish to Web</h4>
                <p className="text-sm text-blue-700 mb-3">
                    Make this project accessible via a public URL hosted on this platform.
                </p>
                
                {!publishUrl ? (
                    <button 
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="w-full py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm disabled:opacity-50"
                    >
                        {isPublishing ? "Publishing..." : "Publish Now"}
                    </button>
                ) : (
                    <div className="bg-white p-3 rounded border border-blue-200">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Public Link</p>
                        <div className="flex gap-2">
                            <input readOnly value={publishUrl} className="flex-1 bg-gray-100 border px-2 py-1 text-sm rounded text-gray-700 select-all" />
                            <button onClick={() => window.open(publishUrl, '_blank')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200">Open</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 3: Export Code */}
            <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-bold text-gray-700 mb-2">3. Developer Export</h4>
                <p className="text-sm text-gray-600 mb-3">
                    Download source files to host on your own server.
                </p>
                
                {projectJson && (
                    <div className="flex-1 overflow-hidden border border-gray-300 rounded-md bg-white relative mb-3 h-20">
                        <pre className="w-full h-full overflow-auto p-2 text-[10px] font-mono text-gray-700">
                            {projectJson}
                        </pre>
                    </div>
                )}

                <div className="flex gap-2">
                    <button 
                        onClick={handleDownload} 
                        disabled={!projectJson}
                        className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm font-medium"
                    >
                        Download Config JSON
                    </button>
                    <button 
                        onClick={handleDownloadHtml} 
                        disabled={!compiledMindFile}
                        className="flex-1 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                        title="Generates a single HTML file using A-Frame. Requires targets.mind in same folder."
                    >
                        <FileIcon className="w-4 h-4" /> Download A-Frame App
                    </button>
                </div>
                {compiledMindFile && (
                    <p className="text-[10px] text-gray-500 mt-2 italic">
                        * For the A-Frame App to work, place the downloaded <strong>index.html</strong> and <strong>targets.mind</strong> in the same folder.
                    </p>
                )}
            </div>
        </div>

        <div className="mt-4 pt-4 border-t flex justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;