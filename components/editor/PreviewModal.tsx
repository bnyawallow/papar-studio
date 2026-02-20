
"use client";

import React from 'react';
import { XMarkIcon } from '../icons/Icons';
import { Target } from '../../types';
import ScenePanel from './ScenePanel';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: Target | undefined;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, target }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm p-4 animate-fadeIn">
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors z-50 group"
            title="Close Preview"
        >
            <XMarkIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>

        <div className="flex flex-col items-center gap-6">
            {/* Phone Bezel */}
            <div className="relative w-[360px] h-[740px] bg-gray-800 rounded-[3rem] shadow-2xl border-4 border-gray-700 ring-8 ring-gray-900 overflow-hidden select-none transform transition-transform hover:scale-[1.01]">
                
                {/* Side Buttons */}
                <div className="absolute top-32 -left-2 w-1 h-10 bg-gray-600 rounded-l-lg"></div>
                <div className="absolute top-48 -left-2 w-1 h-16 bg-gray-600 rounded-l-lg"></div>
                <div className="absolute top-32 -right-2 w-1 h-20 bg-gray-600 rounded-r-lg"></div>

                {/* Internal Bezel */}
                <div className="absolute inset-1 bg-black rounded-[2.8rem] overflow-hidden flex flex-col">
                    
                    {/* Notch Area */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-xl z-30 flex justify-center items-center gap-4">
                        <div className="w-12 h-1 bg-gray-800 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
                    </div>

                    {/* Screen Content */}
                    <div className="flex-1 relative w-full h-full bg-slate-900 overflow-hidden">
                        
                        {/* 1. Simulated Environment (Camera Feed) */}
                        <img 
                            src="https://images.unsplash.com/photo-1596766627039-447ee5642d99?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                            alt="Environment" 
                            className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                        />

                        {/* 2. Scanning Effect */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,rgba(74,222,128,0.1)_50%,transparent_100%)] bg-[length:100%_200%] animate-scan z-10 mix-blend-overlay"></div>

                        {/* 3. AR Scene Layer */}
                        <div className="absolute inset-0 z-20">
                            <ScenePanel 
                                target={target}
                                selectedContent={undefined}
                                onContentUpdate={() => {}}
                                onContentAdd={() => {}}
                                onSelect={() => {}}
                                isPreviewMode={true}
                            />
                        </div>

                        {/* Status Bar Mockup */}
                        <div className="absolute top-0 left-0 right-0 h-8 flex justify-between items-center px-6 text-[10px] font-bold text-white z-20">
                            <span>9:41</span>
                            <div className="flex gap-1">
                                <span className="h-2 w-2 bg-white rounded-full"></span>
                                <span className="h-2 w-2 bg-white rounded-full"></span>
                                <span className="h-2 w-4 bg-white rounded-sm"></span>
                            </div>
                        </div>

                        {/* Bottom UI Overlay */}
                        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 z-30 pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-md text-white/90 px-4 py-1.5 rounded-full text-xs border border-white/10 font-mono flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                AR TRACKING ACTIVE
                            </div>
                        </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-30"></div>
                </div>
            </div>

            <div className="text-white/50 text-sm font-medium">
                Interact to rotate view
            </div>
        </div>

        <style>{`
            @keyframes scan {
                0% { background-position: 0% -100%; }
                100% { background-position: 0% 200%; }
            }
            .animate-scan {
                animation: scan 3s linear infinite;
            }
            .animate-fadeIn {
                animation: fadeIn 0.3s ease-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        `}</style>
    </div>
  );
};

export default PreviewModal;
