
"use client";

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Content, Target, ContentType, FONT_MAP, Asset, MaterialProperties, SceneSettings } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { equal } from '@wry/equality';
import { ToastType } from '../ui/Toast';
import { fileToBase64 } from '../../utils/storage';
import { ImageIcon, YoutubeIcon, VideoIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, BoldIcon, ItalicIcon } from '../icons/Icons';

interface RightPanelProps {
  width: number;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
  selectedContent: Content | undefined;
  selectedTarget: Target | undefined;
  onContentUpdate: (content: Content) => void;
  onTargetUpdate?: (target: Target) => void;
  onNotify?: (message: string, type: ToastType) => void;
  assets?: Asset[];
  onAddAsset?: (asset: Asset) => void;
  sceneSettings?: SceneSettings;
  onSceneSettingsChange?: (settings: SceneSettings) => void;
}

const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper to ensure color input receives a valid hex
const safeColor = (color?: string, fallback = '#000000') => {
    if (!color || color === 'transparent') return fallback;
    return color;
};

// Enhanced Color Picker Component
const ColorInput = ({ label, value, onChange, fallback = '#000000', id }: { label: string, value?: string, onChange: (val: string) => void, fallback?: string, id?: string }) => {
    const currentColor = safeColor(value, fallback);
    const inputId = id || `color-input-${label.replace(/\s+/g, '-').toLowerCase()}`;
    
    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9A-F]/ig, '').toUpperCase();
        if (val.length > 6) val = val.slice(0, 6);
        onChange('#' + val);
    };

    return (
        <div>
            <label htmlFor={inputId} className="text-xs text-text-tertiary font-medium block mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex gap-2 items-center">
                <div className="relative w-8 h-8 rounded border border-border-default overflow-hidden shrink-0 shadow-sm">
                    <input 
                        id={`${inputId}-picker`}
                        type="color" 
                        value={currentColor} 
                        onChange={(e) => onChange(e.target.value)} 
                        className="absolute -top-2 -left-2 w-12 h-12 p-0 border-0 cursor-pointer" 
                    />
                </div>
                <div className="flex-1 relative min-w-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary text-xs font-mono select-none">#</span>
                    <input
                        id={inputId}
                        type="text"
                        value={currentColor.replace('#', '').toUpperCase()}
                        onChange={handleHexChange}
                        className="w-full pl-5 pr-2 py-1.5 text-xs border border-border-default rounded bg-background-tertiary text-text-primary focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none font-mono transition-all uppercase"
                        maxLength={6}
                    />
                </div>
            </div>
        </div>
    );
};

