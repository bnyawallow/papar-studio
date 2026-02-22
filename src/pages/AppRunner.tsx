import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProjectById } from '../services/projectService';
import { Project } from '../types';
import { generateAFrameHtml } from '../../utils/exportUtils';

const AppRunner: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;

  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchApp = async () => {
      try {
        setLoading(true);
        const project = await getProjectById(id);

        if (!project) {
          setError("Project not found");
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

        setHtml(generatedHtml);
      } catch (err) {
        setError("Failed to load project.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [id]);

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
    <iframe
      srcDoc={html}
      title="AR Experience"
      style={{ width: '100vw', height: '100vh', border: 'none' }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

export default AppRunner;
