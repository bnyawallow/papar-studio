import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProjectById } from '../services/projectService';
import { Project } from '../../types';
import ScenePanel from '../../components/editor/ScenePanel';

const Viewer: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await getProjectById(id);
        if (data) {
          setProject(data);
        } else {
          setError("Project not found.");
        }
      } catch (err) {
        setError("Failed to load project.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse">Loading Experience...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <h1 className="text-2xl font-bold mb-2 text-red-500">Error</h1>
            <p>{error || "Project could not be loaded."}</p>
        </div>
      </div>
    );
  }

  if (!project.targets || project.targets.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <h1 className="text-2xl font-bold mb-2 text-yellow-500">No Targets</h1>
            <p>This project has no AR targets defined.</p>
        </div>
      </div>
    );
  }

  const activeTarget = project.targets[0];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
        <ScenePanel 
            target={activeTarget}
            selectedContent={undefined}
            onContentUpdate={() => {}}
            onContentAdd={() => {}}
            onSelect={() => {}}
            isPreviewMode={true}
        />
        
        <div className="absolute top-4 left-4 z-50">
            <div className="bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/10">
                {project.name}
            </div>
        </div>
        
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
             <div className="bg-black/40 backdrop-blur-md text-white/80 px-4 py-1.5 rounded-full text-xs border border-white/10">
                Powered by PapAR Studio
            </div>
        </div>
    </div>
  );
};

export default Viewer;