const RightPanel: React.FC<RightPanelProps> = ({ 
    width,
    isResizing,
    onResizeStart,
    selectedContent, 
    selectedTarget, 
    onContentUpdate, 
    onTargetUpdate, 
    onNotify,
    assets = [],
    onAddAsset,
    sceneSettings,
    onSceneSettingsChange
}) => {
  const [formData, setFormData] = useState<Content | null>(null);
  const [scriptData, setScriptData] = useState<string>('');
  
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [openImagePicker, setOpenImagePicker] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{type: 'material' | 'image', name: string} | null>(null);

  const lastUpdateSource = useRef<'prop' | 'user'>('prop');
  const lastScriptUpdateSource = useRef<'prop' | 'user'>('prop');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    lastUpdateSource.current = 'prop';
    if (selectedContent) {
        const displayContent = JSON.parse(JSON.stringify(selectedContent));
        if (displayContent.transform) {
            displayContent.transform.position = displayContent.transform.position.map(round2) as [number, number, number];
            displayContent.transform.rotation = displayContent.transform.rotation.map(round2) as [number, number, number];
            displayContent.transform.scale = displayContent.transform.scale.map(round2) as [number, number, number];
        }
        setFormData(displayContent);
        setOpenImagePicker(false);
        // Reset selected material only if switching content
        if (displayContent.id !== formData?.id) {
            setSelectedMaterial(null);
        }
    } else {
        setFormData(null);
    }
  }, [selectedContent]);

  useLayoutEffect(() => {
    if (selectedTarget) {
      lastScriptUpdateSource.current = 'prop';
      setScriptData(selectedTarget.script || '');
    }
  }, [selectedTarget?.id, selectedTarget?.script]); 

  const debouncedFormData = useDebounce(formData, 400);
  const debouncedScriptData = useDebounce(scriptData, 600);

  useEffect(() => {
    if (debouncedFormData && lastUpdateSource.current === 'user' && !equal(debouncedFormData, selectedContent)) {
        onContentUpdate(debouncedFormData);
    }
  }, [debouncedFormData, onContentUpdate, selectedContent]); 

  useEffect(() => {
    if (selectedTarget && onTargetUpdate && lastScriptUpdateSource.current === 'user' && debouncedScriptData === scriptData) {
        onTargetUpdate({ ...selectedTarget, script: debouncedScriptData });
    }
  }, [debouncedScriptData, selectedTarget, onTargetUpdate, scriptData]);

  const handleTransformChange = (axis: 'x' | 'y' | 'z', type: 'position' | 'rotation' | 'scale', value: string) => {
    if (!formData) return;
    lastUpdateSource.current = 'user';
    const newTransform = { 
        position: [...formData.transform.position] as [number, number, number],
        rotation: [...formData.transform.rotation] as [number, number, number],
        scale: [...formData.transform.scale] as [number, number, number]
    };
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    const numValue = parseFloat(value);
    // @ts-ignore
    newTransform[type][axisIndex] = isNaN(numValue) ? 0 : numValue;
    const updatedContent = { ...formData, transform: newTransform };
    setFormData(updatedContent);
    onContentUpdate(updatedContent);
  };
  
  const handleGenericChange = (key: keyof Content, value: any) => {
    if (!formData) return;
    lastUpdateSource.current = 'user';
    setFormData({ ...formData, [key]: value });
  };

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      lastScriptUpdateSource.current = 'user';
      setScriptData(e.target.value);
  };

  // Material Editor Handlers
  const getMaterialProp = (matName: string, prop: keyof MaterialProperties) => {
      if (!formData || !formData.materialOverrides || !formData.materialOverrides[matName]) return undefined;
      return formData.materialOverrides[matName][prop];
  }

  const updateMaterialProp = (matName: string, prop: keyof MaterialProperties, value: any) => {
      if (!formData) return;
      lastUpdateSource.current = 'user';
      const currentOverrides = formData.materialOverrides || {};
      const currentMatProps = currentOverrides[matName] || {};
      
      const updatedOverrides = {
          ...currentOverrides,
          [matName]: {
              ...currentMatProps,
              [prop]: value
          }
      };
      
      setFormData({
          ...formData,
          materialOverrides: updatedOverrides
      });
  }

  const handleTextureOverride = (materialName: string, url: string) => {
      updateMaterialProp(materialName, 'map', url);
      setOpenImagePicker(false);
  };

  const handleImageSourceChange = (url: string) => {
      handleGenericChange('imageUrl', url);
      setOpenImagePicker(false);
  };

  const initiateUpload = (type: 'material' | 'image', name: string) => {
      setUploadTarget({ type, name });
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !uploadTarget) return;
      try {
          const url = await fileToBase64(file);
          if (onAddAsset) {
              onAddAsset({
                  id: `asset_${Date.now()}`,
                  name: file.name,
                  type: 'image',
                  url,
                  thumbnail: url 
              });
          }
          if (uploadTarget.type === 'material') {
              handleTextureOverride(uploadTarget.name, url);
          } else if (uploadTarget.type === 'image') {
              handleImageSourceChange(url);
          }
      } catch (e) {
          console.error("Upload failed", e);
          if (onNotify) onNotify("Failed to upload image.", 'error');
      }
      e.target.value = ''; 
      setUploadTarget(null);
  };

  const handleSceneSettingChange = (key: keyof SceneSettings, value: any) => {
      if (onSceneSettingsChange && sceneSettings) {
          onSceneSettingsChange({
              ...sceneSettings,
              [key]: value
          });
      }
  };

  const handleDirectionalLightPosChange = (index: number, value: string) => {
      if (onSceneSettingsChange && sceneSettings) {
          const newPos = [...sceneSettings.directionalLightPosition] as [number, number, number];
          newPos[index] = parseFloat(value) || 0;
          onSceneSettingsChange({
              ...sceneSettings,
              directionalLightPosition: newPos
          });
      }
  }

  return (
    <aside 
        style={{ width: width }}
        className={`bg-background-secondary border-l border-border-default flex flex-col flex-shrink-0 overflow-hidden shadow-lg z-10 relative ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
    >
      <div className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent-primary z-20" onMouseDown={onResizeStart} />
      <div className="p-4 border-b border-border-subtle flex-shrink-0">
        <h3 className="font-semibold text-text-primary">Properties</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 w-full">
        {formData ? (
          <>
            <section>
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Transform</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['x', 'y', 'z'].map((axis, i) => (
                      <div key={axis} className="flex items-center gap-1 border border-border-default rounded px-1 min-w-0 bg-background-tertiary">
                        <span className="text-[10px] text-text-tertiary font-bold flex-shrink-0">{axis.toUpperCase()}</span>
                        <input type="number" step="0.01" name={`transform-position-${axis}`} value={formData.transform.position[i] ?? 0} onChange={(e) => handleTransformChange(axis as any, 'position', e.target.value)} className="w-full text-xs py-1 focus:outline-none bg-transparent min-w-0 text-text-primary" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Rotation (deg)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['x', 'y', 'z'].map((axis, i) => (
                      <div key={axis} className="flex items-center gap-1 border border-border-default rounded px-1 min-w-0 bg-background-tertiary">
                        <span className="text-[10px] text-text-tertiary font-bold flex-shrink-0">{axis.toUpperCase()}</span>
                        <input type="number" step="0.01" name={`transform-rotation-${axis}`} value={formData.transform.rotation[i] ?? 0} onChange={(e) => handleTransformChange(axis as any, 'rotation', e.target.value)} className="w-full text-xs py-1 focus:outline-none bg-transparent min-w-0 text-text-primary" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Scale</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['x', 'y', 'z'].map((axis, i) => (
                      <div key={axis} className="flex items-center gap-1 border border-border-default rounded px-1 min-w-0 bg-background-tertiary">
                        <span className="text-[10px] text-text-tertiary font-bold flex-shrink-0">{axis.toUpperCase()}</span>
                        <input type="number" step="0.01" name={`transform-scale-${axis}`} value={formData.transform.scale[i] ?? 1} onChange={(e) => handleTransformChange(axis as any, 'scale', e.target.value)} className="w-full text-xs py-1 focus:outline-none bg-transparent min-w-0 text-text-primary" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="border-t border-border-subtle pt-6">
               <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                 {formData.type === ContentType.VIDEO ? 'Video Clip Settings' : 'Content Settings'}
               </h4>
               <div className="grid grid-cols-2 gap-x-2 gap-y-2 mb-6">
                   <div className="flex items-center gap-2">
                      <input type="checkbox" id="prop-visible" checked={formData.visible ?? true} onChange={(e) => handleGenericChange('visible', e.target.checked)} className="h-4 w-4 flex-shrink-0 rounded border-border-default bg-background-tertiary" />
                      <label htmlFor="prop-visible" className="text-sm text-text-primary truncate">Visible</label>
                   </div>
                   <div className="flex items-center gap-2">
                      <input type="checkbox" id="prop-billboard" checked={formData.alwaysFacingUser ?? false} onChange={(e) => handleGenericChange('alwaysFacingUser', e.target.checked)} className="h-4 w-4 flex-shrink-0 rounded border-border-default bg-background-tertiary" />
                      <label htmlFor="prop-billboard" className="text-sm text-text-primary truncate">Billboard</label>
                   </div>
               </div>

               {formData.type === ContentType.STREAMING_VIDEO && (
                   <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-2 uppercase font-bold tracking-tighter">Video Service</label>
                            <div className="flex p-1 bg-gray-100 rounded-lg">
                                <button 
                                    onClick={() => handleGenericChange('streamingService', 'youtube')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.streamingService === 'youtube' || !formData.streamingService ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <YoutubeIcon className="w-4 h-4" /> YouTube
                                </button>
                                <button 
                                    onClick={() => handleGenericChange('streamingService', 'vimeo')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.streamingService === 'vimeo' ? 'bg-white shadow text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <VideoIcon className="w-4 h-4" /> Vimeo
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="video-url-input" className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-tighter">
                                {(formData.streamingService === 'vimeo') ? 'Vimeo ID / URL' : 'YouTube ID / URL'}
                            </label>
                            <input 
                                id="video-url-input"
                                type="text" 
                                value={formData.videoUrl || ''} 
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (formData.streamingService === 'vimeo') {
                                        const vimeoRegExp = /vimeo\.com\/(\d+)/;
                                        const vimeoMatch = val.match(vimeoRegExp);
                                        if (vimeoMatch && vimeoMatch[1]) val = vimeoMatch[1];
                                    } else {
                                        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                        const ytMatch = val.match(ytRegExp);
                                        if (ytMatch && ytMatch[2] && ytMatch[2].length === 11) val = ytMatch[2];
                                    }
                                    handleGenericChange('videoUrl', val);
                                }}
                                className="w-full px-2 py-2 text-sm border rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder={formData.streamingService === 'vimeo' ? "e.g. 123456789" : "e.g. Y_plhk1FUQA"} 
                            />
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border space-y-3">
                            <h5 className="text-[10px] font-bold text-gray-400 uppercase">Playback Options</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="v-auto" checked={formData.autoplay ?? false} onChange={(e) => handleGenericChange('autoplay', e.target.checked)} className="h-4 w-4" />
                                    <label htmlFor="v-auto" className="text-xs text-gray-700">Autoplay</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="v-loop" checked={formData.loop ?? false} onChange={(e) => handleGenericChange('loop', e.target.checked)} className="h-4 w-4" />
                                    <label htmlFor="v-loop" className="text-xs text-gray-700">Loop</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="v-mute" checked={formData.muted ?? false} onChange={(e) => handleGenericChange('muted', e.target.checked)} className="h-4 w-4" />
                                    <label htmlFor="v-mute" className="text-xs text-gray-700">Muted</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="v-ctrl" checked={formData.videoControls ?? true} onChange={(e) => handleGenericChange('videoControls', e.target.checked)} className="h-4 w-4" />
                                    <label htmlFor="v-ctrl" className="text-xs text-gray-700">Controls</label>
                                </div>
                            </div>
                            <div className="border-t pt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="v-click" checked={formData.videoClickToggle ?? true} onChange={(e) => handleGenericChange('videoClickToggle', e.target.checked)} className="h-4 w-4" />
                                    <label htmlFor="v-click" className="text-xs text-gray-700">Play/Pause on Click</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="v-fs" checked={formData.videoFullScreen ?? true} onChange={(e) => handleGenericChange('videoFullScreen', e.target.checked)} className="h-4 w-4" />
                                    <label htmlFor="v-fs" className="text-xs text-gray-700">Fullscreen</label>
                                </div>
                            </div>
                        </div>
                   </div>
               )}

               {formData.type === ContentType.IMAGE && (
                   <div className="space-y-4">
                        <div>
                           <label className="text-xs text-gray-400 block mb-2">Image Source</label>
                           <div 
                                className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center overflow-hidden relative cursor-pointer group"
                                onClick={() => setOpenImagePicker(!openImagePicker)}
                           >
                               <img src={formData.imageUrl} alt="Texture" className="w-full h-full object-contain" />
                               <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all">
                                   <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black/50 px-2 py-1 rounded">Change</span>
                               </div>
                           </div>
                           {openImagePicker && (
                                <div className="bg-gray-100 p-2 rounded text-xs mt-2 border border-gray-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-semibold text-gray-600">Select Image</p>
                                        <button onClick={() => setOpenImagePicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mb-2 max-h-40 overflow-y-auto p-1">
                                        {assets.filter(a => a.type === 'image').map(asset => (
                                            <div 
                                                key={asset.id} 
                                                className="aspect-square border border-gray-300 rounded overflow-hidden hover:border-blue-500 cursor-pointer bg-white"
                                                onClick={() => handleImageSourceChange(asset.url)}
                                                title={asset.name}
                                            >
                                                <img src={asset.url} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => initiateUpload('image', 'main')}
                                        className="w-full py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1 text-gray-700 font-medium transition-colors"
                                    >
                                        <ImageIcon className="w-3 h-3" /> Upload New
                                    </button>
                                </div>
                           )}
                       </div>
                   </div>
               )}

               {formData.type === ContentType.TEXT && (
                   <div className="space-y-4">
                       <div>
                           <label htmlFor="text-content-input" className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Content</label>
                           <textarea id="text-content-input" value={formData.textContent || ''} onChange={(e) => handleGenericChange('textContent', e.target.value)} className="w-full text-sm border border-gray-300 rounded p-2 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3">
                           <div>
                               <label htmlFor="font-family-select" className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Font Family</label>
                               <select id="font-family-select" value={formData.font || 'Arial'} onChange={(e) => handleGenericChange('font', e.target.value)} className="w-full text-xs border border-gray-300 rounded p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                   {Object.keys(FONT_MAP).map(f => <option key={f} value={f}>{f}</option>)}
                               </select>
                           </div>
                           <div>
                               <label htmlFor="font-size-input" className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Size</label>
                               <input id="font-size-input" type="number" min="1" value={formData.size || 50} onChange={(e) => handleGenericChange('size', parseInt(e.target.value))} className="w-full text-xs border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                           </div>
                       </div>

                       <div>
                           <label className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Style & Alignment</label>
                           <div className="flex gap-2">
                               <div className="flex bg-gray-100 rounded p-1 gap-1 border border-gray-200">
                                   <button 
                                        className={`p-1.5 rounded hover:bg-white transition-colors ${formData.weight === 'bold' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
                                        onClick={() => handleGenericChange('weight', formData.weight === 'bold' ? 'normal' : 'bold')}
                                        title="Bold"
                                   >
                                       <BoldIcon className="w-4 h-4" />
                                   </button>
                                   <button 
                                        className={`p-1.5 rounded hover:bg-white transition-colors ${formData.style === 'italic' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
                                        onClick={() => handleGenericChange('style', formData.style === 'italic' ? 'normal' : 'italic')}
                                        title="Italic"
                                   >
                                       <ItalicIcon className="w-4 h-4" />
                                   </button>
                               </div>
                               
                               <div className="w-px bg-gray-300 mx-1"></div>

                               <div className="flex bg-gray-100 rounded p-1 gap-1 border border-gray-200 flex-1 justify-center">
                                   {['left', 'center', 'right'].map((align) => (
                                       <button 
                                            key={align}
                                            className={`p-1.5 rounded hover:bg-white transition-colors flex-1 flex justify-center ${formData.align === align ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
                                            onClick={() => handleGenericChange('align', align)}
                                            title={`Align ${align.charAt(0).toUpperCase() + align.slice(1)}`}
                                       >
                                           {align === 'left' && <AlignLeftIcon className="w-4 h-4" />}
                                           {align === 'center' && <AlignCenterIcon className="w-4 h-4" />}
                                           {align === 'right' && <AlignRightIcon className="w-4 h-4" />}
                                       </button>
                                   ))}
                               </div>
                           </div>
                       </div>

                       <div className="space-y-4 pt-2 border-t border-dashed">
                            <ColorInput 
                                label="Text Color" 
                                value={formData.color} 
                                onChange={(val) => handleGenericChange('color', val)} 
                            />
                            
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="outline-width-input" className="text-xs text-gray-500 font-bold uppercase tracking-wider">Outline Color</label>
                                    <span className="text-[10px] text-gray-400">Width: {formData.outlineWidth || 0}%</span>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <ColorInput 
                                            label="" 
                                            value={formData.outlineColor} 
                                            onChange={(val) => handleGenericChange('outlineColor', val)} 
                                            fallback="#000000"
                                            id="text-outline-color"
                                        />
                                    </div>
                                    <div className="w-20 pb-1">
                                         <input 
                                            id="outline-width-input"
                                            type="range" 
                                            min="0" 
                                            max="20" 
                                            step="0.5" 
                                            value={formData.outlineWidth || 0} 
                                            onChange={(e) => handleGenericChange('outlineWidth', parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                         />
                                    </div>
                                </div>
                            </div>
                       </div>
                   </div>
               )}

               {(formData.type === ContentType.VIDEO || formData.type === ContentType.AUDIO) && (
                   <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="setting-autoplay" className="text-sm text-gray-700">Autoplay</label>
                            <input id="setting-autoplay" type="checkbox" checked={formData.autoplay ?? false} onChange={(e) => handleGenericChange('autoplay', e.target.checked)} className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="setting-loop" className="text-sm text-gray-700">Loop</label>
                            <input id="setting-loop" type="checkbox" checked={formData.loop ?? false} onChange={(e) => handleGenericChange('loop', e.target.checked)} className="h-4 w-4" />
                        </div>
                        {formData.type === ContentType.VIDEO && (
                            <>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="setting-muted" className="text-sm text-gray-700">Muted</label>
                                    <input id="setting-muted" type="checkbox" checked={formData.muted ?? false} onChange={(e) => handleGenericChange('muted', e.target.checked)} className="h-4 w-4" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="setting-click-toggle" className="text-sm text-gray-700">Toggle Play on Click</label>
                                    <input id="setting-click-toggle" type="checkbox" checked={formData.videoClickToggle ?? false} onChange={(e) => handleGenericChange('videoClickToggle', e.target.checked)} className="h-4 w-4" />
                                </div>
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="setting-chroma-key" className="text-sm font-medium">Chroma Key</label>
                                        <input id="setting-chroma-key" type="checkbox" checked={formData.chromaKey ?? false} onChange={(e) => handleGenericChange('chromaKey', e.target.checked)} className="h-4 w-4" />
                                    </div>
                                    {formData.chromaKey && (
                                        <ColorInput 
                                            label="Key Color" 
                                            value={formData.chromaColor} 
                                            onChange={(val) => handleGenericChange('chromaColor', val)}
                                            fallback="#00FF00"
                                            id="chroma-key-color"
                                        />
                                    )}
                                </div>
                            </>
                        )}
                   </div>
               )}

               {formData.type === ContentType.MODEL && (
                   <div className="space-y-4">
                       <div className="flex items-center justify-between">
                            <label htmlFor="model-auto-animate" className="text-sm text-gray-700">Auto-animate</label>
                            <input id="model-auto-animate" type="checkbox" checked={formData.animateAutostart ?? false} onChange={(e) => handleGenericChange('animateAutostart', e.target.checked)} className="h-4 w-4" />
                        </div>
                        <div>
                            <label htmlFor="model-loop-mode" className="text-xs text-gray-400 block mb-1">Loop Mode</label>
                            <select id="model-loop-mode" value={formData.animateLoop || 'repeat'} onChange={(e) => handleGenericChange('animateLoop', e.target.value)} className="w-full text-xs border rounded p-1 bg-transparent">
                                <option value="once">Once</option>
                                <option value="repeat">Repeat</option>
                                <option value="pingpong">Ping-Pong</option>
                            </select>
                        </div>
                        
                        {formData.materialNames && formData.materialNames.length > 0 && (
                            <div className="border-t pt-4 mt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Material Editor</h4>
                                
                                {/* Material Selector */}
                                <div className="mb-4">
                                    <label htmlFor="material-selector" className="text-xs text-gray-400 block mb-1">Select Material</label>
                                    <select 
                                        id="material-selector"
                                        value={selectedMaterial || ''} 
                                        onChange={(e) => {
                                            setSelectedMaterial(e.target.value || null);
                                            setOpenImagePicker(false);
                                        }} 
                                        className="w-full text-xs border rounded p-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">-- Choose Material to Edit --</option>
                                        {formData.materialNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedMaterial && (
                                    <div className="space-y-4 bg-gray-50 p-3 rounded-lg border">
                                        {/* Color (Albedo) */}
                                        <ColorInput 
                                            label="Base Color"
                                            value={getMaterialProp(selectedMaterial, 'color') as string}
                                            onChange={(val) => updateMaterialProp(selectedMaterial, 'color', val)}
                                            fallback="#FFFFFF"
                                            id="material-base-color"
                                        />

                                        <div>
                                            <label className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Texture</label>
                                            <div 
                                                className="w-full h-8 border rounded bg-white flex items-center px-2 cursor-pointer text-xs text-gray-500 hover:bg-gray-100"
                                                onClick={() => setOpenImagePicker(!openImagePicker)}
                                            >
                                                {getMaterialProp(selectedMaterial, 'map') ? 'Texture Set' : 'No Texture'}
                                            </div>
                                            {/* Image Picker for Texture */}
                                            {openImagePicker && (
                                                <div className="bg-white p-2 rounded text-xs mt-2 border border-gray-300 shadow-sm">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="font-semibold text-gray-600">Select Texture</p>
                                                        <button onClick={() => setOpenImagePicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2 mb-2 max-h-32 overflow-y-auto p-1">
                                                        <div 
                                                            className="aspect-square border border-gray-300 rounded flex items-center justify-center hover:border-red-500 cursor-pointer bg-gray-100 text-gray-400 text-[9px] text-center"
                                                            onClick={() => updateMaterialProp(selectedMaterial, 'map', '')}
                                                            title="Remove Texture"
                                                        >
                                                            None
                                                        </div>
                                                        {assets.filter(a => a.type === 'image').map(asset => (
                                                            <img 
                                                                key={asset.id} 
                                                                src={asset.url} 
                                                                className="aspect-square object-cover border border-gray-300 rounded hover:border-blue-500 cursor-pointer bg-white"
                                                                onClick={() => handleTextureOverride(selectedMaterial, asset.url)}
                                                                title={asset.name}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="relative">
                                                        <button 
                                                            onClick={() => initiateUpload('material', selectedMaterial)}
                                                            className="w-full py-1 bg-gray-50 border rounded hover:bg-gray-100 flex items-center justify-center gap-1 text-gray-700"
                                                        >
                                                            <ImageIcon className="w-3 h-3" /> Upload New
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Metalness & Roughness */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label htmlFor="material-metalness" className="text-xs text-gray-500 font-bold block mb-1">Metalness</label>
                                                <input 
                                                    id="material-metalness"
                                                    type="range" min="0" max="1" step="0.05"
                                                    value={(getMaterialProp(selectedMaterial, 'metalness') as number) ?? 0}
                                                    onChange={(e) => updateMaterialProp(selectedMaterial, 'metalness', parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="material-roughness" className="text-xs text-gray-500 font-bold block mb-1">Roughness</label>
                                                <input 
                                                    id="material-roughness"
                                                    type="range" min="0" max="1" step="0.05"
                                                    value={(getMaterialProp(selectedMaterial, 'roughness') as number) ?? 1}
                                                    onChange={(e) => updateMaterialProp(selectedMaterial, 'roughness', parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                />
                                            </div>
                                        </div>

                                        {/* Opacity */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label htmlFor="material-opacity" className="text-xs text-gray-500 font-bold">Opacity</label>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="checkbox" 
                                                        id="mat-trans" 
                                                        checked={(getMaterialProp(selectedMaterial, 'transparent') as boolean) ?? false}
                                                        onChange={(e) => updateMaterialProp(selectedMaterial, 'transparent', e.target.checked)}
                                                    />
                                                    <label htmlFor="mat-trans" className="text-[10px] text-gray-400">Transparent</label>
                                                </div>
                                            </div>
                                            <input 
                                                id="material-opacity"
                                                type="range" min="0" max="1" step="0.05"
                                                value={(getMaterialProp(selectedMaterial, 'opacity') as number) ?? 1}
                                                onChange={(e) => updateMaterialProp(selectedMaterial, 'opacity', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                        </div>

                                        {/* Emissive */}
                                        <ColorInput 
                                            label="Emissive"
                                            value={getMaterialProp(selectedMaterial, 'emissive') as string}
                                            onChange={(val) => updateMaterialProp(selectedMaterial, 'emissive', val)}
                                            fallback="#000000"
                                            id="material-emissive-color"
                                        />

                                        {/* Wireframe */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                            <input 
                                                type="checkbox" 
                                                id="mat-wire" 
                                                checked={(getMaterialProp(selectedMaterial, 'wireframe') as boolean) ?? false}
                                                onChange={(e) => updateMaterialProp(selectedMaterial, 'wireframe', e.target.checked)}
                                            />
                                            <label htmlFor="mat-wire" className="text-xs text-gray-700">Wireframe</label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                   </div>
               )}
            </section>
          </>
        ) : selectedTarget ? (
          <div className="space-y-6">
            <section>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Image Target Settings</h4>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-2">Tracker Image</label>
                        <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                            {selectedTarget.imageUrl ? <img src={selectedTarget.imageUrl} alt="Tracker" className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400">No Image</span>}
                        </div>
                    </div>
                </div>
            </section>
            <section className="border-t pt-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Scripting</h4>
              <textarea id="script-editor" value={scriptData} onChange={handleScriptChange} className="w-full h-[300px] text-[11px] font-mono border rounded p-2 bg-gray-50 focus:bg-white transition-colors" spellCheck={false} placeholder="// function onUpdate({target, deltaTime}) { ... }" />
            </section>
          </div>
        ) : (
          <div className="space-y-6">
             <section>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Scene Settings</h4>
                {sceneSettings && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="scene-ambient-intensity" className="text-xs text-gray-400 block mb-1">Ambient Light Intensity</label>
                            <input 
                                id="scene-ambient-intensity"
                                type="range" min="0" max="2" step="0.1"
                                value={sceneSettings.ambientLightIntensity ?? 0.8}
                                onChange={(e) => handleSceneSettingChange('ambientLightIntensity', parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="text-right text-xs text-gray-500">{sceneSettings.ambientLightIntensity}</div>
                        </div>
                        <div>
                            <label htmlFor="scene-directional-intensity" className="text-xs text-gray-400 block mb-1">Directional Light Intensity</label>
                            <input 
                                id="scene-directional-intensity"
                                type="range" min="0" max="3" step="0.1"
                                value={sceneSettings.directionalLightIntensity ?? 1.5}
                                onChange={(e) => handleSceneSettingChange('directionalLightIntensity', parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="text-right text-xs text-gray-500">{sceneSettings.directionalLightIntensity}</div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Light Position</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map((axis, i) => (
                                    <div key={axis} className="flex items-center gap-1 border rounded px-1 min-w-0">
                                        <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">{axis.toUpperCase()}</span>
                                        <input 
                                            type="number" step="1" 
                                            name={`scene-directional-pos-${axis}`}
                                            value={sceneSettings.directionalLightPosition[i] ?? 0} 
                                            onChange={(e) => handleDirectionalLightPosChange(i, e.target.value)} 
                                            className="w-full text-xs py-1 focus:outline-none bg-transparent min-w-0" 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="show-grid"
                                    checked={sceneSettings.showGrid}
                                    onChange={(e) => handleSceneSettingChange('showGrid', e.target.checked)}
                                />
                                <label htmlFor="show-grid" className="text-sm text-gray-700">Show Grid</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="show-axes"
                                    checked={sceneSettings.showAxes}
                                    onChange={(e) => handleSceneSettingChange('showAxes', e.target.checked)}
                                />
                                <label htmlFor="show-axes" className="text-sm text-gray-700">Show Axes</label>
                            </div>
                        </div>
                    </div>
                )}
             </section>
          </div>
        )}
      </div>
      <input id="right-panel-file-upload" type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
    </aside>
  );
};

export default RightPanel;
