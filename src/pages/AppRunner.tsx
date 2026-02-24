import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getProjectById, getProjectBySlug } from '../services/projectService';
import { Project } from '../../types';
import { generateAFrameHtml } from '../../utils/exportUtils';

interface DebugState {
  mindarLoaded: boolean;
  mindarLoading: boolean;
  mindarError: string | null;
  cameraReady: boolean;
  targetsFound: number[];
  lastEvent: string;
  fps: number;
  loadingProgress: number;
}

const AppRunner: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;

  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugState, setDebugState] = useState<DebugState>({
    mindarLoaded: false,
    mindarLoading: true,
    mindarError: null,
    cameraReady: false,
    targetsFound: [],
    lastEvent: 'Initializing...',
    fps: 0,
    loadingProgress: 0
  });
  
  const debugRef = useRef<HTMLIFrameElement>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Helper to update debug state from iframe
  const updateDebugState = useCallback((event: string, data?: any) => {
    setDebugState(prev => {
      const newState = { ...prev, lastEvent: event };
      
      switch (event) {
        case 'mindarLoaded':
          newState.mindarLoaded = true;
          newState.mindarLoading = false;
          break;
        case 'mindarLoading':
          newState.mindarLoading = true;
          if (data?.progress !== undefined) {
            newState.loadingProgress = data.progress;
          }
          break;
        case 'mindarError':
          newState.mindarError = data?.error || 'Unknown error';
          newState.mindarLoading = false;
          break;
        case 'cameraReady':
          newState.cameraReady = true;
          break;
        case 'targetFound':
          if (data?.targetIndex !== undefined && !newState.targetsFound.includes(data.targetIndex)) {
            newState.targetsFound = [...newState.targetsFound, data.targetIndex];
          }
          break;
        case 'targetLost':
          if (data?.targetIndex !== undefined) {
            newState.targetsFound = newState.targetsFound.filter(i => i !== data.targetIndex);
          }
          break;
        case 'fps':
          newState.fps = data?.fps || 0;
          break;
      }
      
      return newState;
    });
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchApp = async () => {
      try {
        setLoading(true);
        
        // Try to find project by ID first, then by slug
        let project = await getProjectById(id);
        
        // If not found by ID, try slug (for /apps/project-name URLs)
        if (!project) {
          project = await getProjectBySlug(id);
        }

        if (!project) {
          setError("Project not found. The project may not exist or has not been published yet.");
          setLoading(false);
          return;
        }

        let mindFileUrl = project.targets[0]?.mindFileUrl;

        if (!mindFileUrl) {
          setError("Project targets have not been compiled. Please open the editor and Compile before publishing.");
          setLoading(false);
          return;
        }

        // Generate HTML using the export utility
        const generatedHtml = generateAFrameHtml(project, undefined, mindFileUrl);
        
        // Inject debug message listener
        const htmlWithDebug = generatedHtml.replace(
          '</body>',
          `<script>
            // Listen for debug messages from the AR app
            window.addEventListener('message', function(e) {
              if (e.data && e.data.type === 'debug') {
                console.log('[AR Debug]', e.data.message, e.data.data);
              }
            });
            
            // FPS tracking - report to parent
            let frameCount = 0;
            let lastTime = performance.now();
            function reportFPS() {
              const now = performance.now();
              const delta = now - lastTime;
              if (delta >= 1000) {
                const fps = Math.round((frameCount * 1000) / delta);
                window.parent.postMessage({ type: 'debug', message: 'fps', data: { fps } }, '*');
                frameCount = 0;
                lastTime = now;
              }
              frameCount++;
              requestAnimationFrame(reportFPS);
            }
            // Start FPS reporting after a short delay to let AR init
            setTimeout(() => { reportFPS(); }, 2000);
          </script></body>`
        );

        setHtml(htmlWithDebug);
      } catch (err) {
        setError("Failed to load project.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [id]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'debug') {
        updateDebugState(event.data.message, event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateDebugState]);

  // Calculate FPS periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      setDebugState(prev => ({ ...prev, fps }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse">Loading AR Experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-6 bg-gray-800 rounded-lg shadow-xl max-w-md">
            <h1 className="text-2xl font-bold mb-2 text-red-500">Error</h1>
            <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Main AR Experience */}
      <iframe
        ref={debugRef}
        srcDoc={html}
        title="AR Experience"
        style={{ width: '100vw', height: '100vh', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      
      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="absolute top-4 right-4 z-50 px-3 py-2 bg-gray-800 bg-opacity-70 text-white text-xs rounded-md hover:bg-opacity-90 transition-opacity"
      >
        {showDebug ? 'Hide Debug' : 'Show Debug'}
      </button>
      
      {/* Debug Overlay */}
      {showDebug && (
        <div className="absolute top-16 right-4 z-50 w-72 bg-black bg-opacity-85 text-green-400 text-xs font-mono p-3 rounded-lg border border-green-600">
          <div className="border-b border-green-600 pb-2 mb-2 font-bold text-green-300">
            MindAR Debug
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Library:</span>
              <span className={debugState.mindarLoaded ? 'text-green-400' : debugState.mindarLoading ? 'text-yellow-400' : 'text-red-400'}>
                {debugState.mindarLoaded ? '✅ Loaded' : debugState.mindarLoading ? '⏳ Loading...' : '❌ Not loaded'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Camera:</span>
              <span className={debugState.cameraReady ? 'text-green-400' : 'text-yellow-400'}>
                {debugState.cameraReady ? '✅ Ready' : '⏳ Initializing...'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Progress:</span>
              <span>{Math.round(debugState.loadingProgress)}%</span>
            </div>
            
            <div className="flex justify-between">
              <span>FPS:</span>
              <span className={debugState.fps >= 30 ? 'text-green-400' : 'text-yellow-400'}>
                {debugState.fps}
              </span>
            </div>
            
            <div className="border-t border-green-600 pt-2 mt-2">
              <div className="text-green-300 mb-1">Targets Found:</div>
              <div className="flex gap-2 flex-wrap">
                {debugState.targetsFound.length === 0 ? (
                  <span className="text-yellow-400">None</span>
                ) : (
                  debugState.targetsFound.map(i => (
                    <span key={i} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs">
                      Target {i}
                    </span>
                  ))
                )}
              </div>
            </div>
            
            <div className="border-t border-green-600 pt-2 mt-2">
              <div className="text-green-300 mb-1">Last Event:</div>
              <div className="text-green-400 break-all">{debugState.lastEvent}</div>
            </div>
            
            {debugState.mindarError && (
              <div className="border-t border-red-600 pt-2 mt-2">
                <div className="text-red-400 mb-1">Error:</div>
                <div className="text-red-300">{debugState.mindarError}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppRunner;
