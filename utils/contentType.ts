// Helper function to get content type based on file extension
export function getContentType(ext: string | undefined): string {
  if (!ext) return 'application/octet-stream';
  
  const extLower = ext.toLowerCase();
  const contentTypes: Record<string, string> = {
    'mind': 'application/octet-stream',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'glb': 'model/gltf-binary',
    'gltf': 'model/gltf+json',
    'js': 'application/javascript',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css'
  };
  
  return contentTypes[extLower] || 'application/octet-stream';
}
