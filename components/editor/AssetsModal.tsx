
import React, { useState, useCallback, useRef } from 'react';
import { XMarkIcon, UploadIcon, ImageIcon, FileIcon, VideoIcon, AudioIcon, CubeIcon, ChevronLeftIcon, PlusIcon } from '../icons/Icons';
import { Asset } from '../../types';
import { fileToBase64 } from '../../utils/storage';

// Placeholders
const PLACEHOLDER_MIND = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciI+PHJlY3QgeD0iMjAiIHk9IjIwIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSI1IiBmaWxsPSIjZjBmZGY0IiBzdHJva2U9IiMxNmEzNGEiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0zNSA1MGwxMCAxMCAyMC0yMCIgc3Ryb2tlPSIjMTZhMzRhIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjx0ZXh0IHg9IjUwIiB5PSI5MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzE2YTM0YSI+TUlORDwvdGV4dD48L3N2Zz4=";
const PLACEHOLDER_SCRIPT = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciI+PHJlY3QgeD0iMjAiIHk9IjIwIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSI1IiBmaWxsPSIjZmVmY2U4IiBzdHJva2U9IiNjYThhMDQiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0zNSA1MGwxMCAxMCAyMC0yMCIgc3Ryb2tlPSIjMTZhMzRhIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjx0ZXh0IHg9IjUwIiB5PSI5MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzE2YTM0YSI+SlM8L3RleHQ+PC9zdmc+";

interface AssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTarget: (asset: Asset) => void;
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
}

type ViewMode = 'library' | 'upload-image' | 'upload-video' | 'upload-model' | 'upload-audio';

