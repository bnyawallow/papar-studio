import React from 'react';
import { XMarkIcon } from '../icons/Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col h-[80vh]">
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <h3 className="text-xl font-semibold text-gray-800">Scripting API Reference</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
            <div className="prose prose-sm max-w-none">
                <p>Use JavaScript to add interactivity. The script has access to the following lifecycle functions and API methods.</p>
                
                <h4 className="font-bold mt-4 mb-2">Lifecycle Functions</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li><code>function onInit({'{ target, data }'})</code>: Called once when the scene starts.</li>
                    <li><code>function onUpdate({'{ target, data, time, deltaTime }'})</code>: Called every frame.</li>
                    <li><code>function onClick({'{ target, data, object }'})</code>: Called when an object is clicked.</li>
                    <li><code>function onActivate({'{ target, data }'})</code>: Called when tracking is found/started.</li>
                    <li><code>function onDeactivate({'{ target, data }'})</code>: Called when tracking is lost/stopped.</li>
                </ul>

                <h4 className="font-bold mt-4 mb-2">Target API</h4>
                <p className="text-gray-600 mb-2">The <code>target</code> object represents the scene manager.</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li><code>target.getObject(name)</code>: Returns a content object by name.</li>
                    <li><code>target.captureScreen()</code>: Takes a screenshot and downloads it.</li>
                    <li><code>target.openUrl(url)</code>: Opens a URL in a new tab.</li>
                </ul>

                <h4 className="font-bold mt-4 mb-2">Content Object API</h4>
                <p className="text-gray-600 mb-2">Returned by <code>target.getObject()</code>.</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li><code>obj.visible</code>: Get/Set visibility (boolean).</li>
                    <li><code>obj.position</code>: Get/Set position <code>{'{x, y, z}'}</code>.</li>
                    <li><code>obj.rotation</code>: Get/Set rotation in degrees <code>{'{x, y, z}'}</code>.</li>
                    <li><code>obj.scale</code>: Get/Set scale <code>{'{x, y, z}'}</code>.</li>
                    <li><code>obj.loop</code>: Get/Set video loop status (boolean).</li>
                    <li><code>obj.setPosition(x, y, z)</code>: Update position.</li>
                    <li><code>obj.setRotation(x, y, z)</code>: Update rotation (degrees).</li>
                    <li><code>obj.setScale(x, y, z)</code>: Update scale.</li>
                    <li><code>obj.playVideo()</code>: Play video/embed.</li>
                    <li><code>obj.pauseVideo()</code>: Pause video/embed.</li>
                    <li><code>obj.stopVideo()</code>: Stop and reset video.</li>
                    <li><code>obj.seekTo(seconds)</code>: Jump to a specific time.</li>
                    <li><code>obj.setVolume(0 to 1)</code>: Set video volume level.</li>
                    <li><code>obj.setMuted(boolean)</code>: Mute/unmute video.</li>
                    <li><code>obj.setLoop(boolean)</code>: Set video loop status.</li>
                    <li><code>obj.setFullscreen(boolean)</code>: Toggle video fullscreen.</li>
                    <li><code>obj.isPlayingVideo()</code>: Check if video is currently playing.</li>
                    <li><code>obj.getAction(index | name)</code>: Get animation action to play().</li>
                    <li><code>obj.updateTexture(materialName, imageUrl)</code>: Change model texture dynamically.</li>
                </ul>

                <h4 className="font-bold mt-4 mb-2">Example Script</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto font-mono">
{`var speed = 50;

function onInit({target}) {
  // Hide the 'secret' object
  var secret = target.getObject('secret');
  if(secret) secret.setVisible(false);
}

function onUpdate({target, deltaTime}) {
  // Rotate 'logo' object
  var logo = target.getObject('logo');
  if(logo) {
    var r = logo.rotation;
    logo.setRotation(r.x, r.y + speed * deltaTime, r.z);
  }
}

function onClick({object, target}) {
  if(object.name === 'button') {
     // Control video via script
     var vid = target.getObject('myVideo');
     vid.playVideo();
     vid.setVolume(1.0);
     vid.setFullscreen(true);
     vid.loop = true; // Enable looping
  }
}`}
                </pre>
            </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;