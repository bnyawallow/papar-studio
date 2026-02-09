
import React, { useState } from 'react';
import { XMarkIcon } from '../icons/Icons';
import { MindARConfig } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MindARConfig;
  onUpdate: (newConfig: MindARConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onUpdate }) => {
  const [localConfig, setLocalConfig] = useState<MindARConfig>(config);

  if (!isOpen) return null;

  const handleChange = (key: keyof MindARConfig, value: number) => {
      setLocalConfig(prev => ({
          ...prev,
          [key]: value
      }));
  };

  const handleSave = () => {
      onUpdate(localConfig);
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h3 className="text-xl font-bold text-gray-800">Project Settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        
        <div className="space-y-4">
            <div>
                <label htmlFor="setting-max-track" className="block text-sm font-medium text-gray-700 mb-1">Max Tracked Targets</label>
                <input 
                    id="setting-max-track"
                    name="setting-max-track"
                    type="number" 
                    min="1" 
                    max="5" 
                    value={localConfig.maxTrack} 
                    onChange={(e) => handleChange('maxTrack', parseInt(e.target.value))}
                    className="w-full border rounded-md p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Number of targets that can be tracked simultaneously (1-5).</p>
            </div>

            <div>
                <label htmlFor="setting-warmup" className="block text-sm font-medium text-gray-700 mb-1">Warmup Tolerance</label>
                <input 
                    id="setting-warmup"
                    name="setting-warmup"
                    type="number" 
                    min="0" 
                    value={localConfig.warmupTolerance} 
                    onChange={(e) => handleChange('warmupTolerance', parseInt(e.target.value))}
                    className="w-full border rounded-md p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Wait frames before tracking happens.</p>
            </div>

            <div>
                <label htmlFor="setting-miss" className="block text-sm font-medium text-gray-700 mb-1">Miss Tolerance</label>
                <input 
                    id="setting-miss"
                    name="setting-miss"
                    type="number" 
                    min="0" 
                    value={localConfig.missTolerance} 
                    onChange={(e) => handleChange('missTolerance', parseInt(e.target.value))}
                    className="w-full border rounded-md p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Number of frames to wait before calling target lost.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="setting-filter-mincf" className="block text-sm font-medium text-gray-700 mb-1">Filter MinCF</label>
                    <input 
                        id="setting-filter-mincf"
                        name="setting-filter-mincf"
                        type="number" 
                        step="0.0001"
                        value={localConfig.filterMinCF} 
                        onChange={(e) => handleChange('filterMinCF', parseFloat(e.target.value))}
                        className="w-full border rounded-md p-2"
                    />
                </div>
                <div>
                    <label htmlFor="setting-filter-beta" className="block text-sm font-medium text-gray-700 mb-1">Filter Beta</label>
                    <input 
                        id="setting-filter-beta"
                        name="setting-filter-beta"
                        type="number" 
                        step="0.0001"
                        value={localConfig.filterBeta} 
                        onChange={(e) => handleChange('filterBeta', parseFloat(e.target.value))}
                        className="w-full border rounded-md p-2"
                    />
                </div>
            </div>
            <p className="text-xs text-gray-500">Filters reduce jittering. Lower MinCF = more smoothing.</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