const getUniqueName = (baseName: string, existingNames: string[]): string => {
  if (!existingNames.includes(baseName)) return baseName;
  let name = baseName;
  let counter = 1;
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

const UploadImageView = ({ onBack, onAdd, assets }: { onBack: () => void, onAdd: (asset: Asset) => void, assets: Asset[] }) => {
    const [name, setName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (file: File) => {
        if (!file.type.startsWith('image/')) { alert("Invalid image file."); return; }
        setSelectedFile(file);
        if (!name) setName(file.name.replace(/\.[^/.]+$/, ""));
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleAdd = async () => {
        if (!selectedFile) return;
        try {
            let imageUrl = await fileToBase64(selectedFile);
            const assetName = getUniqueName(name || 'Untitled', assets.map(a => a.name));
            onAdd({
                id: `asset_${Date.now()}`,
                name: assetName,
                type: 'image',
                url: imageUrl,
                thumbnail: imageUrl
            });
            onBack();
        } catch (e) { alert("Failed to process file."); }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeftIcon className="w-5 h-5 text-gray-600" /></button>
                <h4 className="font-bold text-gray-800">Upload Image</h4>
            </div>
            <div className="flex-1 space-y-4">
                <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Image File</label>
                    <div 
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
                        className={`border-2 border-dashed rounded-md h-40 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500 hover:bg-white'}`}
                    >
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-contain" /> : <div className="text-center text-gray-400"><ImageIcon className="w-8 h-8 mx-auto mb-1" /><span className="text-xs">Drop image here</span></div>}
                    </div>
                    <input id="upload-image-file" name="upload-image-file" type="file" ref={inputRef} onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} accept="image/*" className="hidden" />
                </div>
                <input id="upload-image-name" name="upload-image-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Asset Name" className="w-full px-3 py-2 border rounded-md" />
                <p className="text-xs text-gray-500">
                    This image can be used as a Target (for tracking) or as content (displayed in the scene).
                </p>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
                <button onClick={handleAdd} disabled={!selectedFile} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">Upload Image</button>
            </div>
        </div>
    );
};

const UploadFileView = ({ onBack, onAdd, assets, type, title, icon, accept }: { onBack: () => void, onAdd: (asset: Asset) => void, assets: Asset[], type: Asset['type'], title: string, icon: React.ReactNode, accept: string }) => {
    const [name, setName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (file: File) => {
        setSelectedFile(file);
        if (!name) setName(file.name.replace(/\.[^/.]+$/, ""));
        if (type === 'image' || type === 'video') {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleAdd = async () => {
        if (!selectedFile) return;
        try {
            const url = await fileToBase64(selectedFile);
            const assetName = getUniqueName(name || 'Untitled', assets.map(a => a.name));
            onAdd({
                id: `asset_${Date.now()}`,
                name: assetName,
                type,
                url,
                thumbnail: type === 'image' ? url : undefined
            });
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            onBack();
        } catch (e) { alert("Failed to process file."); }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeftIcon className="w-5 h-5 text-gray-600" /></button>
                <h4 className="font-bold text-gray-800">{title}</h4>
            </div>
            <div className="flex-1 space-y-4">
                <div 
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
                    className={`border-2 border-dashed rounded-md h-40 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500 hover:bg-white'}`}
                >
                    {previewUrl && type === 'image' && <img src={previewUrl} className="w-full h-full object-contain" />}
                    {previewUrl && type === 'video' && <video src={previewUrl} className="w-full h-full object-contain pointer-events-none" muted />}
                    {!previewUrl && <div className="text-center text-gray-400">{icon}<span className="text-xs block mt-1">{selectedFile ? selectedFile.name : "Drop file here"}</span></div>}
                </div>
                <input id={`upload-${type}-file`} name={`upload-${type}-file`} type="file" ref={inputRef} onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} accept={accept} className="hidden" />
                <input id={`upload-${type}-name`} name={`upload-${type}-name`} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Asset Name" className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
                <button onClick={handleAdd} disabled={!selectedFile} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">Upload</button>
            </div>
        </div>
    );
};

export const AssetsModal: React.FC<AssetsModalProps> = ({ isOpen, onClose, onAddTarget, assets, onAddAsset }) => {
  const [view, setView] = useState<ViewMode>('library');
  const genericInputRef = useRef<HTMLInputElement>(null);

  const handleGenericFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const existingNames = assets.map(a => a.name);
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
              const url = await fileToBase64(file);
              let type: Asset['type'] = 'image';
              let thumbnail: string | undefined = url;
              if (file.type.startsWith('image/')) type = 'image';
              else if (file.type.startsWith('video/')) { type = 'video'; thumbnail = undefined; }
              else if (file.type.startsWith('audio/')) { type = 'audio'; thumbnail = undefined; }
              else if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) { type = 'model'; thumbnail = undefined; }
              else if (file.name.endsWith('.js')) { type = 'script'; thumbnail = PLACEHOLDER_SCRIPT; }
              else if (file.name.endsWith('.mind')) { type = 'mind'; thumbnail = PLACEHOLDER_MIND; }
              else continue;
              const name = getUniqueName(file.name, existingNames);
              existingNames.push(name);
              onAddAsset({ id: `asset_${Date.now()}_${i}`, name, type, url, thumbnail });
          } catch (err) { console.error(err); }
      }
      e.target.value = '';
  }

  const handleAssetClick = async (asset: Asset) => {
      // In the new workflow, we just add the asset to the scene. 
      // If it's an image, it becomes a target (uncompiled) or image content.
      // Editor.tsx handles the logic of "Create Target from Asset" vs "Add Content".
      onAddTarget(asset);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h3 className="text-xl font-bold text-gray-800">Asset Manager</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        
        {view === 'library' ? (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button onClick={() => setView('upload-image')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 border border-blue-200 transition-colors font-medium text-sm whitespace-nowrap">
                        <ImageIcon className="w-4 h-4" /> Upload Image
                    </button>
                    <button onClick={() => setView('upload-video')} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 border border-purple-200 transition-colors font-medium text-sm whitespace-nowrap">
                        <VideoIcon className="w-4 h-4" /> New Video Clip
                    </button>
                    <button onClick={() => setView('upload-model')} className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 border border-orange-200 transition-colors font-medium text-sm whitespace-nowrap">
                        <CubeIcon className="w-4 h-4" /> New 3D Model
                    </button>
                    <button onClick={() => setView('upload-audio')} className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-md hover:bg-pink-100 border border-pink-200 transition-colors font-medium text-sm whitespace-nowrap">
                        <AudioIcon className="w-4 h-4" /> New Audio
                    </button>
                    <button onClick={() => genericInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 border border-gray-200 transition-colors font-medium text-sm whitespace-nowrap ml-auto">
                        <UploadIcon className="w-4 h-4" /> Batch Upload
                    </button>
                    <input id="batch-upload-input" name="batch-upload-input" type="file" ref={genericInputRef} className="hidden" multiple onChange={handleGenericFileUpload} />
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-100 rounded-md p-4 border border-inner">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {assets.map((asset, index) => (
                        <button 
                            key={`${asset.id}-${index}`} 
                            onClick={() => handleAssetClick(asset)}
                            className="group relative bg-white border rounded-md p-2 flex flex-col justify-between items-start hover:shadow-lg hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title={asset.name}
                        >
                            <div className="w-full h-24 mb-2 bg-gray-50 rounded-md overflow-hidden relative flex items-center justify-center">
                                {asset.type === 'video' && <div className="w-full h-full flex items-center justify-center bg-purple-50"><VideoIcon className="w-10 h-10 text-purple-300" /></div>}
                                {asset.type === 'audio' && <div className="w-full h-full flex items-center justify-center bg-pink-50"><AudioIcon className="w-10 h-10 text-pink-300" /></div>}
                                {asset.type === 'model' && <div className="w-full h-full flex items-center justify-center bg-orange-50"><CubeIcon className="w-10 h-10 text-orange-300" /></div>}
                                {asset.type === 'script' && <img src={asset.thumbnail || PLACEHOLDER_SCRIPT} className="w-12 h-12 object-contain opacity-80" />}
                                {(asset.type === 'image' || asset.type === 'mind') && <img src={asset.thumbnail || asset.url || PLACEHOLDER_MIND} alt={asset.name} className="w-full h-full object-contain" />}
                                <div className={`absolute top-1 right-1 text-white text-[8px] px-1.5 py-0.5 rounded shadow-sm font-bold uppercase ${asset.type === 'mind' ? 'bg-green-500' : asset.type === 'video' ? 'bg-purple-500' : asset.type === 'model' ? 'bg-orange-500' : asset.type === 'audio' ? 'bg-pink-500' : asset.type === 'image' ? 'bg-blue-400' : 'bg-gray-500'}`}>
                                    {asset.type === 'video' ? 'Clip' : asset.type}
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-700 font-medium w-full text-center truncate px-1">{asset.name}</p>
                        </button>
                        ))}
                        {assets.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-10">
                                <p className="text-sm italic">Library is empty. Drag and drop assets above to start.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex-1 min-h-0 bg-gray-50 rounded-lg p-6 border border-gray-200">
                {view === 'upload-image' && <UploadImageView onBack={() => setView('library')} onAdd={onAddAsset} assets={assets} />}
                {view === 'upload-video' && <UploadFileView onBack={() => setView('library')} onAdd={onAddAsset} assets={assets} type="video" title="Upload Video Clip" icon={<VideoIcon className="w-8 h-8 mx-auto" />} accept="video/*" />}
                {view === 'upload-model' && <UploadFileView onBack={() => setView('library')} onAdd={onAddAsset} assets={assets} type="model" title="Upload 3D Model" icon={<CubeIcon className="w-8 h-8 mx-auto" />} accept=".glb,.gltf" />}
                {view === 'upload-audio' && <UploadFileView onBack={() => setView('library')} onAdd={onAddAsset} assets={assets} type="audio" title="Upload Audio" icon={<AudioIcon className="w-8 h-8 mx-auto" />} accept="audio/*" />}
            </div>
        )}
      </div>
    </div>
  );
};

export default AssetsModal;
